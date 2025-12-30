'use client'

/**
 * Complexity Trend Chart Component
 *
 * Displays weekly complexity score trends using a bar chart.
 * Shows average and max complexity scores per week.
 */

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import type { WeeklyComplexityTrend } from '@/lib/db/trends'

interface ComplexityTrendChartProps {
  data: WeeklyComplexityTrend[]
  isLoading?: boolean
}

export function ComplexityTrendChart({
  data,
  isLoading = false,
}: ComplexityTrendChartProps): React.JSX.Element {
  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center rounded-lg border border-gray-200 bg-gray-50">
        <div className="flex items-center gap-2 text-gray-500">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-400 border-t-transparent" />
          読み込み中...
        </div>
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-lg border border-gray-200 bg-gray-50">
        <p className="text-gray-500">データがありません</p>
      </div>
    )
  }

  // Format week start date for display
  const formattedData = data.map((item) => ({
    ...item,
    displayWeek: new Date(item.weekStart).toLocaleDateString('ja-JP', {
      month: 'short',
      day: 'numeric',
    }),
  }))

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={formattedData}
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="displayWeek"
            stroke="#6b7280"
            fontSize={12}
            tickLine={false}
          />
          <YAxis
            domain={[0, 100]}
            stroke="#6b7280"
            fontSize={12}
            tickLine={false}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            }}
            formatter={(value, name) => [
              typeof value === 'number' ? value.toFixed(1) : '-',
              name === 'avgComplexityScore'
                ? '平均複雑度'
                : name === 'maxComplexityScore'
                  ? '最大複雑度'
                  : name === 'prCount'
                    ? 'PR数'
                    : String(name ?? ''),
            ]}
            labelFormatter={(label) => `週: ${label}〜`}
          />
          <Legend
            formatter={(value) =>
              value === 'avgComplexityScore'
                ? '平均複雑度'
                : value === 'maxComplexityScore'
                  ? '最大複雑度'
                  : 'PR数'
            }
          />
          <Bar
            dataKey="avgComplexityScore"
            fill="#6366f1"
            radius={[4, 4, 0, 0]}
          />
          <Bar
            dataKey="maxComplexityScore"
            fill="#a5b4fc"
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
