/**
 * Security Findings Card Component
 *
 * Displays security findings summary with severity distribution.
 */

import { Shield, AlertOctagon, AlertTriangle, AlertCircle, Info } from 'lucide-react'
import type { WeeklySecuritySummary } from '@/lib/db/reports'

interface SecurityFindingsCardProps {
  summary: WeeklySecuritySummary
}

export function SecurityFindingsCard({
  summary,
}: SecurityFindingsCardProps): React.JSX.Element {
  const severityItems = [
    {
      label: 'Critical',
      count: summary.criticalCount,
      icon: AlertOctagon,
      bgColor: 'bg-red-100',
      textColor: 'text-red-800',
      iconColor: 'text-red-600',
    },
    {
      label: 'High',
      count: summary.highCount,
      icon: AlertTriangle,
      bgColor: 'bg-orange-100',
      textColor: 'text-orange-800',
      iconColor: 'text-orange-600',
    },
    {
      label: 'Medium',
      count: summary.mediumCount,
      icon: AlertCircle,
      bgColor: 'bg-yellow-100',
      textColor: 'text-yellow-800',
      iconColor: 'text-yellow-600',
    },
    {
      label: 'Low',
      count: summary.lowCount,
      icon: Info,
      bgColor: 'bg-blue-100',
      textColor: 'text-blue-800',
      iconColor: 'text-blue-600',
    },
  ]

  return (
    <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-gray-200 px-6 py-4">
        <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
          <Shield className="h-5 w-5 text-red-500" />
          セキュリティ検出サマリー
        </h3>
      </div>

      <div className="p-6">
        {/* Severity Distribution */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {severityItems.map((item) => (
            <div
              key={item.label}
              className={`rounded-lg ${item.bgColor} p-3 text-center`}
            >
              <item.icon className={`mx-auto h-5 w-5 ${item.iconColor}`} />
              <div className={`mt-1 text-2xl font-bold ${item.textColor}`}>
                {item.count}
              </div>
              <div className={`text-xs ${item.textColor}`}>{item.label}</div>
            </div>
          ))}
        </div>

        {/* Top Finding Types */}
        {summary.topFindingTypes.length > 0 && (
          <div className="mt-6">
            <h4 className="mb-3 text-sm font-semibold text-gray-700">
              主な検出タイプ
            </h4>
            <div className="space-y-2">
              {summary.topFindingTypes.map((type) => {
                const percentage = summary.totalFindings > 0
                  ? Math.round((type.count / summary.totalFindings) * 100)
                  : 0
                return (
                  <div key={type.type} className="flex items-center gap-3">
                    <span className="min-w-32 text-sm text-gray-700">
                      {type.type}
                    </span>
                    <div className="flex-1">
                      <div className="h-2 rounded-full bg-gray-200">
                        <div
                          className="h-2 rounded-full bg-red-500"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                    <span className="min-w-12 text-right text-sm font-medium text-gray-900">
                      {type.count}件
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {summary.totalFindings === 0 && (
          <div className="mt-4 text-center text-sm text-gray-500">
            この週にセキュリティ検出はありません
          </div>
        )}
      </div>
    </div>
  )
}
