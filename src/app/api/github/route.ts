import { NextRequest, NextResponse } from 'next/server';
import { listPullRequests, getPullRequest } from '@/lib/github/pullRequests';
import { cache } from '@/lib/cache';
import { validateListQuery, validateGetBody, parseSearchParams } from '@/lib/validation';
import type {
  ApiListResponse,
  ApiPullRequestResponse,
  ErrorResponse,
  RateLimitInfo,
  ErrorCode,
  SuccessListResponse,
  SuccessPullRequestResponse,
} from '@/types/api';
import { HTTP_STATUS } from '@/types/api';
import type {
  GitHubPullRequestSimple,
  GitHubPullRequest,
  PaginationInfo,
} from '@/types/github';

/**
 * レスポンスヘッダーからレート制限情報を抽出
 *
 * 注: 現在の実装では使用していませんが、将来的にGitHub APIのレスポンスから
 * レート制限情報を取得する際に使用できます
 */
// function extractRateLimit(headers: Headers): RateLimitInfo {
//   return {
//     limit: parseInt(headers.get('x-ratelimit-limit') || '5000', 10),
//     remaining: parseInt(headers.get('x-ratelimit-remaining') || '5000', 10),
//     reset: parseInt(headers.get('x-ratelimit-reset') || '0', 10),
//     used: parseInt(headers.get('x-ratelimit-used') || '0', 10),
//   };
// }

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

  // レート制限エラー
  if (errorMessage.includes('rate limit')) {
    return {
      code: 'RATE_LIMIT_EXCEEDED',
      status: HTTP_STATUS.TOO_MANY_REQUESTS,
      message: 'GitHub APIのレート制限に達しました。しばらく待ってから再試行してください。',
    };
  }

  // 認証エラー
  if (errorMessage.includes('unauthorized')) {
    return {
      code: 'UNAUTHORIZED',
      status: HTTP_STATUS.UNAUTHORIZED,
      message: 'GitHubトークンが無効または不足しています。認証情報を確認してください。',
    };
  }

  if (errorMessage.includes('token')) {
    return {
      code: 'INVALID_TOKEN',
      status: HTTP_STATUS.UNAUTHORIZED,
      message: 'GitHubトークンの形式または権限が無効です。',
    };
  }

  // 権限エラー
  if (errorMessage.includes('forbidden') || errorMessage.includes('insufficient permissions')) {
    return {
      code: 'FORBIDDEN',
      status: HTTP_STATUS.FORBIDDEN,
      message: '権限が不足しています。トークンのスコープを確認してください。',
    };
  }

  // Not foundエラー
  if (errorMessage.includes('not found')) {
    return {
      code: 'NOT_FOUND',
      status: HTTP_STATUS.NOT_FOUND,
      message: 'リポジトリまたはプルリクエストが見つかりません。',
    };
  }

  // バリデーションエラー
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

  // デフォルトは内部エラー
  return {
    code: 'INTERNAL_ERROR',
    status: HTTP_STATUS.INTERNAL_SERVER_ERROR,
    message: '予期しないエラーが発生しました。再試行してください。',
  };
}

/**
 * GET /api/github - プルリクエスト一覧取得
 *
 * クエリパラメータ:
 * - owner: リポジトリオーナー（必須）
 * - repo: リポジトリ名（必須）
 * - state: PR状態（open, closed, all） - デフォルト: open
 * - sort: ソート順（created, updated, popularity, long-running） - デフォルト: created
 * - direction: ソート方向（asc, desc） - デフォルト: desc
 * - per_page: ページあたりの件数（1-100） - デフォルト: 30
 * - page: ページ番号（>= 1） - デフォルト: 1
 */
