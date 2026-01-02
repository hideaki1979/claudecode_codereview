'use client'

/**
 * Weekly Report Container Component
 *
 * Fetches and displays the complete weekly report with all sections.
 */

import { useState } from 'react'
import useSWR from 'swr'
import { FileBarChart2, Loader2, AlertCircle, Calendar, ChevronLeft, ChevronRight } from 'lucide-react'
import { WeeklyReportCard } from './WeeklyReportCard'
import { ReportExportButtons } from './ReportExportButtons'
import { ReportEmailForm } from './ReportEmailForm'
import { TopRiskyPRsTable } from './TopRiskyPRsTable'
import { SecurityFindingsCard } from './SecurityFindingsCard'
import { useEmailConfig } from '@/hooks/useEmailConfig'
import type { WeeklyReport as WeeklyReportType } from '@/lib/db/reports'

interface WeeklyReportProps {
  owner: string
  repo: string
}

const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.message || 'Failed to fetch report')
  }
  return res.json()
}

export function WeeklyReport({
  owner,
  repo,
}: WeeklyReportProps): React.JSX.Element {
  const [weeksAgo, setWeeksAgo] = useState(0)

  // Fetch report data
  const {
    data: report,
    error,
    isLoading,
  } = useSWR<WeeklyReportType>(
    `/api/reports?owner=${encodeURIComponent(owner)}&repo=${encodeURIComponent(repo)}&weeksAgo=${weeksAgo}`,
    fetcher,
    { revalidateOnFocus: false }
  )

  // Check email configuration (using SWR for consistency and caching)
  const { isConfigured: isEmailConfigured } = useEmailConfig()

  // Navigation handlers
  const handlePreviousWeek = () => setWeeksAgo((prev) => Math.min(prev + 1, 52))
  const handleNextWeek = () => setWeeksAgo((prev) => Math.max(prev - 1, 0))
  const handleCurrentWeek = () => setWeeksAgo(0)

  // Loading state
  if (isLoading) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-8">
        <div className="flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          <span className="ml-3 text-gray-600">レポートを生成中...</span>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-8 text-center">
        <AlertCircle className="mx-auto h-8 w-8 text-red-500" />
        <h3 className="mt-2 text-lg font-semibold text-red-900">
          レポートの生成に失敗しました
        </h3>
        <p className="mt-1 text-sm text-red-700">{error.message}</p>
      </div>
    )
  }

  // No data state
  if (!report) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-8 text-center">
        <FileBarChart2 className="mx-auto h-8 w-8 text-gray-400" />
        <h3 className="mt-2 text-lg font-semibold text-gray-900">
          レポートデータがありません
        </h3>
        <p className="mt-1 text-sm text-gray-500">
          この週の分析データがまだ存在しません
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <FileBarChart2 className="h-6 w-6 text-blue-600" />
          <h2 className="text-xl font-semibold text-gray-900">週次レポート</h2>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Week Navigation */}
          <div className="flex items-center gap-1 rounded-lg border border-gray-200 bg-white">
            <button
              onClick={handlePreviousWeek}
              disabled={weeksAgo >= 52}
              className="rounded-l-lg p-2 hover:bg-gray-50 disabled:opacity-50"
              title="前の週"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={handleCurrentWeek}
              disabled={weeksAgo === 0}
              className="flex items-center gap-1 px-3 py-2 text-sm hover:bg-gray-50 disabled:opacity-50"
            >
              <Calendar className="h-4 w-4" />
              {weeksAgo === 0 ? '今週' : `${weeksAgo}週前`}
            </button>
            <button
              onClick={handleNextWeek}
              disabled={weeksAgo <= 0}
              className="rounded-r-lg p-2 hover:bg-gray-50 disabled:opacity-50"
              title="次の週"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* Export Buttons */}
          <ReportExportButtons owner={owner} repo={repo} weeksAgo={weeksAgo} />

          {/* Email Form */}
          <ReportEmailForm
            owner={owner}
            repo={repo}
            weeksAgo={weeksAgo}
            isEmailConfigured={isEmailConfigured}
          />
        </div>
      </div>

      {/* Report Summary Card */}
      <WeeklyReportCard report={report} />

      {/* Two Column Layout for Tables */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Security Findings */}
        <SecurityFindingsCard summary={report.securitySummary} />

        {/* Daily Breakdown */}
        <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-200 px-6 py-4">
            <h3 className="text-lg font-semibold text-gray-900">
              日別内訳
            </h3>
          </div>
          <div className="p-6">
            {report.dailyBreakdown.length > 0 ? (
              <div className="space-y-3">
                {report.dailyBreakdown.map((day) => (
                  <div
                    key={day.date}
                    className="flex items-center justify-between rounded-lg bg-gray-50 px-4 py-3"
                  >
                    <span className="text-sm font-medium text-gray-900">
                      {new Date(day.date).toLocaleDateString('ja-JP', {
                        month: 'short',
                        day: 'numeric',
                        weekday: 'short',
                      })}
                    </span>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="text-gray-600">
                        <span className="font-medium text-gray-900">{day.prsAnalyzed}</span> PR
                      </span>
                      <span className="text-gray-600">
                        リスク <span className="font-medium text-gray-900">{day.avgRiskScore}</span>
                      </span>
                      {day.securityFindings > 0 && (
                        <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-800">
                          {day.securityFindings}件検出
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-sm text-gray-500">
                この週の日別データがありません
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Top Risky PRs */}
      <TopRiskyPRsTable prs={report.topRiskyPRs} owner={owner} repo={repo} />
    </div>
  )
}
