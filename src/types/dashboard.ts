/**
 * Dashboard Component Types
 *
 * Type definitions for the PR analysis dashboard components
 */

import type { GitHubPullRequest } from './github';
import type { AnalysisData } from './analysis';

/**
 * PR with Analysis Result
 *
 * Combines GitHub PR data with our analysis results
 */
export interface PRWithAnalysis {
  pr: GitHubPullRequest;
  analysis: AnalysisData;
}

/**
 * Risk Level Type
 */
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

/**
 * PR Status Type
 */
export type PRStatus = 'open' | 'closed' | 'merged';

/**
 * Filter Options
 */
export interface FilterOptions {
  status?: PRStatus | 'all';
  riskLevel?: RiskLevel | 'all';
  search?: string;
}

/**
 * Dashboard Stats
 */
export interface DashboardStats {
  total: number;
  open: number;
  merged: number;
  closed: number;
  highRisk: number;
  criticalRisk: number;
}

/**
 * Chart Data Point
 */
export interface ChartDataPoint {
  label: string;
  value: number;
  color: string;
}

/**
 * Risk Score Visualization
 */
export interface RiskScoreData {
  score: number;
  level: RiskLevel;
  color: string;
  bgColor: string;
  icon: string;
}
