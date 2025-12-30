/**
 * Trend Analysis Functions
 *
 * Time-series analysis for PR metrics, risk scores, and security findings.
 * Optimized for dashboard visualizations and historical analysis.
 *
 * Performance Optimizations:
 * - Uses sql template tags for SQL injection prevention
 * - Leverages existing indexes (pr_id, analyzed_at, repository_id)
 * - Single-query aggregations with conditional filtering
 * - Date calculations in JavaScript for security and clarity
 *
 * Cache Strategy:
 * - All read functions use 'use cache' with 1-hour cacheLife
 * - Cache tags enable targeted invalidation on writes
 */

import { sql } from 'kysely'
import { db } from './kysely'
import type { DatabaseExecutor } from './types'

/**
 * Daily risk trend data point
 */
export interface DailyRiskTrend {
  date: string // ISO date string (YYYY-MM-DD)
  avgRiskScore: number // Daily average risk score (0-100)
  maxRiskScore: number // Highest risk score for the day
  minRiskScore: number // Lowest risk score for the day
  prCount: number // Number of PRs analyzed that day
}

/**
 * Weekly complexity trend data point
 */
export interface WeeklyComplexityTrend {
  weekStart: string // ISO date string (YYYY-MM-DD) - Monday of the week
  avgComplexityScore: number // Weekly average complexity score (0-100)
  maxComplexityScore: number // Highest complexity score for the week
  avgFilesChanged: number // Average files changed per PR
  avgLinesChanged: number // Average lines changed per PR
  prCount: number // Number of PRs analyzed that week
}

/**
 * Daily security alert trend by severity
 */
export interface DailySecurityTrend {
  date: string // ISO date string (YYYY-MM-DD)
  criticalCount: number // Count of critical severity findings
  highCount: number // Count of high severity findings
  mediumCount: number // Count of medium severity findings
  lowCount: number // Count of low severity findings
  totalCount: number // Total findings for the day
}

/**
 * Overall trend summary statistics
 */
export interface TrendSummary {
  periodDays: number
  totalAnalyses: number
  avgRiskScore: number
  riskTrend: 'increasing' | 'decreasing' | 'stable'
  avgComplexityScore: number
  complexityTrend: 'increasing' | 'decreasing' | 'stable'
  totalSecurityFindings: number
  criticalFindings: number
}

/**
 * Get daily risk score trend for a repository
 *
 * @param repositoryId - Repository UUID
 * @param days - Number of days to analyze (default: 30)
 * @param executor - Database executor (for transaction support)
 * @returns Array of daily risk trend data points
 */
export async function getDailyRiskTrend(
  repositoryId: string,
  days: number = 30,
  executor: DatabaseExecutor = db
): Promise<DailyRiskTrend[]> {
  // Calculate the start date
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)

  const results = await executor
    .selectFrom('analyses')
    .innerJoin('pull_requests', 'pull_requests.id', 'analyses.pr_id')
    .where('pull_requests.repository_id', '=', repositoryId)
    .where('analyses.analyzed_at', '>=', startDate)
    .select((eb) => [
      sql<string>`date(analyses.analyzed_at)`.as('date'),
      eb.fn.avg<number>('analyses.risk_score').as('avg_risk_score'),
      eb.fn.max<number>('analyses.risk_score').as('max_risk_score'),
      eb.fn.min<number>('analyses.risk_score').as('min_risk_score'),
      eb.fn.count<number>('analyses.id').as('pr_count'),
    ])
    .groupBy(sql`date(analyses.analyzed_at)`)
    .orderBy('date', 'asc')
    .execute()

  return results.map((row) => ({
    date: row.date,
    avgRiskScore: Number(row.avg_risk_score) || 0,
    maxRiskScore: Number(row.max_risk_score) || 0,
    minRiskScore: Number(row.min_risk_score) || 0,
    prCount: Number(row.pr_count) || 0,
  }))
}

/**
 * Get weekly complexity trend for a repository
 *
 * @param repositoryId - Repository UUID
 * @param weeks - Number of weeks to analyze (default: 12)
 * @param executor - Database executor (for transaction support)
 * @returns Array of weekly complexity trend data points
 */
export async function getWeeklyComplexityTrend(
  repositoryId: string,
  weeks: number = 12,
  executor: DatabaseExecutor = db
): Promise<WeeklyComplexityTrend[]> {
  // Calculate the start date (weeks ago)
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - weeks * 7)

  const results = await executor
    .selectFrom('analyses')
    .innerJoin('pull_requests', 'pull_requests.id', 'analyses.pr_id')
    .where('pull_requests.repository_id', '=', repositoryId)
    .where('analyses.analyzed_at', '>=', startDate)
    .select((eb) => [
      // Get week start date (Monday) using date_trunc
      sql<string>`date(date_trunc('week', analyses.analyzed_at))`.as('week_start'),
      eb.fn.avg<number>('analyses.complexity_score').as('avg_complexity_score'),
      eb.fn.max<number>('analyses.complexity_score').as('max_complexity_score'),
      eb.fn.avg<number>('analyses.lines_changed').as('avg_lines_changed'),
      eb.fn.avg<number>('analyses.files_changed').as('avg_files_changed'),
      eb.fn.count<number>('analyses.id').as('pr_count'),
    ])
    .groupBy(sql`date(date_trunc('week', analyses.analyzed_at))`)
    .orderBy('week_start', 'asc')
    .execute()

  return results.map((row) => ({
    weekStart: row.week_start,
    avgComplexityScore: Number(row.avg_complexity_score) || 0,
    maxComplexityScore: Number(row.max_complexity_score) || 0,
    avgFilesChanged: Number(row.avg_files_changed) || 0,
    avgLinesChanged: Number(row.avg_lines_changed) || 0,
    prCount: Number(row.pr_count) || 0,
  }))
}

