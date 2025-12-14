import { NextRequest, NextResponse } from 'next/server';
import { getPullRequestDiff } from '@/lib/github/diff';
import { cache } from '@/lib/cache';
import type { RateLimitInfo, SuccessDiffResponse } from '@/types/api';
import { HTTP_STATUS } from '@/types/api';
import type { GitHubDiff, GetPullRequestDiffParams } from '@/types/github';
import { rateLimitMonitor } from '@/lib/rateLimit';
import { validateGetBody } from '@/lib/validation';
import { createErrorResponse, mapErrorToResponse } from '@/lib/github/utils';

/**
 * POST /api/github/diff - プルリクエストの差分取得
 *
 * リクエストボディ:
 * - owner: リポジトリオーナー（必須）
 * - repo: リポジトリ名（必須）
 * - pull_number: プルリクエスト番号（必須）
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // 認証チェック
    const token = process.env.GITHUB_TOKEN;
    if (!token) {
      return createErrorResponse(
        'GitHubトークンが設定されていません',
        'UNAUTHORIZED',
        HTTP_STATUS.UNAUTHORIZED
      );
    }

    // ステップ1: リクエストボディの解析
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return createErrorResponse(
        'リクエストボディのJSONが無効です',
        'VALIDATION_ERROR',
        HTTP_STATUS.BAD_REQUEST
      );
    }

    // ステップ2: バリデーション
    const parseResult = validateGetBody(body);
    if (!parseResult.success) {
      const firstError = parseResult.error.issues[0];
      const errorMessage = firstError.message || 'リクエストパラメータが無効です';
      return createErrorResponse(
        errorMessage,
        'VALIDATION_ERROR',
        HTTP_STATUS.BAD_REQUEST
      );
    }

    const { owner, repo, pull_number } = parseResult.data;

    const params: GetPullRequestDiffParams = {
      owner,
      repo,
      pull_number,
    };

    // ステップ3: キャッシュチェック
    const cacheKey = cache.getPullRequestDiffKey(owner, repo, pull_number);
    const cachedData = cache.get<{
      data: GitHubDiff;
      rateLimit: RateLimitInfo;
    }>(cacheKey);

    if (cachedData) {
      return NextResponse.json(
        {
          success: true,
          data: cachedData.data,
          rateLimit: cachedData.rateLimit,
          cacheHit: true,
        } satisfies SuccessDiffResponse,
        {
          status: HTTP_STATUS.OK,
          headers: {
            'X-Cache': 'HIT',
            'Cache-Control': `private, max-age=${rateLimitMonitor.getOptimalCacheTTL()}`,
          },
        }
      );
    }

    // ステップ4: GitHub APIからデータ取得
    const { data: diff, rateLimit } = await getPullRequestDiff(params);

    const cacheTtlSeconds = rateLimitMonitor.getOptimalCacheTTL();

    // ステップ5: 結果をキャッシュ
    cache.set(cacheKey, { data: diff, rateLimit }, cacheTtlSeconds);

    // ステップ6: 成功レスポンスを返す
    return NextResponse.json(
      {
        success: true,
        data: diff,
        rateLimit,
        cacheHit: false,
      },
      {
        status: HTTP_STATUS.OK,
        headers: {
          'X-Cache': 'MISS',
          'Cache-Control': `private, max-age=${cacheTtlSeconds}`,
        },
      }
    );
  } catch (error) {
    const { code, status, message } = mapErrorToResponse(
      error instanceof Error ? error : new Error('Unknown error')
    );

    return createErrorResponse(
      message,
      code,
      status,
      error instanceof Error ? error.message : undefined
    );
  }
}
