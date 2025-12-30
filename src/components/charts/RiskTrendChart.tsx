'use client'

/**
 * Risk Trend Chart Component
 *
 * Displays daily risk score trends using a line chart.
 * Shows average, max, and min risk scores over time.
 */

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import type { DailyRiskTrend } from '@/lib/db/trends'

interface RiskTrendChartProps {
  data: DailyRiskTrend[]
  isLoading?: boolean
}

export function RiskTrendChart({
  data,
  isLoading = false,
}: RiskTrendChartProps): React.JSX.Element {
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

  // Format date for display
  const formattedData = data.map((item) => ({
    ...item,
    displayDate: new Date(item.date).toLocaleDateString('ja-JP', {
      month: 'short',
      day: 'numeric',
    }),
  }))

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={formattedData}
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="displayDate"
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
              name === 'avgRiskScore'
                ? '平均リスク'
                : name === 'maxRiskScore'
                  ? '最大リスク'
                  : '最小リスク',
            ]}
            labelFormatter={(label) => `日付: ${label}`}
          />
          <Legend
            formatter={(value) =>
              value === 'avgRiskScore'
                ? '平均リスク'
                : value === 'maxRiskScore'
                  ? '最大リスク'
                  : '最小リスク'
            }
          />
          <Line
            type="monotone"
            dataKey="avgRiskScore"
            stroke="#ef4444"
            strokeWidth={2}
            dot={{ fill: '#ef4444', r: 3 }}
            activeDot={{ r: 5 }}
          />
          <Line
            type="monotone"
            dataKey="maxRiskScore"
            stroke="#f97316"
            strokeWidth={1}
            strokeDasharray="5 5"
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="minRiskScore"
            stroke="#22c55e"
            strokeWidth={1}
            strokeDasharray="5 5"
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
