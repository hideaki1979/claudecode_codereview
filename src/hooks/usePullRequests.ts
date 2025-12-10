/**
 * プルリクエストデータ取得フック
 *
 * GitHub API Route Handler を通じてプルリクエストデータを取得し、
 * ローディング・エラー状態を管理するカスタムフック
 */

'use client';

import { useEffect, useState } from 'react';
import { listPullRequests, isApiError } from '@/lib/api-client';
import type { ListPullRequestsQuery, RateLimitInfo } from '@/types/api';
import type { GitHubPullRequestSimple, PaginationInfo } from '@/types/github';

/**
 * フック状態の Discriminated Union 型定義
 *
 * TypeScript の型推論を活用し、状態に応じた適切な型チェックを提供
 */
type PullRequestsState =
  | {
      status: 'idle';
      data: null;
      pagination: null;
      rateLimit: null;
      cacheHit: null;
      error: null;
    }
  | {
      status: 'loading';
      data: null;
      pagination: null;
      rateLimit: null;
      cacheHit: null;
      error: null;
    }
  | {
      status: 'success';
      data: GitHubPullRequestSimple[];
      pagination: PaginationInfo;
      rateLimit: RateLimitInfo;
      cacheHit: boolean;
      error: null;
    }
  | {
      status: 'error';
      data: null;
      pagination: null;
      rateLimit: null;
      cacheHit: null;
      error: {
        code: string;
        message: string;
        details?: string;
      };
    };

/**
 * フックのオプション設定
 */
interface UsePullRequestsOptions {
  /**
   * 自動取得を有効にするか（デフォルト: true）
   */
  enabled?: boolean;

  /**
   * 再取得間隔（ミリ秒、デフォルト: なし）
   */
  refetchInterval?: number;

  /**
   * エラー時のリトライ回数（デフォルト: 0）
   */
  retry?: number;
}

/**
 * フックの戻り値型
 *
 * Discriminated Union と追加メソッドを組み合わせた型
 */
type UsePullRequestsReturn = PullRequestsState & {
  /**
   * 手動でデータを再取得
   */
  refetch: () => Promise<void>;

  /**
   * ローディング中かどうか
   */
  isLoading: boolean;

  /**
   * データが存在するかどうか
   */
  hasData: boolean;

  /**
   * エラーが発生しているかどうか
   */
  hasError: boolean;
};

/**
 * プルリクエストデータ取得フック
 *
 * @param params - GitHub API クエリパラメータ
 * @param options - フックのオプション設定
 * @returns プルリクエストデータと状態管理
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { data, isLoading, hasError, error, refetch } = usePullRequests({
 *     owner: 'octocat',
 *     repo: 'hello-world',
 *     state: 'open',
 *   });
 *
 *   if (isLoading) return <Loading />;
 *   if (hasError) return <Error message={error.message} />;
 *   return <PRList data={data} />;
 * }
 * ```
 */
export function usePullRequests(
  params: ListPullRequestsQuery,
  options: UsePullRequestsOptions = {}
): UsePullRequestsReturn {
  const { enabled = true, refetchInterval, retry = 0 } = options;

  // Discriminated Union による状態管理
  const [state, setState] = useState<PullRequestsState>({
    status: 'idle',
    data: null,
    pagination: null,
    rateLimit: null,
    cacheHit: null,
    error: null,
  });

  // データ取得関数
  const fetchData = async (retryCount = 0): Promise<void> => {
    // ローディング状態に設定
    setState({
      status: 'loading',
      data: null,
      pagination: null,
      rateLimit: null,
      cacheHit: null,
      error: null,
    });

    try {
      // API 呼び出し
      const response = await listPullRequests(params);

      // レスポンスの型チェック
      if (response.success) {
        // キャッシュヒットかどうかを判定（実際の実装では response header から取得）
        // ここでは簡易的に実装
        const cacheHit = false; // TODO: response headers から取得

        // 成功状態に設定
        setState({
          status: 'success',
          data: response.data,
          pagination: response.pagination,
          rateLimit: response.rateLimit,
          cacheHit,
          error: null,
        });
      } else {
        // エラー状態に設定
        setState({
          status: 'error',
          data: null,
          pagination: null,
          rateLimit: null,
          cacheHit: null,
          error: {
            code: response.error.code,
            message: response.error.message,
            details: response.error.details,
          },
        });
      }
    } catch (error) {
      // リトライロジック
      if (retryCount < retry) {
        await fetchData(retryCount + 1);
        return;
      }

      // ApiError の処理
      if (isApiError(error)) {
        setState({
          status: 'error',
          data: null,
          pagination: null,
          rateLimit: null,
          cacheHit: null,
          error: {
            code: error.code,
            message: error.message,
            details: error.details,
          },
        });
        return;
      }

      // その他のエラー
      setState({
        status: 'error',
        data: null,
        pagination: null,
        rateLimit: null,
        cacheHit: null,
        error: {
          code: 'UNKNOWN_ERROR',
          message: error instanceof Error ? error.message : '不明なエラーが発生しました',
        },
      });
    }
  };

  // 初回マウント時とパラメータ変更時にデータ取得
  useEffect(() => {
    if (enabled) {
      void fetchData();
    }
  }, [
    params.owner,
    params.repo,
    params.state,
    params.sort,
    params.direction,
    params.per_page,
    params.page,
    enabled,
  ]);

  // 定期的な再取得
  useEffect(() => {
    if (!refetchInterval || !enabled) {
      return;
    }

    const intervalId = setInterval(() => {
      void fetchData();
    }, refetchInterval);

    return () => {
      clearInterval(intervalId);
    };
  }, [refetchInterval, enabled]);

  // 戻り値
  return {
    ...state,
    refetch: fetchData,
    isLoading: state.status === 'loading',
    hasData: state.status === 'success',
    hasError: state.status === 'error',
  };
}

/**
 * プルリクエストデータをプリフェッチするヘルパー関数
 *
 * @param params - GitHub API クエリパラメータ
 * @returns プリフェッチされたデータ
 *
 * @example
 * ```tsx
 * async function prefetchData() {
 *   const data = await prefetchPullRequests({
 *     owner: 'octocat',
 *     repo: 'hello-world',
 *   });
 *   return data;
 * }
 * ```
 */
export async function prefetchPullRequests(
  params: ListPullRequestsQuery
): Promise<GitHubPullRequestSimple[] | null> {
  try {
    const response = await listPullRequests(params);

    if (response.success) {
      return response.data;
    }

    return null;
  } catch {
    return null;
  }
}
