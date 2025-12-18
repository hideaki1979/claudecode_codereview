/**
 * Security Badge Component
 *
 * セキュリティスキャン結果を表示するコンポーネント
 */

import { Shield, ShieldAlert, ShieldCheck, ShieldX } from 'lucide-react';
import type { SecurityMetrics } from '@/lib/analysis/security';

interface SecurityBadgeProps {
  security: SecurityMetrics;
  showDetails?: boolean;
}

interface SecurityLevelConfig {
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bgColor: string;
  borderColor: string;
  label: string;
}

const securityLevelConfig: Record<SecurityMetrics['security_level'], SecurityLevelConfig> = {
  safe: {
    icon: ShieldCheck,
    color: 'text-green-700',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    label: '安全',
  },
  warning: {
    icon: Shield,
    color: 'text-yellow-700',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200',
    label: '注意',
  },
  danger: {
    icon: ShieldAlert,
    color: 'text-orange-700',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
    label: '危険',
  },
  critical: {
    icon: ShieldX,
    color: 'text-red-700',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    label: '重大',
  },
};

export function SecurityBadge({ security, showDetails = false }: SecurityBadgeProps): React.JSX.Element {
  const config = securityLevelConfig[security.security_level];
  const SecurityIcon = config.icon;

  return (
    <div className="space-y-2">
      {/* Security Score Badge */}
      <div
        className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 ${config.bgColor} ${config.borderColor}`}
      >
        <SecurityIcon className={`h-4 w-4 ${config.color}`} />
        <span className={`text-sm font-semibold ${config.color}`}>
          {config.label}: {security.security_score}/100
        </span>
      </div>

      {/* Issue Summary */}
      {security.issue_count > 0 && (
        <div className="flex flex-wrap gap-2 text-xs">
          {security.critical_count > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-red-700">
              <ShieldX className="h-3 w-3" />
              {security.critical_count}
            </span>
          )}
          {security.high_count > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-2 py-0.5 text-orange-700">
              <ShieldAlert className="h-3 w-3" />
              {security.high_count}
            </span>
          )}
          {security.medium_count > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 px-2 py-0.5 text-yellow-700">
              <Shield className="h-3 w-3" />
              {security.medium_count}
            </span>
          )}
          {security.low_count > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-gray-700">
              <Shield className="h-3 w-3" />
              {security.low_count}
            </span>
          )}
        </div>
      )}

      {/* Detailed Issue List */}
      {showDetails && security.issues.length > 0 && (
        <div className="mt-3 rounded-md border border-gray-200 bg-white p-3">
          <h4 className="mb-2 text-sm font-semibold text-gray-700">
            検出されたセキュリティ問題
          </h4>
          <ul className="space-y-2">
            {security.issues.slice(0, 5).map((issue, idx) => (
              <li key={idx} className="text-sm">
                <div className="flex items-start gap-2">
                  <SeverityIndicator severity={issue.severity} />
                  <div>
                    <span className="font-medium text-gray-800">{issue.type}</span>
                    <p className="text-gray-600">{issue.message}</p>
                    <p className="text-xs text-gray-400">
                      {issue.file}
                      {issue.line && `:${issue.line}`}
                    </p>
                  </div>
                </div>
              </li>
            ))}
            {security.issues.length > 5 && (
              <li className="text-sm text-gray-500">
                ...他 {security.issues.length - 5} 件
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

interface SeverityIndicatorProps {
  severity: 'low' | 'medium' | 'high' | 'critical';
}

function SeverityIndicator({ severity }: SeverityIndicatorProps): React.JSX.Element {
  const colors = {
    low: 'bg-gray-400',
    medium: 'bg-yellow-500',
    high: 'bg-orange-500',
    critical: 'bg-red-500',
  };

  return (
    <span
      className={`mt-1.5 h-2 w-2 flex-shrink-0 rounded-full ${colors[severity]}`}
      title={severity}
    />
  );
}

/**
 * Compact version for list views
 */
export function SecurityBadgeCompact({ security }: { security: SecurityMetrics }): React.JSX.Element {
  const config = securityLevelConfig[security.security_level];
  const SecurityIcon = config.icon;

  return (
    <div
      className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-1 ${config.bgColor} ${config.borderColor}`}
      title={`セキュリティスコア: ${security.security_score}/100 (${security.issue_count}件の問題)`}
    >
      <SecurityIcon className={`h-3.5 w-3.5 ${config.color}`} />
      <span className={`text-xs font-medium ${config.color}`}>
        {security.security_score}
      </span>
    </div>
  );
}

/**
 * Security Level Badge for footer display
 */
export type SecurityLevel = 'safe' | 'warning' | 'danger' | 'critical';

interface SecurityLevelBadgeProps {
  level: SecurityLevel;
}

export function SecurityLevelBadge({ level }: SecurityLevelBadgeProps): React.JSX.Element {
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
