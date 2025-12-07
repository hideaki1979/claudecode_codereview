import type { GitHubAPIError } from '@/types/github';

/**
 * GitHub APIエラーを詳細なエラーメッセージで処理
 *
 * @param error - GitHub APIからのエラー
 * @param defaultMessage - デフォルトのエラーメッセージ
 * @returns コンテキストを含むフォーマット済みエラー
 */
export function handleGitHubError(error: unknown, defaultMessage: string): Error {
  if (error instanceof Error) {
    // ステータスコードを含むGitHub APIエラーかチェック
    const githubError = error as GitHubAPIError & Error;

    if (githubError.status === 404) {
      return new Error(`${defaultMessage}: Resource not found`);
    }

    if (githubError.status === 401) {
      return new Error(
        `${defaultMessage}: Unauthorized. Check your GitHub token or ensure it has the required scopes.`
      );
    }

    if (githubError.status === 403) {
      const isRateLimit = githubError.message?.includes('rate limit');
      if (isRateLimit) {
        return new Error(`${defaultMessage}: GitHub API rate limit exceeded. Please try again later.`);
      }
      return new Error(`${defaultMessage}: Forbidden. Insufficient permissions or token scopes.`);
    }

    if (githubError.status === 422) {
      return new Error(`${defaultMessage}: Invalid parameters provided. ${githubError.message || ''}`);
    }

    if (githubError.status === 500) {
      return new Error(`${defaultMessage}: GitHub server error. Please try again later.`);
    }

    if (githubError.status === 503) {
      return new Error(`${defaultMessage}: GitHub service unavailable. Please try again later.`);
    }

    // 利用可能な場合は元のエラーメッセージを返す
    return new Error(`${defaultMessage}: ${error.message}`);
  }

  return new Error(defaultMessage);
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
    throw new Error('Repository owner is required and must be a non-empty string');
  }

  if (!repo || typeof repo !== 'string' || repo.trim() === '') {
    throw new Error('Repository name is required and must be a non-empty string');
  }

  // 無効な文字をチェック
  const validPattern = /^[a-zA-Z0-9._-]+$/;
  if (!validPattern.test(owner)) {
    throw new Error('Repository owner contains invalid characters');
  }

  if (!validPattern.test(repo)) {
    throw new Error('Repository name contains invalid characters');
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
    throw new Error('Pull request number is required and must be a number');
  }

  if (pull_number < 1 || !Number.isInteger(pull_number)) {
    throw new Error('Pull request number must be a positive integer');
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
      throw new Error('per_page must be an integer');
    }

    if (per_page < 1 || per_page > 100) {
      throw new Error('per_page must be between 1 and 100');
    }
  }

  if (page !== undefined) {
    if (typeof page !== 'number' || !Number.isInteger(page)) {
      throw new Error('page must be an integer');
    }

    if (page < 1) {
      throw new Error('page must be greater than 0');
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
    throw new Error(
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
