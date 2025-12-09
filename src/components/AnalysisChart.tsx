/**
 * Analysis Chart Component
 *
 * Visualizes PR analysis metrics with charts and statistics
 */

import { BarChart3, TrendingUp, AlertCircle, FileCode } from 'lucide-react';
import type { DashboardStats, PRWithAnalysis } from '@/types/dashboard';

interface AnalysisChartProps {
  data: PRWithAnalysis[];
}

export function AnalysisChart({ data }: AnalysisChartProps): React.JSX.Element {
  const stats = calculateStats(data);

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <div className="mb-6 flex items-center gap-2">
        <BarChart3 className="h-6 w-6 text-blue-600" />
        <h2 className="text-xl font-semibold text-gray-900">分析概要</h2>
      </div>

      {/* Stats Grid */}
      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard
          label="総PR数"
          value={stats.total}
          icon={FileCode}
          color="blue"
        />
        <StatCard
          label="オープン"
          value={stats.open}
          icon={TrendingUp}
          color="green"
        />
        <StatCard
          label="マージ済み"
          value={stats.merged}
          icon={TrendingUp}
          color="purple"
        />
        <StatCard
          label="クローズ"
          value={stats.closed}
          icon={TrendingUp}
          color="gray"
        />
        <StatCard
          label="高リスク"
          value={stats.highRisk}
          icon={AlertCircle}
          color="orange"
        />
        <StatCard
          label="クリティカル"
          value={stats.criticalRisk}
          icon={AlertCircle}
          color="red"
        />
      </div>

      {/* Risk Distribution Chart */}
      <div className="mb-4">
        <h3 className="mb-3 text-sm font-semibold text-gray-700">リスク分布</h3>
        <RiskDistributionBar data={data} />
      </div>

      {/* Complexity Distribution Chart */}
      <div>
        <h3 className="mb-3 text-sm font-semibold text-gray-700">
          複雑度分布
        </h3>
        <ComplexityDistributionBar data={data} />
      </div>
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  color: 'blue' | 'green' | 'purple' | 'gray' | 'orange' | 'red';
}

function StatCard({ label, value, icon: Icon, color }: StatCardProps): React.JSX.Element {
  const colorMap = {
    blue: 'text-blue-600 bg-blue-50',
    green: 'text-green-600 bg-green-50',
    purple: 'text-purple-600 bg-purple-50',
    gray: 'text-gray-600 bg-gray-50',
    orange: 'text-orange-600 bg-orange-50',
    red: 'text-red-600 bg-red-50',
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <div className={`mb-2 inline-flex rounded-lg p-2 ${colorMap[color]}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="text-2xl font-bold text-gray-900">{value}</div>
      <div className="text-xs text-gray-500">{label}</div>
    </div>
  );
}

interface RiskDistributionBarProps {
  data: PRWithAnalysis[];
}

function RiskDistributionBar({ data }: RiskDistributionBarProps): React.JSX.Element {
  const counts = {
    low: 0,
    medium: 0,
    high: 0,
    critical: 0,
  };

  data.forEach((item) => {
    counts[item.analysis.risk.risk_level]++;
  });

  const total = data.length || 1;
  const percentages = {
    low: (counts.low / total) * 100,
    medium: (counts.medium / total) * 100,
    high: (counts.high / total) * 100,
    critical: (counts.critical / total) * 100,
  };

  return (
    <div>
      <div className="mb-2 flex h-8 w-full overflow-hidden rounded-lg">
        {percentages.low > 0 && (
          <div
            className="bg-green-500"
            style={{ width: `${percentages.low}%` }}
            title={`低: ${counts.low} (${percentages.low.toFixed(1)}%)`}
          />
        )}
        {percentages.medium > 0 && (
          <div
            className="bg-yellow-500"
            style={{ width: `${percentages.medium}%` }}
            title={`中: ${counts.medium} (${percentages.medium.toFixed(1)}%)`}
          />
        )}
        {percentages.high > 0 && (
          <div
            className="bg-orange-500"
            style={{ width: `${percentages.high}%` }}
            title={`高: ${counts.high} (${percentages.high.toFixed(1)}%)`}
          />
        )}
        {percentages.critical > 0 && (
          <div
            className="bg-red-500"
            style={{ width: `${percentages.critical}%` }}
            title={`クリティカル: ${counts.critical} (${percentages.critical.toFixed(1)}%)`}
          />
        )}
      </div>

      <div className="flex flex-wrap gap-4 text-sm">
        <LegendItem color="bg-green-500" label="低" count={counts.low} />
        <LegendItem color="bg-yellow-500" label="中" count={counts.medium} />
        <LegendItem color="bg-orange-500" label="高" count={counts.high} />
        <LegendItem color="bg-red-500" label="クリティカル" count={counts.critical} />
      </div>
    </div>
  );
}

interface ComplexityDistributionBarProps {
  data: PRWithAnalysis[];
}

function ComplexityDistributionBar({ data }: ComplexityDistributionBarProps): React.JSX.Element {
  const counts = {
    low: 0,
    medium: 0,
    high: 0,
  };

  data.forEach((item) => {
    counts[item.analysis.complexity.complexity_level]++;
  });

  const total = data.length || 1;
  const percentages = {
    low: (counts.low / total) * 100,
    medium: (counts.medium / total) * 100,
    high: (counts.high / total) * 100,
  };

  return (
    <div>
      <div className="mb-2 flex h-8 w-full overflow-hidden rounded-lg">
        {percentages.low > 0 && (
          <div
            className="bg-blue-500"
            style={{ width: `${percentages.low}%` }}
            title={`低: ${counts.low} (${percentages.low.toFixed(1)}%)`}
          />
        )}
        {percentages.medium > 0 && (
          <div
            className="bg-indigo-500"
            style={{ width: `${percentages.medium}%` }}
            title={`中: ${counts.medium} (${percentages.medium.toFixed(1)}%)`}
          />
        )}
        {percentages.high > 0 && (
          <div
            className="bg-purple-500"
            style={{ width: `${percentages.high}%` }}
            title={`高: ${counts.high} (${percentages.high.toFixed(1)}%)`}
          />
        )}
      </div>

      <div className="flex flex-wrap gap-4 text-sm">
        <LegendItem color="bg-blue-500" label="低" count={counts.low} />
        <LegendItem color="bg-indigo-500" label="中" count={counts.medium} />
        <LegendItem color="bg-purple-500" label="高" count={counts.high} />
      </div>
    </div>
  );
}

interface LegendItemProps {
  color: string;
  label: string;
  count: number;
}

function LegendItem({ color, label, count }: LegendItemProps): React.JSX.Element {
  return (
    <div className="flex items-center gap-2">
      <div className={`h-3 w-3 rounded ${color}`} />
      <span className="text-gray-600">
        {label}: <span className="font-semibold text-gray-900">{count}</span>
      </span>
    </div>
  );
}

function calculateStats(data: PRWithAnalysis[]): DashboardStats {
  const stats: DashboardStats = {
    total: data.length,
    open: 0,
    merged: 0,
    closed: 0,
    highRisk: 0,
    criticalRisk: 0,
  };

  data.forEach((item) => {
    // Count PR status
    if (item.pr.state === 'open') {
      stats.open++;
    } else if (item.pr.merged_at) {
      stats.merged++;
    } else {
      stats.closed++;
    }

    // Count risk levels
    if (item.analysis.risk.risk_level === 'high') {
      stats.highRisk++;
    } else if (item.analysis.risk.risk_level === 'critical') {
      stats.criticalRisk++;
    }
  });

  return stats;
}
