'use client'

/**
 * Security Trend Chart Component
 *
 * Displays daily security finding trends using a stacked area chart.
 * Shows count of findings by severity level (critical, high, medium, low).
 */

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import type { DailySecurityTrend } from '@/lib/db/trends'

interface SecurityTrendChartProps {
  data: DailySecurityTrend[]
  isLoading?: boolean
}

export function SecurityTrendChart({
  data,
  isLoading = false,
}: SecurityTrendChartProps): React.JSX.Element {
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
        <p className="text-gray-500">セキュリティ検出データがありません</p>
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
        <AreaChart
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
          <YAxis stroke="#6b7280" fontSize={12} tickLine={false} />
          <Tooltip
            contentStyle={{
              backgroundColor: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            }}
            formatter={(value, name) => {
              const nameMap ={
                'criticalCount': 'クリティカル',
                'highCount': '高',
                'mediumCount': '中',
                'lowCount': '低',
              };
              const displayName = nameMap[name as keyof typeof nameMap] || String(name);
              return [typeof value === 'number' ? value : 0, displayName];
            }}
            labelFormatter={(label) => `日付: ${label}`}
          />
          <Legend
            formatter={(value) =>
              value === 'criticalCount'
                ? 'クリティカル'
                : value === 'highCount'
                  ? '高'
                  : value === 'mediumCount'
                    ? '中'
                    : '低'
            }
          />
          <Area
            type="monotone"
            dataKey="lowCount"
            stackId="1"
            stroke="#22c55e"
            fill="#bbf7d0"
          />
          <Area
            type="monotone"
            dataKey="mediumCount"
            stackId="1"
            stroke="#eab308"
            fill="#fef08a"
          />
          <Area
            type="monotone"
            dataKey="highCount"
            stackId="1"
            stroke="#f97316"
            fill="#fed7aa"
          />
          <Area
            type="monotone"
            dataKey="criticalCount"
            stackId="1"
            stroke="#ef4444"
            fill="#fecaca"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
