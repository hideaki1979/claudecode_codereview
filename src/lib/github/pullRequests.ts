import { getOctokit } from './client';
import {
  handleGitHubError,
  validateRepository,
  validatePullNumber,
  validatePagination,
  parseLinkHeader,
  extractRateLimit,
} from './utils';
import { rateLimitMonitor } from '../rateLimit';
import type {
  GitHubPullRequest,
  GitHubPullRequestSimple,
  ListPullRequestsParams,
  GetPullRequestParams,
  PaginationInfo,
} from '@/types/github';
import type { RateLimitInfo } from '@/types/api';

/**
 * リポジトリのプルリクエスト一覧を取得
 *
 * @param params - リクエストパラメータ
 * @param token - オプションのGitHubトークン（未指定の場合は環境変数を使用）
 * @returns ページネーション情報を含むプルリクエストの配列
 * @throws APIリクエストが失敗した場合にエラーをスロー
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
): Promise<{
  data: GitHubPullRequestSimple[];
  pagination: PaginationInfo;
  rateLimit: RateLimitInfo;
}> {
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

    // パラメータの検証
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

    // レスポンスヘッダーからページネーション情報を抽出
    const linkHeader = response.headers.link;
    const links = parseLinkHeader(linkHeader);
    const hasNextPage = !!links.next;
    const hasPrevPage = !!links.prev;

    const pagination: PaginationInfo = {
      page, // 現在のページ番号
      per_page, // 1ページあたりの件数
      has_next_page: hasNextPage, // 次のページが存在するか
      has_prev_page: hasPrevPage, // 前のページが存在するか
    };

    // レスポンスヘッダーからレート制限情報を抽出
    const rateLimit = extractRateLimit(response.headers);
    rateLimitMonitor.update(rateLimit);

    return {
      data: response.data as GitHubPullRequestSimple[],
      pagination,
      rateLimit,
    };
  } catch (error) {
    throw handleGitHubError(error, 'Failed to fetch pull requests');
  }
}

/**
 * 単一のプルリクエストを取得
 *
 * @param params - リクエストパラメータ
 * @param token - オプションのGitHubトークン（未指定の場合は環境変数を使用）
 * @returns プルリクエストデータ
 * @throws APIリクエストが失敗した場合、またはPRが見つからない場合にエラーをスロー
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
): Promise<{
  data: GitHubPullRequest;
  rateLimit: RateLimitInfo;
}> {
  try {
    const octokit = getOctokit(token);

    const { owner, repo, pull_number } = params;

    // パラメータの検証
    validateRepository(owner, repo);
    validatePullNumber(pull_number);  // PR番号の妥当性チェック

    const response = await octokit.rest.pulls.get({
      owner,
      repo,
      pull_number,
    });

    // レスポンスヘッダーからレート制限情報を抽出
    const rateLimit = extractRateLimit(response.headers);
    rateLimitMonitor.update(rateLimit);

    return {
      data: response.data as GitHubPullRequest,
      rateLimit,
    }
  } catch (error) {
    throw handleGitHubError(error, 'Failed to fetch pull request');
  }
}

