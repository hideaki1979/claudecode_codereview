/**
 * Utility Functions
 *
 * Common helper functions for the dashboard
 */

import type { PRWithAnalysis } from '@/types/dashboard';

/**
 * Format a number with commas for thousands
 */
export function formatNumber(num: number): string {
  return num.toLocaleString();
}

/**
 * Truncate text to a maximum length with ellipsis
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + '...';
}

/**
 * Get risk color based on risk level
 */
export function getRiskColor(level: string): string {
  const colors: Record<string, string> = {
    low: 'text-green-600',
    medium: 'text-yellow-600',
    high: 'text-orange-600',
    critical: 'text-red-600',
  };
  return colors[level] || 'text-gray-600';
}

/**
 * Calculate percentage
 */
export function calculatePercentage(value: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((value / total) * 100);
}

/**
 * Sort PRs by risk score (descending)
 */
export function sortByRiskScore(data: PRWithAnalysis[]): PRWithAnalysis[] {
  return [...data].sort(
    (a, b) => b.analysis.risk.risk_score - a.analysis.risk.risk_score
  );
}

/**
 * Sort PRs by date (newest first)
 */
export function sortByDate(data: PRWithAnalysis[]): PRWithAnalysis[] {
  return [...data].sort(
    (a, b) =>
      new Date(b.pr.created_at).getTime() - new Date(a.pr.created_at).getTime()
  );
}

/**
 * Get status badge color
 */
export function getStatusColor(
  state: string,
  mergedAt: string | null
): string {
  if (state === 'open') return 'bg-green-100 text-green-800';
  if (mergedAt) return 'bg-purple-100 text-purple-800';
  return 'bg-gray-100 text-gray-800';
}
