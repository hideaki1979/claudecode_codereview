import type { GitHubAPIError } from '@/types/github';
import { HTTP_STATUS, type ErrorCode, type ErrorResponse, type RateLimitInfo } from '@/types/api';
import { NextResponse } from 'next/server';
import {
  ForbiddenError,
  NotFoundError,
  RateLimitError,
  UnauthorizedError,
  ValidationError,
  GitHubAPIError as CustomGitHubAPIError,
  InternalError,
} from './error';

/**
 * Octokitのエラーオブジェクトの型定義
 * @octokit/request-error のエラーオブジェクトには response.headers が含まれる
 */
interface OctokitErrorWithResponse extends Error {
  response?: {
    headers?: {
      [key: string]: string | number | undefined;
    };
  };
}

/**
 * GitHub APIエラーを適切なカスタムエラークラスに変換
 *
 * @param error - GitHub APIからのエラー
 * @param defaultMessage - デフォルトのエラーメッセージ
 * @throws 適切なカスタムエラークラス
 */
export function handleGitHubError(error: unknown, defaultMessage: string): never {
  if (error instanceof Error) {
    // ステータスコードを含むGitHub APIエラーかチェック
    const githubError = error as GitHubAPIError & Error;

    if (githubError.status === 404) {
      throw new NotFoundError(`${defaultMessage}: Resource not found`);
    }

    if (githubError.status === 401) {
      throw new UnauthorizedError(
        `${defaultMessage}: Unauthorized. Check your GitHub token or ensure it has the required scopes.`
      );
    }

    if (githubError.status === 403) {
      // より堅牢な方法: レスポンスヘッダーからレート制限を検出
      // @octokit/request-error のエラーオブジェクトには response.headers が含まれる
      const octokitError = githubError as GitHubAPIError & Error & OctokitErrorWithResponse;
      const rateLimitRemaing = octokitError.response?.headers?.['x-ratelimit-remaining'];
      const isRateLimit =
        rateLimitRemaing === '0' ||
        rateLimitRemaing === 0 ||
        githubError.message?.includes('rate limit'); // フォールバック: ヘッダーが利用できない場合

      if (isRateLimit) {
        throw new RateLimitError(`${defaultMessage}: GitHub API rate limit exceeded. Please try again later.`);
      }
      throw new ForbiddenError(`${defaultMessage}: Forbidden. Insufficient permissions or token scopes.`);
    }

    if (githubError.status === 422) {
      throw new ValidationError(`${defaultMessage}: Invalid parameters provided. ${githubError.message || ''}`);
    }

    if (githubError.status === 500) {
      throw new CustomGitHubAPIError(`${defaultMessage}: GitHub server error. Please try again later.`, 500);
    }

    if (githubError.status === 503) {
      throw new CustomGitHubAPIError(`${defaultMessage}: GitHub service unavailable. Please try again later.`, 503);
    }

    // 利用可能な場合は元のエラーメッセージを含む内部エラーをスロー
    console.error(`${defaultMessage}:`, error); // サーバーサイドで詳細なエラーをログに記録
    throw new InternalError(defaultMessage);
  }

  throw new InternalError(defaultMessage);
}

/**
 * リポジトリのオーナー名とリポジトリ名を検証
 *
 * @param owner - リポジトリのオーナー
 * @param repo - リポジトリ名
 * @throws 検証が失敗した場合にエラーをスロー
 */

// リポジトリのオーナー名とリポジトリ名が正しい形式かチェックします。
export function validateRepository(owner: string, repo: string): void {
  if (!owner || typeof owner !== 'string' || owner.trim() === '') {
    throw new ValidationError('Repository owner is required and must be a non-empty string');
  }

  if (!repo || typeof repo !== 'string' || repo.trim() === '') {
    throw new ValidationError('Repository name is required and must be a non-empty string');
  }

  // 無効な文字をチェック
  const validPattern = /^[a-zA-Z0-9._-]+$/;
  if (!validPattern.test(owner)) {
    throw new ValidationError('Repository owner contains invalid characters');
  }

  if (!validPattern.test(repo)) {
    throw new ValidationError('Repository name contains invalid characters');
  }
}

/**
 * プルリクエスト番号を検証
 *
 * @param pull_number - プルリクエスト番号
 * @throws 検証が失敗した場合にエラーをスロー
 */

// プルリクエスト番号が正しい形式かチェックします。
export function validatePullNumber(pull_number: number): void {
  if (!pull_number || typeof pull_number !== 'number') {
    throw new ValidationError('Pull request number is required and must be a number');
  }

  if (pull_number < 1 || !Number.isInteger(pull_number)) {
    throw new ValidationError('Pull request number must be a positive integer');
  }
}

/**
 * ページネーションパラメータを検証
 *
 * @param per_page - 1ページあたりのアイテム数
 * @param page - ページ番号
 * @throws 検証が失敗した場合にエラーをスロー
 */

// ページネーションのパラメータが正しい範囲内かチェックします。
export function validatePagination(per_page?: number, page?: number): void {
  if (per_page !== undefined) {
    if (typeof per_page !== 'number' || !Number.isInteger(per_page)) {
      throw new ValidationError('per_page must be an integer');
    }

    if (per_page < 1 || per_page > 100) {
      throw new ValidationError('per_page must be between 1 and 100');
    }
  }

  if (page !== undefined) {
    if (typeof page !== 'number' || !Number.isInteger(page)) {
      throw new ValidationError('page must be an integer');
    }

    if (page < 1) {
      throw new ValidationError('page must be greater than 0');
    }
  }
}

/**
 * GitHubトークンを検証
 *
 * @param token - GitHubパーソナルアクセストークン
 * @throws 検証が失敗した場合にエラーをスロー
 */

