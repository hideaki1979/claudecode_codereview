/**
 * プルリクエストデータ取得フック
 *
 * GitHub API Route Handler を通じてプルリクエストデータを取得し、
 * ローディング・エラー状態を管理するカスタムフック
 */

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
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

  // リトライ回数をrefで保持（再帰呼び出し用）
  const retryRef = useRef(retry);
  // fetchDataの最新の参照を保持（再帰呼び出し用）
  const fetchDataRef = useRef<((retryCount?: number) => Promise<void>) | null>(null);

  // paramsをrefで保持（無限ループを防ぐため）
  const paramRef = useRef(params);

  // retryが変更されたらrefを更新
  useEffect(() => {
    retryRef.current = retry;
  }, [retry]);

  // paramsが変更されたらrefを更新
  useEffect(() => {
    paramRef.current = params;
  }, [params]);

  // データ取得関数（useCallbackでメモ化）
  const fetchData = useCallback(
    async (retryCount = 0): Promise<void> => {
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
        // API 呼び出し（refから最新のparamsを取得）
        const response = await listPullRequests(paramRef.current);

        // レスポンスの型チェック
        if (response.success) {
          // キャッシュヒットかどうかを判定（実際の実装では response header から取得）
          const cacheHit = response.cacheHit; // TODO: response headers から取得

          // 成功状態に設定
          // エラーはcatchブロックで処理されます。
          setState({
            status: 'success',
            data: response.data,
            pagination: response.pagination,
            rateLimit: response.rateLimit,
            cacheHit,
            error: null,
          });
        }
      } catch (error) {
        // リトライロジック（refから最新のretry値を取得）
        if (retryCount < retryRef.current && fetchDataRef.current) {
          await fetchDataRef.current(retryCount + 1);
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
    },
    []
  );

  // fetchDataの最新の参照をrefに保存
  useEffect(() => {
    fetchDataRef.current = fetchData;
  }, [fetchData]);

  // 初回マウント時とパラメータ変更時にデータ取得
  useEffect(() => {
    if (!enabled) {
      return;
    }

    // 非同期関数を定義して、setStateの呼び出しを非同期コンテキストに移動
    const executeFetch = async (): Promise<void> => {
      // refから最新のfetchDataを取得
      if (fetchDataRef.current) {
        await fetchDataRef.current();
      }
    }

    void executeFetch();
  }, [enabled, params.owner, params.repo, params.state, params.sort, params.direction, params.per_page, params.page]);

  // 定期的な再取得
  useEffect(() => {
    if (!refetchInterval || !enabled) {
      return;
    }

    const intervalId = setInterval(() => {
      // refから最新のfetchDataを取得
      if (fetchDataRef.current) {
        void fetchDataRef.current();
      }
    }, refetchInterval);

    return () => {
      clearInterval(intervalId);
    };
  }, [refetchInterval, enabled]);

  // 戻り値
  return {
    ...state,
    refetch: async (): Promise<void> => {
      // refから最新のfetchDataを取得
      if (fetchDataRef.current) {
        await fetchDataRef.current();
      }
    },
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