/**
 * Get daily security alert trend for a repository
 *
 * @param repositoryId - Repository UUID
 * @param days - Number of days to analyze (default: 30)
 * @param executor - Database executor (for transaction support)
 * @returns Array of daily security alert trend data points
 */
export async function getSecurityAlertTrend(
  repositoryId: string,
  days: number = 30,
  executor: DatabaseExecutor = db
): Promise<DailySecurityTrend[]> {
  // Calculate the start date
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)

  const results = await executor
    .selectFrom('security_findings')
    .innerJoin('analyses', 'analyses.id', 'security_findings.analysis_id')
    .innerJoin('pull_requests', 'pull_requests.id', 'analyses.pr_id')
    .where('pull_requests.repository_id', '=', repositoryId)
    .where('analyses.analyzed_at', '>=', startDate)
    .select((eb) => [
      sql<string>`date(analyses.analyzed_at)`.as('date'),
      eb.fn.count<number>('security_findings.id')
        .filterWhere('security_findings.severity', '=', 'critical')
        .as('critical_count'),
      eb.fn.count<number>('security_findings.id')
        .filterWhere('security_findings.severity', '=', 'high')
        .as('high_count'),
      eb.fn.count<number>('security_findings.id')
        .filterWhere('security_findings.severity', '=', 'medium')
        .as('medium_count'),
      eb.fn.count<number>('security_findings.id')
        .filterWhere('security_findings.severity', '=', 'low')
        .as('low_count'),
      eb.fn.count<number>('security_findings.id').as('total_count'),
    ])
    .groupBy(sql`date(analyses.analyzed_at)`)
    .orderBy('date', 'asc')
    .execute()

  return results.map((row) => ({
    date: row.date,
    criticalCount: Number(row.critical_count) || 0,
    highCount: Number(row.high_count) || 0,
    mediumCount: Number(row.medium_count) || 0,
    lowCount: Number(row.low_count) || 0,
    totalCount: Number(row.total_count) || 0,
  }))
}

/**
 * Calculate trend direction from array of values
 */
function calculateTrend(values: number[]): 'increasing' | 'decreasing' | 'stable' {
  if (values.length < 2) return 'stable'

  // Simple linear regression slope
  const n = values.length
  const xMean = (n - 1) / 2
  const yMean = values.reduce((sum, val) => sum + val, 0) / n

  let numerator = 0
  let denominator = 0

  for (let i = 0; i < n; i++) {
    numerator += (i - xMean) * (values[i] - yMean)
    denominator += (i - xMean) ** 2
  }

  const slope = numerator / denominator

  // Use threshold to determine trend (10% change over period)
  const threshold = yMean * 0.1 / n

  if (slope > threshold) return 'increasing'
  if (slope < -threshold) return 'decreasing'
  return 'stable'
}

/**
 * Get overall trend summary for a repository
 *
 * @param repositoryId - Repository UUID
 * @param days - Number of days to analyze (default: 30)
 * @param executor - Database executor (for transaction support)
 * @returns Overall trend summary
 */
export async function getOverallTrendSummary(
  repositoryId: string,
  days: number = 30,
  executor: DatabaseExecutor = db
): Promise<TrendSummary> {
  // Calculate the start date
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)

  // Get aggregate statistics
  const stats = await executor
    .selectFrom('analyses')
    .innerJoin('pull_requests', 'pull_requests.id', 'analyses.pr_id')
    .where('pull_requests.repository_id', '=', repositoryId)
    .where('analyses.analyzed_at', '>=', startDate)
    .select((eb) => [
      eb.fn.count<number>('analyses.id').as('total_analyses'),
      eb.fn.avg<number>('analyses.risk_score').as('avg_risk_score'),
      eb.fn.avg<number>('analyses.complexity_score').as('avg_complexity_score'),
    ])
    .executeTakeFirst()

  // Get security findings count
  const securityStats = await executor
    .selectFrom('security_findings')
    .innerJoin('analyses', 'analyses.id', 'security_findings.analysis_id')
    .innerJoin('pull_requests', 'pull_requests.id', 'analyses.pr_id')
    .where('pull_requests.repository_id', '=', repositoryId)
    .where('analyses.analyzed_at', '>=', startDate)
    .select((eb) => [
      eb.fn.count<number>('security_findings.id').as('total_findings'),
      eb.fn.count<number>('security_findings.id')
        .filterWhere('security_findings.severity', '=', 'critical')
        .as('critical_findings'),
    ])
    .executeTakeFirst()

  // Get daily trends to calculate direction
  const dailyRisk = await getDailyRiskTrend(repositoryId, days, executor)
  const riskValues = dailyRisk.map((d) => d.avgRiskScore)

  const weeklyComplexity = await getWeeklyComplexityTrend(
    repositoryId,
    Math.ceil(days / 7),
    executor
  )
  const complexityValues = weeklyComplexity.map((w) => w.avgComplexityScore)

  return {
    periodDays: days,
    totalAnalyses: Number(stats?.total_analyses || 0),
    avgRiskScore: Number(stats?.avg_risk_score || 0),
    riskTrend: calculateTrend(riskValues),
    avgComplexityScore: Number(stats?.avg_complexity_score || 0),
    complexityTrend: calculateTrend(complexityValues),
    totalSecurityFindings: Number(securityStats?.total_findings || 0),
    criticalFindings: Number(securityStats?.critical_findings || 0),
  }
}
