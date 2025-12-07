import type { GitHubAPIError } from '@/types/github';

/**
 * Handle GitHub API errors with detailed error messages
 *
 * @param error - Error from GitHub API
 * @param defaultMessage - Default error message
 * @returns Formatted error with context
 */
export function handleGitHubError(error: unknown, defaultMessage: string): Error {
  if (error instanceof Error) {
    // Check if it's a GitHub API error with status code
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

    // Return original error message if available
    return new Error(`${defaultMessage}: ${error.message}`);
  }

  return new Error(defaultMessage);
}

/**
 * Validate repository owner and name
 *
 * @param owner - Repository owner
 * @param repo - Repository name
 * @throws Error if validation fails
 */

// リポジトリのオーナー名とリポジトリ名が正しい形式かチェックします。
export function validateRepository(owner: string, repo: string): void {
  if (!owner || typeof owner !== 'string' || owner.trim() === '') {
    throw new Error('Repository owner is required and must be a non-empty string');
  }

  if (!repo || typeof repo !== 'string' || repo.trim() === '') {
    throw new Error('Repository name is required and must be a non-empty string');
  }

  // Check for invalid characters
  const validPattern = /^[a-zA-Z0-9._-]+$/;
  if (!validPattern.test(owner)) {
    throw new Error('Repository owner contains invalid characters');
  }

  if (!validPattern.test(repo)) {
    throw new Error('Repository name contains invalid characters');
  }
}

/**
 * Validate pull request number
 *
 * @param pull_number - Pull request number
 * @throws Error if validation fails
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
 * Validate pagination parameters
 *
 * @param per_page - Items per page
 * @param page - Page number
 * @throws Error if validation fails
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
 * Validate GitHub token
 *
 * @param token - GitHub personal access token
 * @throws Error if validation fails
 */

// ページネーションのパラメータが正しい範囲内かチェックします。
export function validateToken(token: string | undefined): void {
  if (!token || typeof token !== 'string' || token.trim() === '') {
    throw new Error(
      'GitHub token is required. Provide it as an argument or set GITHUB_TOKEN environment variable.'
    );
  }

  // Basic token format validation
  // GitHub tokens typically start with 'ghp_', 'gho_', 'ghu_', or 'ghs_'
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
 * Parse Link header for pagination
 *
 * @param linkHeader - Link header from GitHub API response
 * @returns Object with next, prev, first, last page URLs
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
 * Extract page number from URL
 *
 * @param url - GitHub API URL with page parameter
 * @returns Page number or undefined
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
