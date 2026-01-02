/**
 * Weekly Report Card Component
 *
 * Displays key metrics from the weekly report with trend indicators.
 */

import {
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  Shield,
  FileCode,
  GitPullRequest,
} from 'lucide-react'
import type { WeeklyReport } from '@/lib/db/reports'

interface WeeklyReportCardProps {
  report: WeeklyReport
}

export function WeeklyReportCard({ report }: WeeklyReportCardProps): React.JSX.Element {
  const getTrendIcon = (change: number) => {
    if (change > 5) return <TrendingUp className="h-4 w-4 text-red-500" />
    if (change < -5) return <TrendingDown className="h-4 w-4 text-green-500" />
    return <Minus className="h-4 w-4 text-gray-500" />
  }

  const getTrendColor = (change: number, inverseColors: boolean = false) => {
    if (Math.abs(change) <= 5) return 'text-gray-600'
    if (inverseColors) {
      return change > 0 ? 'text-green-600' : 'text-red-600'
    }
    return change > 0 ? 'text-red-600' : 'text-green-600'
  }

  const formatChange = (change: number) => {
    const sign = change > 0 ? '+' : ''
    return `${sign}${change}%`
  }

  const { prSummary, securitySummary, comparisonWithPreviousWeek } = report

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <h3 className="mb-4 text-lg font-semibold text-gray-900">
        週間サマリー: {report.summary.weekStart} 〜 {report.summary.weekEnd}
      </h3>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {/* Total PRs Analyzed */}
        <div className="rounded-lg bg-blue-50 p-4">
          <div className="flex items-center gap-2 text-sm text-blue-700">
            <GitPullRequest className="h-4 w-4" />
            分析PR数
          </div>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold text-blue-900">
              {prSummary.totalPRsAnalyzed}
            </span>
            <span className={`text-sm ${getTrendColor(comparisonWithPreviousWeek.prCountChange, true)}`}>
              {formatChange(comparisonWithPreviousWeek.prCountChange)}
            </span>
          </div>
        </div>

        {/* Average Risk Score */}
        <div className="rounded-lg bg-orange-50 p-4">
          <div className="flex items-center gap-2 text-sm text-orange-700">
            <AlertTriangle className="h-4 w-4" />
            平均リスク
          </div>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold text-orange-900">
              {prSummary.avgRiskScore}
            </span>
            {getTrendIcon(comparisonWithPreviousWeek.riskScoreChange)}
            <span className={`text-sm ${getTrendColor(comparisonWithPreviousWeek.riskScoreChange)}`}>
              {formatChange(comparisonWithPreviousWeek.riskScoreChange)}
            </span>
          </div>
        </div>

        {/* Average Complexity */}
        <div className="rounded-lg bg-indigo-50 p-4">
          <div className="flex items-center gap-2 text-sm text-indigo-700">
            <FileCode className="h-4 w-4" />
            平均複雑度
          </div>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold text-indigo-900">
              {prSummary.avgComplexityScore}
            </span>
            {getTrendIcon(comparisonWithPreviousWeek.complexityChange)}
            <span className={`text-sm ${getTrendColor(comparisonWithPreviousWeek.complexityChange)}`}>
              {formatChange(comparisonWithPreviousWeek.complexityChange)}
            </span>
          </div>
        </div>

        {/* Security Findings */}
        <div className="rounded-lg bg-red-50 p-4">
          <div className="flex items-center gap-2 text-sm text-red-700">
            <Shield className="h-4 w-4" />
            セキュリティ検出
          </div>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold text-red-900">
              {securitySummary.totalFindings}
            </span>
            {getTrendIcon(comparisonWithPreviousWeek.securityFindingsChange)}
            <span className={`text-sm ${getTrendColor(comparisonWithPreviousWeek.securityFindingsChange)}`}>
              {formatChange(comparisonWithPreviousWeek.securityFindingsChange)}
            </span>
          </div>
          {securitySummary.criticalCount > 0 && (
            <span className="mt-1 block text-xs text-red-600">
              ({securitySummary.criticalCount} クリティカル)
            </span>
          )}
        </div>
      </div>

      {/* Risk Distribution */}
      <div className="mt-6">
        <h4 className="mb-3 text-sm font-semibold text-gray-700">リスク分布</h4>
        <div className="flex gap-2">
          <div className="flex-1 rounded bg-green-100 p-2 text-center">
            <div className="text-xs text-green-700">Low</div>
            <div className="text-lg font-bold text-green-900">
              {prSummary.riskDistribution.low}
            </div>
          </div>
          <div className="flex-1 rounded bg-yellow-100 p-2 text-center">
            <div className="text-xs text-yellow-700">Medium</div>
            <div className="text-lg font-bold text-yellow-900">
              {prSummary.riskDistribution.medium}
            </div>
          </div>
          <div className="flex-1 rounded bg-orange-100 p-2 text-center">
            <div className="text-xs text-orange-700">High</div>
            <div className="text-lg font-bold text-orange-900">
              {prSummary.riskDistribution.high}
            </div>
          </div>
          <div className="flex-1 rounded bg-red-100 p-2 text-center">
            <div className="text-xs text-red-700">Critical</div>
            <div className="text-lg font-bold text-red-900">
              {prSummary.riskDistribution.critical}
            </div>
          </div>
        </div>
      </div>

      {/* Code Stats */}
      <div className="mt-4 flex gap-6 text-sm text-gray-600">
        <span>
          <strong className="text-gray-900">{prSummary.totalFilesChanged.toLocaleString()}</strong> ファイル変更
        </span>
        <span>
          <strong className="text-gray-900">{prSummary.totalLinesChanged.toLocaleString()}</strong> 行変更
        </span>
      </div>
    </div>
  )
}
