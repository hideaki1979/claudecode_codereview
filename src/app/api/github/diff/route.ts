import { NextRequest, NextResponse } from 'next/server';
import { getPullRequestDiff } from '@/lib/github/diff';
import { cache } from '@/lib/cache';
import type { ErrorResponse, ErrorCode } from '@/types/api';
import { HTTP_STATUS } from '@/types/api';
import type { GitHubDiff, GetPullRequestDiffParams } from '@/types/github';

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

  if (errorMessage.includes('unauthorized') || errorMessage.includes('token')) {
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
    if (!body || typeof body !== 'object') {
      return createErrorResponse(
        'リクエストボディが無効です',
        'VALIDATION_ERROR',
        HTTP_STATUS.BAD_REQUEST
      );
    }

    const { owner, repo, pull_number } = body as Record<string, unknown>;

    if (!owner || typeof owner !== 'string') {
      return createErrorResponse(
        'owner は必須の文字列パラメータです',
        'VALIDATION_ERROR',
        HTTP_STATUS.BAD_REQUEST
      );
    }

    if (!repo || typeof repo !== 'string') {
      return createErrorResponse(
        'repo は必須の文字列パラメータです',
        'VALIDATION_ERROR',
        HTTP_STATUS.BAD_REQUEST
      );
    }

    if (!pull_number || typeof pull_number !== 'number' || pull_number < 1) {
      return createErrorResponse(
        'pull_number は必須の正の整数です',
        'VALIDATION_ERROR',
        HTTP_STATUS.BAD_REQUEST
      );
    }

    const params: GetPullRequestDiffParams = {
      owner,
      repo,
      pull_number,
    };

    // ステップ3: キャッシュチェック
    const cacheKey = `diff:${owner}/${repo}/${pull_number}`;
    const cachedData = cache.get<GitHubDiff>(cacheKey);

    if (cachedData) {
      return NextResponse.json(
        {
          success: true,
          data: cachedData,
        },
        {
          status: HTTP_STATUS.OK,
          headers: {
            'X-Cache': 'HIT',
            'Cache-Control': 'private, max-age=900', // 15分
          },
        }
      );
    }

    // ステップ4: GitHub APIからデータ取得
    const diff = await getPullRequestDiff(params);

    // ステップ5: 結果をキャッシュ
    cache.set(cacheKey, diff);

    // ステップ6: 成功レスポンスを返す
    return NextResponse.json(
      {
        success: true,
        data: diff,
      },
      {
        status: HTTP_STATUS.OK,
        headers: {
          'X-Cache': 'MISS',
          'Cache-Control': 'private, max-age=900', // 15分
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
