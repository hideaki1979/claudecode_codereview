/**
 * Top Risky PRs Table Component
 *
 * Displays a table of the top risky PRs for the week.
 */

import { AlertTriangle, ExternalLink } from 'lucide-react'
import type { TopRiskyPR } from '@/lib/db/reports'

interface TopRiskyPRsTableProps {
  prs: TopRiskyPR[]
  owner: string
  repo: string
}

export function TopRiskyPRsTable({
  prs,
  owner,
  repo,
}: TopRiskyPRsTableProps): React.JSX.Element {
  const getRiskBadgeColor = (level: string) => {
    switch (level) {
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      default:
        return 'bg-green-100 text-green-800 border-green-200'
    }
  }

  if (prs.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-6 text-center shadow-sm">
        <AlertTriangle className="mx-auto h-8 w-8 text-gray-400" />
        <p className="mt-2 text-sm text-gray-500">
          この週にリスクの高いPRはありません
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-gray-200 px-6 py-4">
        <h3 className="text-lg font-semibold text-gray-900">
          <AlertTriangle className="mr-2 inline-block h-5 w-5 text-orange-500" />
          リスクの高いPR (Top 5)
        </h3>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                PR
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                リスク
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                複雑度
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                セキュリティ検出
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                分析日
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {prs.map((pr, index) => (
              <tr key={`${pr.prNumber}-${pr.analyzedAt}-${index}`} className="hover:bg-gray-50">
                <td className="whitespace-nowrap px-6 py-4">
                  <a
                    href={`https://github.com/${owner}/${repo}/pull/${pr.prNumber}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-start gap-2"
                  >
                    <span className="font-medium text-gray-900">
                      #{pr.prNumber}
                    </span>
                    <span className="max-w-xs truncate text-sm text-gray-600 group-hover:text-blue-600">
                      {pr.prTitle}
                    </span>
                    <ExternalLink className="h-3 w-3 text-gray-400 opacity-0 group-hover:opacity-100" />
                  </a>
                </td>
                <td className="whitespace-nowrap px-6 py-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900">
                      {pr.riskScore}
                    </span>
                    <span
                      className={`rounded-full border px-2 py-0.5 text-xs font-medium ${getRiskBadgeColor(pr.riskLevel)}`}
                    >
                      {pr.riskLevel}
                    </span>
                  </div>
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-600">
                  {pr.complexityScore}
                </td>
                <td className="whitespace-nowrap px-6 py-4">
                  {pr.securityFindings > 0 ? (
                    <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800">
                      {pr.securityFindings}件
                    </span>
                  ) : (
                    <span className="text-sm text-gray-400">-</span>
                  )}
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-600">
                  {new Date(pr.analyzedAt).toLocaleDateString('ja-JP')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
