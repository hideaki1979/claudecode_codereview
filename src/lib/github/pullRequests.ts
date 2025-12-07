import { getOctokit } from './client';
import {
  handleGitHubError,
  validateRepository,
  validatePullNumber,
  validatePagination,
} from './utils';
import type {
  GitHubPullRequest,
  ListPullRequestsParams,
  GetPullRequestParams,
  PaginationInfo,
} from '@/types/github';

/**
 * List pull requests for a repository
 *
 * @param params - Request parameters
 * @param token - Optional GitHub token (uses env var if not provided)
 * @returns Array of pull requests with pagination info
 * @throws Error if API request fails
 *
 * @example
 * ```ts
 * const { data, pagination } = await listPullRequests({
 *   owner: 'facebook',
 *   repo: 'react',
 *   state: 'open',
 *   per_page: 30
 * });
 * ```
 */

// listPullRequests関数（複数のPR取得）
export async function listPullRequests(
  params: ListPullRequestsParams,
  token?: string
): Promise<{ data: GitHubPullRequest[]; pagination: PaginationInfo }> {
  try {
    const octokit = getOctokit(token);

    const {
      owner,  // リポジトリのオーナー名
      repo, // リポジトリ名
      state = 'open', // PRの状態（デフォルト: open）
      head, // ブランチ名でフィルタ
      base, // ベースブランチでフィルタ
      sort = 'created', // ソート基準（デフォルト: 作成日時）
      direction = 'desc', // ソート方向（デフォルト: 降順）
      per_page = 30,  // 1ページあたりの件数
      page = 1, // ページ番号
    } = params;

    // Validate parameters
    validateRepository(owner, repo);  // リポジトリ情報の妥当性チェック
    validatePagination(per_page, page); // ページング情報のチェック

    const response = await octokit.rest.pulls.list({
      owner,
      repo,
      state,
      head,
      base,
      sort,
      direction,
      per_page,
      page,
    });

    // Extract pagination info from response headers
    const linkHeader = response.headers.link;
    const hasNextPage = linkHeader ? linkHeader.includes('rel="next"') : false;
    const hasPrevPage = page > 1;

    const pagination: PaginationInfo = {
      page, // 現在のページ番号
      per_page, // 1ページあたりの件数
      has_next_page: hasNextPage, // 次のページが存在するか
      has_prev_page: hasPrevPage, // 前のページが存在するか
    };

    return {
      data: response.data as unknown as GitHubPullRequest[],
      pagination,
    };
  } catch (error) {
    throw handleGitHubError(error, 'Failed to fetch pull requests');
  }
}

/**
 * Get a single pull request
 *
 * @param params - Request parameters
 * @param token - Optional GitHub token (uses env var if not provided)
 * @returns Pull request data
 * @throws Error if API request fails or PR not found
 *
 * @example
 * ```ts
 * const pr = await getPullRequest({
 *   owner: 'facebook',
 *   repo: 'react',
 *   pull_number: 12345
 * });
 * ```
 */

// 単一のPR取得
export async function getPullRequest(
  params: GetPullRequestParams,
  token?: string
): Promise<GitHubPullRequest> {
  try {
    const octokit = getOctokit(token);

    const { owner, repo, pull_number } = params;

    // Validate parameters
    validateRepository(owner, repo);
    validatePullNumber(pull_number);  // PR番号の妥当性チェック

    const response = await octokit.rest.pulls.get({
      owner,
      repo,
      pull_number,
    });

    return response.data as GitHubPullRequest;
  } catch (error) {
    throw handleGitHubError(error, 'Failed to fetch pull request');
  }
}

