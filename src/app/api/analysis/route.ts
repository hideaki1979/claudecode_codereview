/**
 * Analysis API Route Handler
 *
 * Pull Request分析の実行と結果の永続化を担当するAPIエンドポイント。
 *
 * Endpoints:
 * - POST /api/analysis: PR分析を実行し、結果をデータベースに保存
 * - GET /api/analysis: データベースから分析結果を取得
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getPullRequest } from '@/lib/github/pullRequests'
import { getPullRequestDiffAPI } from '@/lib/api-client'
import { analyzePullRequest } from '@/lib/analysis'
import { db } from '@/lib/db/kysely'
import { findOrCreateRepository, findRepositoryByOwnerAndName } from '@/lib/db/repositories'
import { findOrCreatePullRequest, findPullRequestByNumber } from '@/lib/db/pullRequests'
import { createAnalysis, findLatestAnalysisByPrId } from '@/lib/db/analyses'
import { createSecurityFindings, listSecurityFindingsByAnalysisId } from '@/lib/db/securityFindings'
import type { AnalysisData } from '@/types/analysis'
import type { Database } from '@/lib/db/types'
import { HTTP_STATUS } from '@/types/api'

/**
 * POST リクエストボディのバリデーションスキーマ
 */
const analyzeRequestSchema = z.object({
  owner: z.string().min(1, 'Repository owner is required'),
  repo: z.string().min(1, 'Repository name is required'),
  pull_number: z.number().int().positive('Pull request number must be a positive integer'),
})

/**
 * GET クエリパラメータのバリデーションスキーマ
 */
const getAnalysisQuerySchema = z.object({
  owner: z.string().optional(),
  repo: z.string().optional(),
  pull_number: z.string().regex(/^\d+$/, 'Pull request number must be a number').optional(),
})

/**
 * AnalysisData を Database['analyses'] 形式に変換
 *
 * @param analysisData - 分析結果データ
 * @param prId - Pull Request UUID
 * @returns データベース用の分析レコード
 */
function convertToAnalysisRecord(
  analysisData: AnalysisData,
  prId: string
): Omit<Database['analyses'], 'id'> {
  return {
    pr_id: prId,
    risk_score: analysisData.risk.risk_score,
    risk_level: analysisData.risk.risk_level,
    complexity_score: analysisData.complexity.complexity_score,
    complexity_level: analysisData.complexity.complexity_level,
    lines_changed: analysisData.complexity.lines_changed,
    files_changed: analysisData.complexity.files_changed,
    security_score: analysisData.security.security_score,
    analyzed_at: new Date(analysisData.analyzed_at),
  }
}

/**
 * SecurityIssue を Database['security_findings'] 形式に変換
 *
 * @param issues - セキュリティ検出結果
 * @param analysisId - Analysis UUID
 * @returns データベース用のセキュリティ検出レコード配列
 */
function convertToSecurityFindingRecords(
  issues: AnalysisData['security']['issues'],
  analysisId: string
): Omit<Database['security_findings'], 'id'>[] {
  return issues.map((issue) => ({
    analysis_id: analysisId,
    type: issue.type || 'unknown',
    severity: issue.severity,
    message: issue.message,
    file: issue.file || 'unknown',
    line: issue.line ?? null,
    snippet: issue.snippet ?? null,
  }))
}

