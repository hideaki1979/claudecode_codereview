/**
 * PR Card Component
 *
 * Displays a Pull Request with analysis results
 */

import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  GitPullRequest,
  ExternalLink,
  User,
  Clock,
} from 'lucide-react';
import type { PRWithAnalysis, RiskLevel } from '@/types/dashboard';
import { ja } from 'date-fns/locale';
import { SecurityBadge } from './SecurityBadge';

interface PRCardProps {
  data: PRWithAnalysis;
}

interface RiskConfig {
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bgColor: string;
  borderColor: string;
  label: string;
}

const riskConfig: Record<RiskLevel, RiskConfig> = {
  low: {
    icon: CheckCircle2,
    color: 'text-green-700',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    label: '低リスク',
  },
  medium: {
    icon: AlertTriangle,
    color: 'text-yellow-700',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200',
    label: '中リスク',
  },
  high: {
    icon: AlertTriangle,
    color: 'text-orange-700',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
    label: '高リスク',
  },
  critical: {
    icon: AlertCircle,
    color: 'text-red-700',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    label: 'クリティカル',
  },
};

export function PRCard({ data }: PRCardProps): React.JSX.Element {
  const { pr, analysis } = data;
  const config = riskConfig[analysis.risk.risk_level];
  const RiskIcon = config.icon;

  const statusColor =
    pr.state === 'open'
      ? 'text-green-600'
      : pr.merged_at
        ? 'text-purple-600'
        : 'text-gray-600';

  const statusLabel = pr.state === 'open' ? 'オープン' : pr.merged_at ? 'マージ済み' : 'クローズ';

  return (
    <article
      className={`rounded-lg border-2 ${config.borderColor} ${config.bgColor} p-6 transition-all hover:shadow-lg`}
    >
      {/* Header */}
      <div className="mb-4 flex items-start justify-between">
        <div className="flex-1">
          <div className="mb-2 flex items-center gap-2">
            <GitPullRequest className={`h-5 w-5 ${statusColor}`} />
            <span className={`text-sm font-medium ${statusColor}`}>
              #{pr.number} • {statusLabel}
            </span>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 line-clamp-2">
            {pr.title}
          </h3>
        </div>

        {/* Risk Badge */}
        <div
          className={`ml-4 flex items-center gap-2 rounded-full ${config.bgColor} ${config.borderColor} border px-4 py-2`}
        >
          <RiskIcon className={`h-5 w-5 ${config.color}`} />
          <span className={`text-sm font-semibold ${config.color}`}>
            {config.label}
          </span>
        </div>
      </div>

      {/* Metadata */}
      <div className="mb-4 flex flex-wrap items-center gap-4 text-sm text-gray-600">
        <div className="flex items-center gap-1">
          <User className="h-4 w-4" />
          <span>{pr.user.login}</span>
        </div>
        <div className="flex items-center gap-1">
          <Clock className="h-4 w-4" />
          <span>{formatDistanceToNow(new Date(pr.created_at), { addSuffix: true, locale: ja })}</span>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="mb-4 grid grid-cols-2 gap-4 sm:grid-cols-5">
        <MetricItem
          label="リスクスコア"
          value={analysis.risk.risk_score}
          suffix="/100"
        />
        <MetricItem
          label="複雑度"
          value={analysis.complexity.complexity_score}
          suffix="/100"
        />
        <MetricItem
          label="セキュリティ"
          value={analysis.security.security_score}
          suffix="/100"
        />
        <MetricItem
          label="変更ファイル"
          value={analysis.complexity.files_changed}
        />
        <MetricItem
          label="変更行数"
          value={analysis.complexity.lines_changed}
        />
      </div>

      {/* Security Issues */}
      {analysis.security.issue_count > 0 && (
        <div className="mb-4">
          <SecurityBadge security={analysis.security} showDetails={true} />
        </div>
      )}

      {/* Recommendations */}
      {analysis.risk.recommendations.length > 0 && (
        <div className="mb-4 rounded-md bg-white p-3 border border-gray-200">
          <h4 className="mb-2 text-sm font-semibold text-gray-700">
            推奨事項
          </h4>
          <ul className="space-y-1">
            {analysis.risk.recommendations.map((rec, idx) => (
              <li key={idx} className="text-sm text-gray-600 flex items-start gap-2">
                <span className="text-gray-400 mt-1">•</span>
                <span>{rec}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between border-t border-gray-200 pt-4">
        <div className="flex gap-2 text-xs text-gray-500">
          <span className="rounded-full bg-blue-100 px-2 py-1 text-blue-700">
            {analysis.complexity.complexity_level.toUpperCase()}
          </span>
          <span className="rounded-full bg-purple-100 px-2 py-1 text-purple-700">
            {analysis.impact.impact_level.toUpperCase()}
          </span>
          <SecurityLevelBadge level={analysis.security.security_level} />
        </div>
        <Link
          href={pr.html_url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors"
        >
          GitHubで表示
          <ExternalLink className="h-4 w-4" />
        </Link>
      </div>
    </article>
  );
}

interface MetricItemProps {
  label: string;
  value: number;
  suffix?: string;
}

function MetricItem({ label, value, suffix = '' }: MetricItemProps): React.JSX.Element {
  return (
    <div className="rounded-md bg-white p-3 border border-gray-200">
      <div className="text-xs text-gray-500 mb-1">{label}</div>
      <div className="text-lg font-semibold text-gray-900">
        {value}
        {suffix && <span className="text-sm text-gray-500">{suffix}</span>}
      </div>
    </div>
  );
}

interface SecurityLevelBadgeProps {
  level: 'safe' | 'warning' | 'danger' | 'critical';
}

function SecurityLevelBadge({ level }: SecurityLevelBadgeProps): React.JSX.Element {
  const config = {
    safe: { bg: 'bg-green-100', text: 'text-green-700', label: 'SAFE' },
    warning: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'WARNING' },
    danger: { bg: 'bg-orange-100', text: 'text-orange-700', label: 'DANGER' },
    critical: { bg: 'bg-red-100', text: 'text-red-700', label: 'CRITICAL' },
  };

  const { bg, text, label } = config[level];

  return (
    <span className={`rounded-full ${bg} px-2 py-1 ${text}`}>
      {label}
    </span>
  );
}