export async function GET(request: NextRequest): Promise<NextResponse<ApiListResponse>> {
  try {
    // ステップ1: クエリパラメータの解析とバリデーション
    const { searchParams } = new URL(request.url);
    const queryParams = parseSearchParams(searchParams);

    const validation = validateListQuery(queryParams);

    if (!validation.success) {
      const firstError = validation.error.issues[0];
      return createErrorResponse(
        firstError.message,
        'VALIDATION_ERROR',
        HTTP_STATUS.BAD_REQUEST,
        validation.error.message
      );
    }

    const params = validation.data;

    // ステップ2: キャッシュチェック
    const cacheKey = cache.getListKey(params);
    const cachedData = cache.get<{
      data: GitHubPullRequestSimple[];
      pagination: PaginationInfo;
    }>(cacheKey);

    if (cachedData) {
      const response: SuccessListResponse = {
        success: true,
        data: cachedData.data,
        pagination: cachedData.pagination,
        rateLimit: {
          limit: 5000,
          remaining: 5000,
          reset: 0,
          used: 0,
        },
      };

      // キャッシュヘッダーを追加
      const nextResponse = NextResponse.json(response, {
        status: HTTP_STATUS.OK,
        headers: {
          'X-Cache': 'HIT',
          'Cache-Control': 'private, max-age=900', // 15分
        },
      });

      return nextResponse;
    }

    // ステップ3: GitHub APIからデータ取得
    const result = await listPullRequests(params);

    // ステップ4: 結果をキャッシュ
    cache.set(cacheKey, result);

    // ステップ5: 成功レスポンスを作成
    const response: SuccessListResponse = {
      success: true,
      data: result.data,
      pagination: result.pagination,
      rateLimit: {
        limit: 5000,
        remaining: 5000,
        reset: 0,
        used: 0,
      },
    };

    // キャッシュヘッダーと共にレスポンスを返す
    return NextResponse.json(response, {
      status: HTTP_STATUS.OK,
      headers: {
        'X-Cache': 'MISS',
        'Cache-Control': 'private, max-age=900', // 15分
      },
    });
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

/**
 * POST /api/github - 特定のプルリクエスト詳細取得
 *
 * リクエストボディ:
 * - owner: リポジトリオーナー（必須）
 * - repo: リポジトリ名（必須）
 * - pull_number: プルリクエスト番号（必須、正の整数）
 */
export async function POST(request: NextRequest): Promise<NextResponse<ApiPullRequestResponse>> {
  try {
    // ステップ1: リクエストボディの解析とバリデーション
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

    const validation = validateGetBody(body);

    if (!validation.success) {
      const firstError = validation.error.issues[0];
      return createErrorResponse(
        firstError.message,
        'VALIDATION_ERROR',
        HTTP_STATUS.BAD_REQUEST,
        validation.error.message
      );
    }

    const { owner, repo, pull_number } = validation.data;

    // ステップ2: キャッシュチェック
    const cacheKey = cache.getPullRequestKey(owner, repo, pull_number);
    const cachedData = cache.get<GitHubPullRequest>(cacheKey);

    if (cachedData) {
      const response: SuccessPullRequestResponse = {
        success: true,
        data: cachedData,
        rateLimit: {
          limit: 5000,
          remaining: 5000,
          reset: 0,
          used: 0,
        },
      };

      return NextResponse.json(response, {
        status: HTTP_STATUS.OK,
        headers: {
          'X-Cache': 'HIT',
          'Cache-Control': 'private, max-age=900', // 15分
        },
      });
    }

    // ステップ3: GitHub APIからデータ取得
    const pullRequest = await getPullRequest({ owner, repo, pull_number });

    // ステップ4: 結果をキャッシュ
    cache.set(cacheKey, pullRequest);

    // ステップ5: 成功レスポンスを作成
    const response: SuccessPullRequestResponse = {
      success: true,
      data: pullRequest,
      rateLimit: {
        limit: 5000,
        remaining: 5000,
        reset: 0,
        used: 0,
      },
    };

    return NextResponse.json(response, {
      status: HTTP_STATUS.OK,
      headers: {
        'X-Cache': 'MISS',
        'Cache-Control': 'private, max-age=900', // 15 minutes
      },
    });
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
