'use client'

/**
 * Trend Charts Container Component
 *
 * Main container for all trend analysis charts.
 * Fetches trend data using SWR and renders individual chart components.
 */

import useSWR from 'swr'
import { TrendingUp } from 'lucide-react'
import { RiskTrendChart } from './RiskTrendChart'
import { ComplexityTrendChart } from './ComplexityTrendChart'
import { SecurityTrendChart } from './SecurityTrendChart'
import { TrendSummaryCard } from './TrendSummaryCard'
import type {
  DailyRiskTrend,
  WeeklyComplexityTrend,
  DailySecurityTrend,
  TrendSummary,
} from '@/lib/db/trends'

interface TrendChartsProps {
  owner: string
  repo: string
  days?: number
  weeks?: number
}

interface TrendApiResponse<T> {
  success: boolean
  data?: {
    repositoryId: string
    type: string
    trend: T
  }
  error?: string
}

const fetcher = async <T,>(url: string): Promise<T | null> => {
  const res = await fetch(url)
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error || 'Failed to fetch')
  }
  const json: TrendApiResponse<T> = await res.json()
  return json.data?.trend ?? null
}

export function TrendCharts({
  owner,
  repo,
  days = 30,
  weeks = 12,
}: TrendChartsProps): React.JSX.Element {
  // Build base URL with owner/repo params
  const baseParams = `owner=${encodeURIComponent(owner)}&repo=${encodeURIComponent(repo)}`

  // Fetch all trend data in parallel
  const { data: summaryData, isLoading: summaryLoading } = useSWR<TrendSummary | null>(
    `/api/trends?${baseParams}&type=summary&days=${days}`,
    fetcher,
    { revalidateOnFocus: false }
  )

  const { data: riskData, isLoading: riskLoading } = useSWR<DailyRiskTrend[] | null>(
    `/api/trends?${baseParams}&type=daily-risk&days=${days}`,
    fetcher,
    { revalidateOnFocus: false }
  )

  const { data: complexityData, isLoading: complexityLoading } = useSWR<WeeklyComplexityTrend[] | null>(
    `/api/trends?${baseParams}&type=weekly-complexity&weeks=${weeks}`,
    fetcher,
    { revalidateOnFocus: false }
  )

  const { data: securityData, isLoading: securityLoading } = useSWR<DailySecurityTrend[] | null>(
    `/api/trends?${baseParams}&type=security-alerts&days=${days}`,
    fetcher,
    { revalidateOnFocus: false }
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2">
        <TrendingUp className="h-6 w-6 text-blue-600" />
        <h2 className="text-xl font-semibold text-gray-900">傾向分析</h2>
      </div>

      {/* Summary Card */}
      <TrendSummaryCard data={summaryData ?? null} isLoading={summaryLoading} />

      {/* Charts Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Risk Trend Chart */}
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-lg font-semibold text-gray-900">
            日次リスクスコア推移
          </h3>
          <RiskTrendChart data={riskData ?? []} isLoading={riskLoading} />
        </div>

        {/* Complexity Trend Chart */}
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-lg font-semibold text-gray-900">
            週次複雑度推移
          </h3>
          <ComplexityTrendChart data={complexityData ?? []} isLoading={complexityLoading} />
        </div>

        {/* Security Trend Chart - Full Width */}
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm lg:col-span-2">
          <h3 className="mb-4 text-lg font-semibold text-gray-900">
            セキュリティ検出推移
          </h3>
          <SecurityTrendChart data={securityData ?? []} isLoading={securityLoading} />
        </div>
      </div>
    </div>
  )
}
