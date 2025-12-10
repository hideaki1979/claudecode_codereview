/**
 * API クライアント
 *
 * GitHub API Route Handler (/api/github) を呼び出すための型安全なクライアント
 */

import type {
  ApiListResponse,
  ApiPullRequestResponse,
  ListPullRequestsQuery,
  GetPullRequestBody,
  ErrorResponse,
} from '@/types/api';
import type { GitHubDiff, GetPullRequestDiffParams } from '@/types/github';

/**
 * API エラークラス
 *
 * API エラーレスポンスをラップし、エラーハンドリングを簡素化
 */
export class ApiError extends Error {
  constructor(
    public code: ErrorResponse['error']['code'],
    message: string,
    public details?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * fetch ラッパー関数
 *
 * 型安全な fetch 呼び出しとエラーハンドリングを提供
 */
async function fetchAPI<T>(
  url: string,
  options?: RequestInit
): Promise<T> {
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    // レスポンスが OK でない場合はエラー
    if (!response.ok) {
      const errorData: ErrorResponse = await response.json();
      throw new ApiError(
        errorData.error.code,
        errorData.error.message,
        errorData.error.details
      );
    }

    // 成功レスポンスを返す
    return await response.json();
  } catch (error) {
    // ApiError はそのまま再スロー
    if (error instanceof ApiError) {
      throw error;
    }

    // ネットワークエラーやその他のエラーを ApiError に変換
    if (error instanceof Error) {
      throw new ApiError('INTERNAL_ERROR', error.message);
    }

    // 未知のエラー
    throw new ApiError('INTERNAL_ERROR', '予期しないエラーが発生しました');
  }
}

/**
 * プルリクエスト一覧を取得
 *
 * @param params - クエリパラメータ
 * @returns プルリクエスト一覧のレスポンス
 * @throws {ApiError} API エラーが発生した場合
 *
 * @example
 * ```ts
 * const response = await listPullRequests({
 *   owner: 'octocat',
 *   repo: 'hello-world',
 *   state: 'open',
 *   per_page: 20,
 * });
 *
 * if (response.success) {
 *   console.log(response.data); // GitHubPullRequestSimple[]
 *   console.log(response.pagination); // PaginationInfo
 * }
 * ```
 */
export async function listPullRequests(
  params: ListPullRequestsQuery
): Promise<ApiListResponse> {
  // クエリパラメータを URLSearchParams に変換
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined) {
      searchParams.append(key, String(value));
    }
  });

  const url = `/api/github?${searchParams.toString()}`;

  return fetchAPI<ApiListResponse>(url, {
    method: 'GET',
  });
}

/**
 * 特定のプルリクエスト詳細を取得
 *
 * @param body - リクエストボディ
 * @returns プルリクエスト詳細のレスポンス
 * @throws {ApiError} API エラーが発生した場合
 *
 * @example
 * ```ts
 * const response = await getPullRequest({
 *   owner: 'octocat',
 *   repo: 'hello-world',
 *   pull_number: 1,
 * });
 *
 * if (response.success) {
 *   console.log(response.data); // GitHubPullRequest
 *   console.log(response.data.commits); // コミット数
 *   console.log(response.data.additions); // 追加行数
 * }
 * ```
 */
export async function getPullRequest(
  body: GetPullRequestBody
): Promise<ApiPullRequestResponse> {
  return fetchAPI<ApiPullRequestResponse>('/api/github', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

/**
 * プルリクエストの差分を取得
 *
 * @param params - リクエストパラメータ
 * @returns プルリクエストの差分情報
 * @throws {ApiError} API エラーが発生した場合
 *
 * @example
 * ```ts
 * const response = await getPullRequestDiffAPI({
 *   owner: 'octocat',
 *   repo: 'hello-world',
 *   pull_number: 1,
 * });
 *
 * if (response.success) {
 *   console.log(response.data.files); // 変更されたファイル一覧
 *   console.log(response.data.total_changes); // 変更行数の合計
 * }
 * ```
 */
export async function getPullRequestDiffAPI(
  params: GetPullRequestDiffParams
): Promise<{ success: true; data: GitHubDiff } | ErrorResponse> {
  return fetchAPI<{ success: true; data: GitHubDiff }>('/api/github/diff', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

/**
 * API エラーかどうかを判定する型ガード
 *
 * @param error - 判定対象のエラー
 * @returns ApiError の場合は true
 *
 * @example
 * ```ts
 * try {
 *   await listPullRequests({ owner: 'octocat', repo: 'hello-world' });
 * } catch (error) {
 *   if (isApiError(error)) {
 *     console.log(error.code); // ErrorCode
 *     console.log(error.message); // エラーメッセージ
 *   }
 * }
 * ```
 */
export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}
