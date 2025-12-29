/**
 * プルリクエストデータ取得フック（SWR版）
 *
 * SWRを使用してプルリクエストデータを取得し、
 * キャッシュ・再検証・エラーハンドリングを自動的に管理
 */

'use client'

import { useMemo } from 'react'
import useSWR from 'swr'
import type { ListPullRequestsQuery, RateLimitInfo } from '@/types/api'
import type { GitHubPullRequestSimple, PaginationInfo } from '@/types/github'

// 安定した空配列参照（毎回新しい配列を生成しないため）
const EMPTY_ARRAY: GitHubPullRequestSimple[] = []

/**
 * API レスポンス型（成功時）
 */
interface ListPullRequestsResponse {
  success: true
  data: GitHubPullRequestSimple[]
  pagination: PaginationInfo
  rateLimit: RateLimitInfo
  cacheHit: boolean
}

/**
 * フックのオプション設定
 */
interface UsePullRequestsOptions {
  /**
   * 自動取得を有効にするか（デフォルト: true）
   */
  enabled?: boolean

  /**
   * 再取得間隔（ミリ秒、デフォルト: なし）
   */
  refetchInterval?: number
}

/**
 * フックの戻り値型
 */
interface UsePullRequestsReturn {
  /** プルリクエストデータ */
  data: GitHubPullRequestSimple[]
  /** ページネーション情報 */
  pagination: PaginationInfo | null
  /** レート制限情報 */
  rateLimit: RateLimitInfo | null
  /** キャッシュヒットかどうか */
  cacheHit: boolean | null
  /** エラー情報 */
  error: {
    code: string
    message: string
    details?: string
  } | null
  /** ローディング中かどうか */
  isLoading: boolean
  /** バリデーション中（バックグラウンド更新中）かどうか */
  isValidating: boolean
  /** データが存在するかどうか */
  hasData: boolean
  /** エラーが発生しているかどうか */
  hasError: boolean
  /** 手動でデータを再取得 */
  refetch: () => Promise<void>
  /** SWRのmutate関数（キャッシュ更新用） */
  mutate: () => Promise<ListPullRequestsResponse | undefined>
}

/**
 * クエリパラメータからSWRキーを生成
 */
function buildQueryKey(params: ListPullRequestsQuery): string | null {
  const searchParams = new URLSearchParams()

  // 必須パラメータ
  if (!params.owner || !params.repo) {
    return null
  }
  searchParams.set('owner', params.owner)
  searchParams.set('repo', params.repo)

  // オプショナルパラメータ
  if (params.state) searchParams.set('state', params.state)
  if (params.sort) searchParams.set('sort', params.sort)
  if (params.direction) searchParams.set('direction', params.direction)
  if (params.per_page) searchParams.set('per_page', String(params.per_page))
  if (params.page) searchParams.set('page', String(params.page))

  // 正しいAPIエンドポイントを使用
  return `/api/github?${searchParams.toString()}`
}

/**
 * プルリクエストデータ取得フック（SWR版）
 *
 * @param params - GitHub API クエリパラメータ
 * @param options - フックのオプション設定
 * @returns プルリクエストデータと状態管理
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { data, isLoading, hasError, error, refetch } = usePullRequestsSWR({
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
export function usePullRequestsSWR(
  params: ListPullRequestsQuery,
  options: UsePullRequestsOptions = {}
): UsePullRequestsReturn {
  const { enabled = true, refetchInterval } = options

  // SWRキーを生成（enabled=falseまたはパラメータ不足の場合はnull）
  const swrKey = enabled ? buildQueryKey(params) : null

  const {
    data: response,
    error: swrError,
    isLoading,
    isValidating,
    mutate,
  } = useSWR<ListPullRequestsResponse>(swrKey, {
    // 再検証間隔（ミリ秒）
    refreshInterval: refetchInterval,
    // マウント時に再検証
    revalidateOnMount: true,
    // エラー時のリトライ設定はSWRProviderで設定済み
  })

  // エラー情報を整形
  const error = swrError
    ? {
        code: (swrError as Error & { status?: number }).status?.toString() || 'UNKNOWN_ERROR',
        message: swrError.message || '不明なエラーが発生しました',
        details: (swrError as Error & { info?: { details?: string } }).info?.details,
      }
    : null

  // データを安定した参照でメモ化（無限ループ防止）
  const data = useMemo(() => {
    return response?.data ?? EMPTY_ARRAY
  }, [response?.data])

  const hasData = useMemo(() => {
    return data.length > 0
  }, [data])

  return {
    data,
    pagination: response?.pagination ?? null,
    rateLimit: response?.rateLimit ?? null,
    cacheHit: response?.cacheHit ?? null,
    error,
    isLoading,
    isValidating,
    hasData,
    hasError: !!swrError,
    refetch: async () => {
      await mutate()
    },
    mutate: async () => mutate(),
  }
}

/**
 * 後方互換性のためのエイリアス
 * 既存のusePullRequestsを使用しているコンポーネントのために提供
 */
export { usePullRequestsSWR as usePullRequests }
