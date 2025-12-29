'use client'

import { SWRConfig } from 'swr'
import { ReactNode } from 'react'

/**
 * SWR用のデフォルトfetcher
 * エラーハンドリング付きでAPIからJSONを取得
 */
const fetcher = async (url: string) => {
  const res = await fetch(url)

  if (!res.ok) {
    // エラーレスポンスの詳細を取得
    const errorData = await res.json().catch(() => ({}))
    const error = new Error(errorData.error || 'API request failed') as Error & {
      status: number
      info: unknown
    }
    error.status = res.status
    error.info = errorData
    throw error
  }

  return res.json()
}

/**
 * SWRProvider - アプリケーション全体のSWR設定
 *
 * 設定内容:
 * - revalidateOnFocus: false - ウィンドウフォーカス時の再検証を無効化
 * - dedupingInterval: 2000 - 2秒間のリクエスト重複排除
 * - keepPreviousData: true - 新データ取得中は前データを表示
 * - errorRetryCount: 3 - エラー時3回までリトライ
 * - errorRetryInterval: 5000 - リトライ間隔5秒
 */
export function SWRProvider({ children }: { children: ReactNode }) {
  return (
    <SWRConfig
      value={{
        fetcher,
        // フォーカス時の再検証を無効化（ダッシュボードでは不要）
        revalidateOnFocus: false,
        // 2秒間のリクエスト重複排除
        dedupingInterval: 2000,
        // 新データ取得中は前データを表示（スムーズなUX）
        keepPreviousData: true,
        // エラー時3回リトライ
        errorRetryCount: 3,
        // リトライ間隔5秒
        errorRetryInterval: 5000,
        // 4xxエラーはリトライしない
        shouldRetryOnError: (error) => {
          const status = (error as Error & { status?: number })?.status
          return !(status && status >= 400 && status < 500)
        },
        // ローディング状態のタイムアウト（3秒でローディング表示）
        loadingTimeout: 3000,
        // フォーカス時の再検証間隔（無効化済みだが念のため設定）
        focusThrottleInterval: 5000,
      }}
    >
      {children}
    </SWRConfig>
  )
}
