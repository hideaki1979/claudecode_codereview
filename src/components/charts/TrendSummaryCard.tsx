'use client'

/**
 * Trend Summary Card Component
 *
 * Displays key trend metrics with direction indicators.
 */

import { TrendingUp, TrendingDown, Minus, AlertTriangle, Shield } from 'lucide-react'
import type { TrendSummary } from '@/lib/db/trends'

interface TrendSummaryCardProps {
  data: TrendSummary | null
  isLoading?: boolean
}

export function TrendSummaryCard({
  data,
  isLoading = false,
}: TrendSummaryCardProps): React.JSX.Element {
  if (isLoading) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <div className="animate-pulse space-y-4">
          <div className="h-6 w-32 rounded bg-gray-200" />
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="space-y-2">
                <div className="h-4 w-20 rounded bg-gray-200" />
                <div className="h-8 w-16 rounded bg-gray-200" />
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <p className="text-gray-500">サマリーデータがありません</p>
      </div>
    )
  }

  const getTrendIcon = (trend: 'increasing' | 'decreasing' | 'stable') => {
    switch (trend) {
      case 'increasing':
        return <TrendingUp className="h-4 w-4 text-red-500" />
      case 'decreasing':
        return <TrendingDown className="h-4 w-4 text-green-500" />
      default:
        return <Minus className="h-4 w-4 text-gray-500" />
    }
  }

  const getTrendColor = (trend: 'increasing' | 'decreasing' | 'stable', isPositive: boolean) => {
    if (trend === 'stable') return 'text-gray-600'
    // For risk/complexity, increasing is bad (red), decreasing is good (green)
    // If isPositive is true, we flip the logic
    if (isPositive) {
      return trend === 'increasing' ? 'text-green-600' : 'text-red-600'
    }
    return trend === 'increasing' ? 'text-red-600' : 'text-green-600'
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <h3 className="mb-4 text-lg font-semibold text-gray-900">
        過去{data.periodDays}日間の傾向サマリー
      </h3>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {/* Total Analyses */}
        <div className="rounded-lg bg-blue-50 p-4">
          <div className="text-sm text-blue-700">総分析数</div>
          <div className="text-2xl font-bold text-blue-900">{data.totalAnalyses}</div>
        </div>

        {/* Risk Score */}
        <div className="rounded-lg bg-orange-50 p-4">
          <div className="flex items-center gap-2 text-sm text-orange-700">
            <AlertTriangle className="h-4 w-4" />
            平均リスク
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-2xl font-bold ${getTrendColor(data.riskTrend, false)}`}>
              {data.avgRiskScore.toFixed(1)}
            </span>
            {getTrendIcon(data.riskTrend)}
          </div>
        </div>

        {/* Complexity Score */}
        <div className="rounded-lg bg-indigo-50 p-4">
          <div className="text-sm text-indigo-700">平均複雑度</div>
          <div className="flex items-center gap-2">
            <span className={`text-2xl font-bold ${getTrendColor(data.complexityTrend, false)}`}>
              {data.avgComplexityScore.toFixed(1)}
            </span>
            {getTrendIcon(data.complexityTrend)}
          </div>
        </div>

        {/* Security Findings */}
        <div className="rounded-lg bg-red-50 p-4">
          <div className="flex items-center gap-2 text-sm text-red-700">
            <Shield className="h-4 w-4" />
            セキュリティ検出
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-red-900">
              {data.totalSecurityFindings}
            </span>
            {data.criticalFindings > 0 && (
              <span className="text-sm text-red-600">
                ({data.criticalFindings} クリティカル)
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
