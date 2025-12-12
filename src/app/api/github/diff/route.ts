import { NextRequest, NextResponse } from 'next/server';
import { getPullRequestDiff } from '@/lib/github/diff';
import { cache } from '@/lib/cache';
import type { ErrorResponse, ErrorCode, RateLimitInfo, SuccessDiffResponse } from '@/types/api';
import { HTTP_STATUS } from '@/types/api';
import type { GitHubDiff, GetPullRequestDiffParams } from '@/types/github';
import { rateLimitMonitor } from '@/lib/rateLimit';
import { validateGetBody } from '@/lib/validation';

/**
 * 標準化されたエラーレスポンスを作成
 */
function createErrorResponse(
  message: string,
  code: ErrorCode,
  status: number,
  details?: string
): NextResponse<ErrorResponse> {
  const errorResponse: ErrorResponse = {
    success: false,
    error: {
      message,
      code,
      details,
    },
  };

  return NextResponse.json(errorResponse, { status });
}

/**
 * エラーを適切なエラーコードとステータスにマッピング
 */
function mapErrorToResponse(error: Error): {
  code: ErrorCode;
  status: number;
  message: string;
} {
  const errorMessage = error.message.toLowerCase();

  if (errorMessage.includes('rate limit')) {
    return {
      code: 'RATE_LIMIT_EXCEEDED',
      status: HTTP_STATUS.TOO_MANY_REQUESTS,
      message: 'GitHub APIのレート制限に達しました。しばらく待ってから再試行してください。',
    };
  }

  if (errorMessage.includes('unauthorized')) {
    return {
      code: 'UNAUTHORIZED',
      status: HTTP_STATUS.UNAUTHORIZED,
      message: 'GitHubトークンが無効または不足しています。認証情報を確認してください。',
    };
  }

  if (errorMessage.includes('not found')) {
    return {
      code: 'NOT_FOUND',
      status: HTTP_STATUS.NOT_FOUND,
      message: 'リポジトリまたはプルリクエストが見つかりません。',
    };
  }

  if (
    errorMessage.includes('invalid') ||
    errorMessage.includes('required') ||
    errorMessage.includes('must be')
  ) {
    return {
      code: 'VALIDATION_ERROR',
      status: HTTP_STATUS.BAD_REQUEST,
      message: error.message,
    };
  }

  return {
    code: 'INTERNAL_ERROR',
    status: HTTP_STATUS.INTERNAL_SERVER_ERROR,
    message: '予期しないエラーが発生しました。再試行してください。',
  };
}

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
      )
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

    const {owner, repo, pull_number} = parseResult.data;

    const params: GetPullRequestDiffParams = {
      owner,
      repo,
      pull_number,
    };

    // ステップ3: キャッシュチェック
    const cacheKey = cache.getPullRequestKey(owner, repo, pull_number);
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
    cache.set(cacheKey, { data: diff, rateLimit });

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