// GitHubトークンが正しい形式かチェックします。
export function validateToken(token: string | undefined): void {
  if (!token || typeof token !== 'string' || token.trim() === '') {
    throw new ValidationError(
      'GitHub token is required. Provide it as an argument or set GITHUB_TOKEN environment variable.'
    );
  }

  // 基本的なトークン形式の検証
  // GitHubトークンは通常 'ghp_', 'gho_', 'ghu_', または 'ghs_' で始まる
  const isValidFormat =
    token.startsWith('ghp_') ||
    token.startsWith('gho_') ||
    token.startsWith('ghu_') ||
    token.startsWith('ghs_') ||
    token.startsWith('github_pat_'); // Fine-grained PAT

  if (!isValidFormat && process.env.NODE_ENV === 'development') {
    console.warn(
      'Warning: GitHub token format appears invalid. Expected format: ghp_*, gho_*, ghu_*, ghs_*, or github_pat_*'
    );
  }
}

/**
 * ページネーション用のLinkヘッダーを解析
 *
 * @param linkHeader - GitHub APIレスポンスのLinkヘッダー
 * @returns 次のページ、前のページ、最初のページ、最後のページのURLを含むオブジェクト
 */

// GitHub APIのレスポンスヘッダーから、次のページ・前のページのURLを抽出します。
export function parseLinkHeader(linkHeader: string | undefined): {
  next?: string;
  prev?: string;
  first?: string;
  last?: string;
} {
  if (!linkHeader) {
    return {};
  }

  const links: Record<string, string> = {};
  const parts = linkHeader.split(',');

  for (const part of parts) {
    const match = part.match(/<([^>]+)>;\s*rel="([^"]+)"/);
    if (match) {
      const [, url, rel] = match;
      links[rel] = url;
    }
  }

  return links;
}

/**
 * URLからページ番号を抽出
 *
 * @param url - ページパラメータを含むGitHub API URL
 * @returns ページ番号またはundefined
 */

// URLからページ番号を抽出します。
export function extractPageNumber(url: string | undefined): number | undefined {
  if (!url) {
    return undefined;
  }

  const match = url.match(/[?&]page=(\d+)/);
  if (match) {
    return parseInt(match[1], 10);
  }

  return undefined;
}

/**
 * GitHub APIレスポンスヘッダーからレート制限情報を抽出
 *
 * @param headers - GitHub APIレスポンスのヘッダーオブジェクト
 * @returns レート制限情報
 */
export function extractRateLimit(headers: {
  [key: string]: string | number | undefined;
}): RateLimitInfo {
  // Octokitのレスポンスヘッダーからレート制限情報を取得
  const limit = typeof headers['x-ratelimit-limit'] === 'string'
    ? parseInt(headers['x-ratelimit-limit'], 10)
    : typeof headers['x-ratelimit-limit'] === 'number'
      ? headers['x-ratelimit-limit']
      : 5000;

  const remaining = typeof headers['x-ratelimit-remaining'] === 'string'
    ? parseInt(headers['x-ratelimit-remaining'], 10)
    : typeof headers['x-ratelimit-remaining'] === 'number'
      ? headers['x-ratelimit-remaining']
      : 5000;

  const reset = typeof headers['x-ratelimit-reset'] === 'string'
    ? parseInt(headers['x-ratelimit-reset'], 10)
    : typeof headers['x-ratelimit-reset'] === 'number'
      ? headers['x-ratelimit-reset']
      : 0;

  const used = typeof headers['x-ratelimit-used'] === 'string'
    ? parseInt(headers['x-ratelimit-used'], 10)
    : typeof headers['x-ratelimit-used'] === 'number'
      ? headers['x-ratelimit-used']
      : 0;

  return {
    limit,
    remaining,
    reset,
    used,
  };
}

/**
 * 標準化されたエラーレスポンスを作成
 */
export function createErrorResponse(
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
 * カスタムエラークラスのinstanceofチェックを使用して、文字列マッチングの脆弱性を回避
 */
export function mapErrorToResponse(error: Error): {
  code: ErrorCode;
  status: number;
  message: string;
} {
  // カスタムエラークラスの場合は、そのプロパティを直接使用
  if (error instanceof NotFoundError) {
    return {
      code: error.code,
      status: error.status,
      message: error.message,
    };
  }

  if (error instanceof UnauthorizedError) {
    return {
      code: error.code,
      status: error.status,
      message: error.message,
    };
  }

  if (error instanceof ForbiddenError) {
    return {
      code: error.code,
      status: error.status,
      message: error.message,
    };
  }

  if (error instanceof RateLimitError) {
    return {
      code: error.code,
      status: error.status,
      message: error.message,
    };
  }

  if (error instanceof ValidationError) {
    return {
      code: error.code,
      status: error.status,
      message: error.message,
    };
  }

  if (error instanceof CustomGitHubAPIError) {
    return {
      code: error.code,
      status: error.status,
      message: error.message,
    };
  }

  if (error instanceof InternalError) {
    return {
      code: error.code,
      status: error.status,
      message: error.message,
    };
  }

  // GitHubErrorの基底クラスの場合（将来の拡張用）
  if (error instanceof Error && 'code' in error && 'status' in error) {
    const githubError = error as { code: ErrorCode; status: number; message: string };
    return {
      code: githubError.code,
      status: githubError.status,
      message: githubError.message,
    };
  }
  // デフォルトは内部エラー（通常のErrorオブジェクトの場合）
  return {
    code: 'INTERNAL_ERROR',
    status: HTTP_STATUS.INTERNAL_SERVER_ERROR,
    message: error.message || '予期しないエラーが発生しました。再試行してください。',
  };
}