/**
 * POST /api/analysis - PR分析を実行してデータベースに保存
 *
 * @param request - NextRequest
 * @returns 分析結果のレスポンス
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // ステップ1: リクエストボディの解析とバリデーション
    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid JSON in request body',
          code: 'VALIDATION_ERROR',
        },
        { status: HTTP_STATUS.BAD_REQUEST }
      )
    }

    const validation = analyzeRequestSchema.safeParse(body)

    if (!validation.success) {
      const firstError = validation.error.issues[0]
      return NextResponse.json(
        {
          success: false,
          error: firstError.message,
          code: 'VALIDATION_ERROR',
          details: validation.error.message,
        },
        { status: HTTP_STATUS.BAD_REQUEST }
      )
    }

    const { owner, repo, pull_number } = validation.data

    // ステップ2: GitHub APIからPR情報とDiffを取得
    // 注: これらの関数はエラー時に例外を投げるため、成功時のみレスポンスを返す
    const [prResult, diffResult] = await Promise.all([
      getPullRequest({ owner, repo, pull_number }),
      getPullRequestDiffAPI({ owner, repo, pull_number }),
    ])

    // ステップ3: PR分析を実行
    const analysisResult = analyzePullRequest(diffResult.data)

    if (analysisResult.status === 'error') {
      return NextResponse.json(
        {
          success: false,
          error: analysisResult.error,
          code: analysisResult.code,
        },
        { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
      )
    }

    const analysisData = analysisResult.data

    // ステップ4: データベースに保存（トランザクション不要 - 外部キー制約で整合性保証）
    // 4.1: Repository を findOrCreate
    const repository = await findOrCreateRepository({
      owner,
      name: repo,
    })

    // 4.2: Pull Request を findOrCreate
    const pullRequest = await findOrCreatePullRequest({
      repository_id: repository.id,
      number: pull_number,
      title: prResult.data.title,
      state: prResult.data.state === 'open' ? 'open' : prResult.data.merged ? 'merged' : 'closed',
      created_at: new Date(prResult.data.created_at),
      updated_at: new Date(prResult.data.updated_at),
    })

    // 4.3: Analysis を作成
    const savedAnalysis = await createAnalysis(
      convertToAnalysisRecord(analysisData, pullRequest.id)
    )

    // 4.4: Security Findings をバッチ作成
    if (analysisData.security.issues.length > 0) {
      await createSecurityFindings(
        convertToSecurityFindingRecords(analysisData.security.issues, savedAnalysis.id)
      )
    }

    // ステップ5: 成功レスポンスを返却
    return NextResponse.json(
      {
        success: true,
        data: {
          analysis: savedAnalysis,
          analyzed_at: analysisData.analyzed_at,
          metrics: {
            risk: analysisData.risk,
            complexity: analysisData.complexity,
            security: analysisData.security,
          },
        },
      },
      { status: HTTP_STATUS.OK }
    )
  } catch (error) {
    console.error('Analysis API error:', error)

    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_SERVER_ERROR',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
    )
  }
}

/**
 * GET /api/analysis - データベースから分析結果を取得
 *
 * クエリパラメータ:
 * - owner: Repository owner (optional)
 * - repo: Repository name (optional)
 * - pull_number: Pull request number (optional)
 *
 * @param request - NextRequest
 * @returns 分析結果のレスポンス
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // ステップ1: クエリパラメータの解析とバリデーション
    const { searchParams } = new URL(request.url)
    const queryParams = {
      owner: searchParams.get('owner') ?? undefined,
      repo: searchParams.get('repo') ?? undefined,
      pull_number: searchParams.get('pull_number') ?? undefined,
    }

    const validation = getAnalysisQuerySchema.safeParse(queryParams)

    if (!validation.success) {
      const firstError = validation.error.issues[0]
      return NextResponse.json(
        {
          success: false,
          error: firstError.message,
          code: 'VALIDATION_ERROR',
          details: validation.error.message,
        },
        { status: HTTP_STATUS.BAD_REQUEST }
      )
    }

    const { owner, repo, pull_number } = validation.data

    // ステップ2: 特定のPRの分析結果を取得
    if (owner && repo && pull_number) {
      // 2.1: Repository を検索
      const repository = await findRepositoryByOwnerAndName(owner, repo)

      if (!repository) {
        return NextResponse.json(
          {
            success: false,
            error: 'Repository not found',
            code: 'NOT_FOUND',
          },
          { status: HTTP_STATUS.NOT_FOUND }
        )
      }

      // 2.2: Pull Request を検索
      const pullRequest = await findPullRequestByNumber(repository.id, parseInt(pull_number))

      if (!pullRequest) {
        return NextResponse.json(
          {
            success: false,
            error: 'Pull request not found',
            code: 'NOT_FOUND',
          },
          { status: HTTP_STATUS.NOT_FOUND }
        )
      }

      // 2.3: 最新の分析結果を取得
      const analysis = await findLatestAnalysisByPrId(pullRequest.id)

      if (!analysis) {
        return NextResponse.json(
          {
            success: false,
            error: 'No analysis found for this pull request',
            code: 'NOT_FOUND',
          },
          { status: HTTP_STATUS.NOT_FOUND }
        )
      }

      // 2.4: セキュリティ検出を取得
      const securityFindings = await listSecurityFindingsByAnalysisId(analysis.id)

      // 2.5: レスポンスを返却
      return NextResponse.json(
        {
          success: true,
          data: {
            repository: {
              id: repository.id,
              owner: repository.owner,
              name: repository.name,
            },
            pullRequest: {
              id: pullRequest.id,
              number: pullRequest.number,
              title: pullRequest.title,
              state: pullRequest.state,
            },
            analysis: {
              id: analysis.id,
              risk_score: analysis.risk_score,
              risk_level: analysis.risk_level,
              complexity_score: analysis.complexity_score,
              complexity_level: analysis.complexity_level,
              security_score: analysis.security_score,
              lines_changed: analysis.lines_changed,
              files_changed: analysis.files_changed,
              analyzed_at: analysis.analyzed_at,
            },
            security_findings: securityFindings,
          },
        },
        { status: HTTP_STATUS.OK }
      )
    }

    // ステップ3: 全ての分析結果を取得（デフォルト）
    const limit = parseInt(searchParams.get('limit') || '10')
    const offset = parseInt(searchParams.get('offset') || '0')

    // 3.1: 分析結果とリレーション情報をJOINで取得
    const analyses = await db
      .selectFrom('analyses')
      .innerJoin('pull_requests', 'pull_requests.id', 'analyses.pr_id')
      .innerJoin('repositories', 'repositories.id', 'pull_requests.repository_id')
      .select([
        'analyses.id as analysis_id',
        'analyses.risk_score',
        'analyses.risk_level',
        'analyses.complexity_score',
        'analyses.complexity_level',
        'analyses.security_score',
        'analyses.lines_changed',
        'analyses.files_changed',
        'analyses.analyzed_at',
        'pull_requests.id as pr_id',
        'pull_requests.number as pr_number',
        'pull_requests.title as pr_title',
        'pull_requests.state as pr_state',
        'repositories.id as repo_id',
        'repositories.owner as repo_owner',
        'repositories.name as repo_name',
      ])
      .orderBy('analyses.analyzed_at', 'desc')
      .limit(limit)
      .offset(offset)
      .execute()

    // 3.2: 各分析のセキュリティ検出を取得
    const analysesWithFindings = await Promise.all(
      analyses.map(async (row) => {
        const securityFindings = await listSecurityFindingsByAnalysisId(row.analysis_id)

        return {
          repository: {
            id: row.repo_id,
            owner: row.repo_owner,
            name: row.repo_name,
          },
          pullRequest: {
            id: row.pr_id,
            number: row.pr_number,
            title: row.pr_title,
            state: row.pr_state,
          },
          analysis: {
            id: row.analysis_id,
            risk_score: row.risk_score,
            risk_level: row.risk_level,
            complexity_score: row.complexity_score,
            complexity_level: row.complexity_level,
            security_score: row.security_score,
            lines_changed: row.lines_changed,
            files_changed: row.files_changed,
            analyzed_at: row.analyzed_at,
          },
          security_findings: securityFindings,
        }
      })
    )

    // 3.3: レスポンスを返却
    return NextResponse.json(
      {
        success: true,
        data: {
          analyses: analysesWithFindings,
          pagination: {
            limit,
            offset,
            count: analysesWithFindings.length,
          },
        },
      },
      { status: HTTP_STATUS.OK }
    )
  } catch (error) {
    console.error('Analysis API error:', error)

    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_SERVER_ERROR',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
    )
  }
}
