/**
 * 分析データ取得・実行フック
 *
 * SWRを使用して分析データの取得と分析実行を管理
 */

'use client'

import useSWR from 'swr'
import useSWRMutation from 'swr/mutation'
import type {
  ComplexityMetrics,
  ImpactMetrics,
  RiskAssessment,
} from '@/types/analysis'
import type { SecurityMetrics } from '@/lib/analysis/security'

/**
 * セキュリティ検出結果の型定義
 */
interface SecurityFinding {
  id: string
  analysis_id: string
  type: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  message: string
  file: string
  line: number | null
  snippet: string | null
}

/**
 * 分析結果の型定義
 */
interface Analysis {
  id: string
  risk_score: number
  risk_level: 'low' | 'medium' | 'high' | 'critical'
  complexity_score: number
  complexity_level: 'low' | 'medium' | 'high'
  security_score: number
  lines_changed: number
  files_changed: number
  analyzed_at: string
}

/**
 * 分析APIレスポンス（単一PR）
 */
interface AnalysisResponse {
  success: true
  data: {
    repository: {
      id: string
      owner: string
      name: string
    }
    pullRequest: {
      id: string
      number: number
      title: string
      state: string
    }
    analysis: Analysis
    security_findings: SecurityFinding[]
  }
}

/**
 * 分析APIレスポンス（リスト）
 */
interface AnalysisListResponse {
  success: true
  data: {
    analyses: Array<{
      repository: {
        id: string
        owner: string
        name: string
      }
      pullRequest: {
        id: string
        number: number
        title: string
        state: string
      }
      analysis: Analysis
      security_findings: SecurityFinding[]
    }>
    pagination: {
      limit: number
      offset: number
      count: number
      total: number
      totalPages: number
    }
  }
}

/**
 * 分析実行リクエスト
 */
interface RunAnalysisRequest {
  owner: string
  repo: string
  pull_number: number
}

/**
 * 分析実行レスポンス
 */
interface RunAnalysisResponse {
  success: true
  data: {
    analysis: Analysis
    analyzed_at: string
    metrics: {
      risk: RiskAssessment
      complexity: ComplexityMetrics
      security: SecurityMetrics
      impact: ImpactMetrics
    }
  }
}

/**
 * useAnalysisオプション
 */
interface UseAnalysisOptions {
  /**
   * 自動取得を有効にするか（デフォルト: true）
   */
  enabled?: boolean
}

/**
 * useAnalysis戻り値
 */
interface UseAnalysisReturn {
  /** 分析データ */
  analysis: AnalysisResponse['data'] | null
  /** エラー情報 */
  error: Error | null
  /** ローディング中かどうか */
  isLoading: boolean
  /** バリデーション中かどうか */
  isValidating: boolean
  /** 手動でデータを再取得 */
  refetch: () => Promise<void>
  /** キャッシュを更新 */
  mutate: (data?: AnalysisResponse['data']) => Promise<AnalysisResponse | undefined>
}

/**
 * useRunAnalysis戻り値
 */
interface UseRunAnalysisReturn {
  /** 分析を実行 */
  runAnalysis: (params: RunAnalysisRequest) => Promise<RunAnalysisResponse>
  /** 分析実行中かどうか */
  isAnalyzing: boolean
  /** エラー情報 */
  error: Error | null
  /** エラーをリセット */
  reset: () => void
}

/**
 * 分析実行用のfetcher
 */
async function runAnalysisFetcher(
  url: string,
  { arg }: { arg: RunAnalysisRequest }
): Promise<RunAnalysisResponse> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(arg),
  })

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}))
    const error = new Error(errorData.error || 'Analysis failed') as Error & {
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
 * 特定PRの分析結果を取得するフック
 *
 * @param owner - リポジトリオーナー
 * @param repo - リポジトリ名
 * @param pullNumber - PR番号
 * @param options - オプション設定
 * @returns 分析データと状態管理
 *
 * @example
 * ```tsx
 * function AnalysisView({ owner, repo, prNumber }) {
 *   const { analysis, isLoading, error } = useAnalysis(owner, repo, prNumber);
 *
 *   if (isLoading) return <Loading />;
 *   if (error) return <Error message={error.message} />;
 *   if (!analysis) return <NoData />;
 *
 *   return <AnalysisCard data={analysis} />;
 * }
 * ```
 */
export function useAnalysis(
  owner: string | null,
  repo: string | null,
  pullNumber: number | null,
  options: UseAnalysisOptions = {}
): UseAnalysisReturn {
  const { enabled = true } = options

  // SWRキーを生成
  const swrKey =
    enabled && owner && repo && pullNumber
      ? `/api/analysis?owner=${owner}&repo=${repo}&pull_number=${pullNumber}`
      : null

  const {
    data: response,
    error,
    isLoading,
    isValidating,
    mutate,
  } = useSWR<AnalysisResponse>(swrKey, {
    // フォーカス時の再検証を無効化（SWRProviderで設定済みだが明示的に）
    revalidateOnFocus: false,
    // 重複排除間隔を長めに設定
    dedupingInterval: 5000,
  })

  return {
    analysis: response?.data ?? null,
    error: error ?? null,
    isLoading,
    isValidating,
    refetch: async () => {
      await mutate()
    },
    mutate: async (data) => {
      if (data) {
        return mutate({ success: true, data } as AnalysisResponse, false)
      }
      return mutate()
    },
  }
}

/**
 * 分析を実行するフック
 *
 * @returns 分析実行関数と状態
 *
 * @example
 * ```tsx
 * function AnalyzeButton({ owner, repo, prNumber }) {
 *   const { runAnalysis, isAnalyzing, error } = useRunAnalysis();
 *
 *   const handleClick = async () => {
 *     try {
 *       const result = await runAnalysis({ owner, repo, pull_number: prNumber });
 *       console.log('Analysis complete:', result);
 *     } catch (e) {
 *       console.error('Analysis failed:', e);
 *     }
 *   };
 *
 *   return (
 *     <button onClick={handleClick} disabled={isAnalyzing}>
 *       {isAnalyzing ? '分析中...' : '分析を実行'}
 *     </button>
 *   );
 * }
 * ```
 */
export function useRunAnalysis(): UseRunAnalysisReturn {
  const { trigger, isMutating, error, reset } = useSWRMutation(
    '/api/analysis',
    runAnalysisFetcher
  )

  return {
    runAnalysis: trigger,
    isAnalyzing: isMutating,
    error: error ?? null,
    reset,
  }
}

/**
 * 分析結果一覧を取得するフック
 *
 * @param limit - 取得件数（デフォルト: 10）
 * @param offset - オフセット（デフォルト: 0）
 * @returns 分析一覧データと状態管理
 *
 * @example
 * ```tsx
 * function AnalysisList() {
 *   const { analyses, pagination, isLoading } = useAnalysisList(10, 0);
 *
 *   if (isLoading) return <Loading />;
 *
 *   return (
 *     <div>
 *       {analyses.map(item => (
 *         <AnalysisCard key={item.analysis.id} data={item} />
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 */
export function useAnalysisList(limit = 10, offset = 0) {
  const swrKey = `/api/analysis?limit=${limit}&offset=${offset}`

  const {
    data: response,
    error,
    isLoading,
    isValidating,
    mutate,
  } = useSWR<AnalysisListResponse>(swrKey, {
    revalidateOnFocus: false,
    dedupingInterval: 5000,
  })

  return {
    analyses: response?.data.analyses ?? [],
    pagination: response?.data.pagination ?? null,
    error: error ?? null,
    isLoading,
    isValidating,
    refetch: async () => {
      await mutate()
    },
    mutate,
  }
}
