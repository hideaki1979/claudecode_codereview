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
import { findOrCreateRepository } from '@/lib/db/repositories'
import { findOrCreatePullRequest } from '@/lib/db/pullRequests'
import { createAnalysis } from '@/lib/db/analyses'
import { createSecurityFindings, listSecurityFindingsByAnalysisId, listSecurityFindingsByAnalysisIds } from '@/lib/db/securityFindings'
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

    // ステップ4: データベースに保存（トランザクションでアトミック性を保証）
    // 全ての書き込み操作を単一トランザクションで実行し、途中でエラーが発生した場合はロールバック
    const savedAnalysis = await db.transaction().execute(async (trx) => {
      // 4.1: Repository を findOrCreate
      const repository = await findOrCreateRepository({
        owner,
        name: repo,
      }, trx)

      // 4.2: Pull Request を findOrCreate
      const pullRequest = await findOrCreatePullRequest({
        repository_id: repository.id,
        number: pull_number,
        title: prResult.data.title,
        state: prResult.data.state === 'open' ? 'open' : prResult.data.merged ? 'merged' : 'closed',
        created_at: new Date(prResult.data.created_at),
        updated_at: new Date(prResult.data.updated_at),
      }, trx)

      // 4.3: Analysis を作成
      const analysis = await createAnalysis(
        convertToAnalysisRecord(analysisData, pullRequest.id),
        trx
      )

      // 4.4: Security Findings をバッチ作成
      if (analysisData.security.issues.length > 0) {
        await createSecurityFindings(
          convertToSecurityFindingRecords(analysisData.security.issues, analysis.id),
          trx
        )
      }

      return analysis
    })

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
            impact: analysisData.impact,
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
        // 本番環境ではdetailsを省略、開発環境のみ詳細を含める
        ...(process.env.NODE_ENV === 'development' && {
          details: error instanceof Error ? error.message : 'Unknown error',
        }),
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

    // ステップ2: 特定のPRの分析結果を取得（JOINで効率化: 4クエリ → 2クエリ）
    if (owner && repo && pull_number) {
      // 2.1: Repository + PullRequest + Analysis を単一クエリで取得
      // LEFT JOINを使用して、どのエンティティが存在しないかを判別可能にする
      const prNumber = parseInt(pull_number)
      const result = await db
        .selectFrom('repositories as r')
        .leftJoin('pull_requests as pr', (join) =>
          join
            .onRef('pr.repository_id', '=', 'r.id')
            .on('pr.number', '=', prNumber)
        )
        .leftJoin('analyses as a', 'a.pr_id', 'pr.id')
        .select([
          // Repository fields
          'r.id as repo_id',
          'r.owner as repo_owner',
          'r.name as repo_name',
          // PullRequest fields (nullable due to LEFT JOIN)
          'pr.id as pr_id',
          'pr.number as pr_number',
          'pr.title as pr_title',
          'pr.state as pr_state',
          // Analysis fields (nullable due to LEFT JOIN)
          'a.id as analysis_id',
          'a.risk_score',
          'a.risk_level',
          'a.complexity_score',
          'a.complexity_level',
          'a.security_score',
          'a.lines_changed',
          'a.files_changed',
          'a.analyzed_at',
        ])
        .where('r.owner', '=', owner)
        .where('r.name', '=', repo)
        .orderBy('a.analyzed_at', 'desc')
        .limit(1)
        .executeTakeFirst()

      // 2.2: 存在チェック（どのエンティティが不足かを明確に判別）
      if (!result) {
        return NextResponse.json(
          {
            success: false,
            error: 'Repository not found',
            code: 'NOT_FOUND',
          },
          { status: HTTP_STATUS.NOT_FOUND }
        )
      }

      if (!result.pr_id) {
        return NextResponse.json(
          {
            success: false,
            error: 'Pull request not found',
            code: 'NOT_FOUND',
          },
          { status: HTTP_STATUS.NOT_FOUND }
        )
      }

      if (!result.analysis_id) {
        return NextResponse.json(
          {
            success: false,
            error: 'No analysis found for this pull request',
            code: 'NOT_FOUND',
          },
          { status: HTTP_STATUS.NOT_FOUND }
        )
      }

      // 2.3: セキュリティ検出を取得（2クエリ目）
      const securityFindings = await listSecurityFindingsByAnalysisId(result.analysis_id)

      // 2.4: レスポンスを返却
      return NextResponse.json(
        {
          success: true,
          data: {
            repository: {
              id: result.repo_id,
              owner: result.repo_owner,
              name: result.repo_name,
            },
            pullRequest: {
              id: result.pr_id,
              number: result.pr_number,
              title: result.pr_title,
              state: result.pr_state,
            },
            analysis: {
              id: result.analysis_id,
              risk_score: result.risk_score,
              risk_level: result.risk_level,
              complexity_score: result.complexity_score,
              complexity_level: result.complexity_level,
              security_score: result.security_score,
              lines_changed: result.lines_changed,
              files_changed: result.files_changed,
              analyzed_at: result.analyzed_at,
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

    // 3.2: 全分析のセキュリティ検出を一括取得（N+1クエリ問題を解決）
    const analysisIds = analyses.map((row) => row.analysis_id)
    const findingsMap = await listSecurityFindingsByAnalysisIds(analysisIds)

    // 3.3: レスポンスデータを構築
    const analysesWithFindings = analyses.map((row) => ({
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
      security_findings: findingsMap.get(row.analysis_id) || [],
    }))

    // 3.4: レスポンスを返却
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
        // 本番環境ではdetailsを省略、開発環境のみ詳細を含める
        ...(process.env.NODE_ENV === 'development' && {
          details: error instanceof Error ? error.message : 'Unknown error',
        }),
      },
      { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
    )
  }
}
