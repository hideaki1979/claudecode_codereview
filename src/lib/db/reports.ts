/**
 * Weekly Report Generation Functions
 *
 * Functions for generating comprehensive weekly analysis reports.
 * Aggregates PR analysis data, security findings, and metrics for reporting.
 *
 * Performance Optimizations:
 * - Uses sql template tags for SQL injection prevention
 * - Parallel query execution for independent data fetches
 * - Efficient aggregations with conditional filtering
 */

import { sql } from 'kysely'
import { db } from './kysely'
import type { DatabaseExecutor } from './types'

/**
 * Weekly report summary data
 */
export interface WeeklyReportSummary {
  reportId: string
  repositoryOwner: string
  repositoryName: string
  weekStart: string
  weekEnd: string
  generatedAt: string
}

/**
 * PR analysis summary for the week
 */
export interface WeeklyPRSummary {
  totalPRsAnalyzed: number
  avgRiskScore: number
  avgComplexityScore: number
  avgSecurityScore: number
  totalLinesChanged: number
  totalFilesChanged: number
  riskDistribution: {
    low: number
    medium: number
    high: number
    critical: number
  }
  complexityDistribution: {
    low: number
    medium: number
    high: number
  }
}

/**
 * Security findings summary for the week
 */
export interface WeeklySecuritySummary {
  totalFindings: number
  criticalCount: number
  highCount: number
  mediumCount: number
  lowCount: number
  topFindingTypes: Array<{
    type: string
    count: number
  }>
}

/**
 * Top risky PRs for the week
 */
export interface TopRiskyPR {
  prNumber: number
  prTitle: string
  riskScore: number
  riskLevel: string
  complexityScore: number
  securityFindings: number
  analyzedAt: string
}

/**
 * Day-by-day analysis breakdown
 */
export interface DailyBreakdown {
  date: string
  prsAnalyzed: number
  avgRiskScore: number
  securityFindings: number
}

/**
 * Complete weekly report data
 */
export interface WeeklyReport {
  summary: WeeklyReportSummary
  prSummary: WeeklyPRSummary
  securitySummary: WeeklySecuritySummary
  topRiskyPRs: TopRiskyPR[]
  dailyBreakdown: DailyBreakdown[]
  comparisonWithPreviousWeek: {
    riskScoreChange: number
    complexityChange: number
    securityFindingsChange: number
    prCountChange: number
  }
}

/**
 * Calculate week start and end dates
 */
function getWeekBounds(weeksAgo: number = 0): { weekStart: Date; weekEnd: Date } {
  const now = new Date()
  // Get Monday of the specified week
  const dayOfWeek = now.getDay()
  const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1

  const weekStart = new Date(now)
  weekStart.setDate(now.getDate() - daysToMonday - weeksAgo * 7)
  weekStart.setHours(0, 0, 0, 0)

  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekStart.getDate() + 6)
  weekEnd.setHours(23, 59, 59, 999)

  return { weekStart, weekEnd }
}

/**
 * Generate UUID for report
 */
function generateReportId(): string {
  return crypto.randomUUID();
}

/**
 * Get weekly PR summary statistics
 */
async function getWeeklyPRSummary(
  repositoryId: string,
  weekStart: Date,
  weekEnd: Date,
  executor: DatabaseExecutor
): Promise<WeeklyPRSummary> {
  const [stats, riskDist, complexityDist] = await Promise.all([
    // Aggregate statistics
    executor
      .selectFrom('analyses')
      .innerJoin('pull_requests', 'pull_requests.id', 'analyses.pr_id')
      .where('pull_requests.repository_id', '=', repositoryId)
      .where('analyses.analyzed_at', '>=', weekStart)
      .where('analyses.analyzed_at', '<=', weekEnd)
      .select((eb) => [
        eb.fn.count<number>('analyses.id').as('total_prs'),
        eb.fn.avg<number>('analyses.risk_score').as('avg_risk'),
        eb.fn.avg<number>('analyses.complexity_score').as('avg_complexity'),
        eb.fn.avg<number>('analyses.security_score').as('avg_security'),
        eb.fn.sum<number>('analyses.lines_changed').as('total_lines'),
        eb.fn.sum<number>('analyses.files_changed').as('total_files'),
      ])
      .executeTakeFirst(),

    // Risk level distribution
    executor
      .selectFrom('analyses')
      .innerJoin('pull_requests', 'pull_requests.id', 'analyses.pr_id')
      .where('pull_requests.repository_id', '=', repositoryId)
      .where('analyses.analyzed_at', '>=', weekStart)
      .where('analyses.analyzed_at', '<=', weekEnd)
      .select((eb) => [
        eb.fn.count<number>('analyses.id')
          .filterWhere('analyses.risk_level', '=', 'low')
          .as('low'),
        eb.fn.count<number>('analyses.id')
          .filterWhere('analyses.risk_level', '=', 'medium')
          .as('medium'),
        eb.fn.count<number>('analyses.id')
          .filterWhere('analyses.risk_level', '=', 'high')
          .as('high'),
        eb.fn.count<number>('analyses.id')
          .filterWhere('analyses.risk_level', '=', 'critical')
          .as('critical'),
      ])
      .executeTakeFirst(),

    // Complexity level distribution
    executor
      .selectFrom('analyses')
      .innerJoin('pull_requests', 'pull_requests.id', 'analyses.pr_id')
      .where('pull_requests.repository_id', '=', repositoryId)
      .where('analyses.analyzed_at', '>=', weekStart)
      .where('analyses.analyzed_at', '<=', weekEnd)
      .select((eb) => [
        eb.fn.count<number>('analyses.id')
          .filterWhere('analyses.complexity_level', '=', 'low')
          .as('low'),
        eb.fn.count<number>('analyses.id')
          .filterWhere('analyses.complexity_level', '=', 'medium')
          .as('medium'),
        eb.fn.count<number>('analyses.id')
          .filterWhere('analyses.complexity_level', '=', 'high')
          .as('high'),
      ])
      .executeTakeFirst(),
  ])

  return {
    totalPRsAnalyzed: Number(stats?.total_prs || 0),
    avgRiskScore: Math.round(Number(stats?.avg_risk || 0) * 10) / 10,
    avgComplexityScore: Math.round(Number(stats?.avg_complexity || 0) * 10) / 10,
    avgSecurityScore: Math.round(Number(stats?.avg_security || 0) * 10) / 10,
    totalLinesChanged: Number(stats?.total_lines || 0),
    totalFilesChanged: Number(stats?.total_files || 0),
    riskDistribution: {
      low: Number(riskDist?.low || 0),
      medium: Number(riskDist?.medium || 0),
      high: Number(riskDist?.high || 0),
      critical: Number(riskDist?.critical || 0),
    },
    complexityDistribution: {
      low: Number(complexityDist?.low || 0),
      medium: Number(complexityDist?.medium || 0),
      high: Number(complexityDist?.high || 0),
    },
  }
}

/**
 * Get weekly security findings summary
 */
async function getWeeklySecuritySummary(
  repositoryId: string,
  weekStart: Date,
  weekEnd: Date,
  executor: DatabaseExecutor
): Promise<WeeklySecuritySummary> {
  const [severityCounts, topTypes] = await Promise.all([
    // Severity distribution
    executor
      .selectFrom('security_findings')
      .innerJoin('analyses', 'analyses.id', 'security_findings.analysis_id')
      .innerJoin('pull_requests', 'pull_requests.id', 'analyses.pr_id')
      .where('pull_requests.repository_id', '=', repositoryId)
      .where('analyses.analyzed_at', '>=', weekStart)
      .where('analyses.analyzed_at', '<=', weekEnd)
      .select((eb) => [
        eb.fn.count<number>('security_findings.id').as('total'),
        eb.fn.count<number>('security_findings.id')
          .filterWhere('security_findings.severity', '=', 'critical')
          .as('critical'),
        eb.fn.count<number>('security_findings.id')
          .filterWhere('security_findings.severity', '=', 'high')
          .as('high'),
        eb.fn.count<number>('security_findings.id')
          .filterWhere('security_findings.severity', '=', 'medium')
          .as('medium'),
        eb.fn.count<number>('security_findings.id')
          .filterWhere('security_findings.severity', '=', 'low')
          .as('low'),
      ])
      .executeTakeFirst(),

    // Top finding types
    executor
      .selectFrom('security_findings')
      .innerJoin('analyses', 'analyses.id', 'security_findings.analysis_id')
      .innerJoin('pull_requests', 'pull_requests.id', 'analyses.pr_id')
      .where('pull_requests.repository_id', '=', repositoryId)
      .where('analyses.analyzed_at', '>=', weekStart)
      .where('analyses.analyzed_at', '<=', weekEnd)
      .select((eb) => [
        'security_findings.type',
        eb.fn.count<number>('security_findings.id').as('count'),
      ])
      .groupBy('security_findings.type')
      .orderBy(sql`count desc`)
      .limit(5)
      .execute(),
  ])

  return {
    totalFindings: Number(severityCounts?.total || 0),
    criticalCount: Number(severityCounts?.critical || 0),
    highCount: Number(severityCounts?.high || 0),
    mediumCount: Number(severityCounts?.medium || 0),
    lowCount: Number(severityCounts?.low || 0),
    topFindingTypes: topTypes.map((t) => ({
      type: t.type,
      count: Number(t.count),
    })),
  }
}

/**
 * Get top risky PRs for the week
 * Returns only the latest analysis for each PR to avoid duplicates
 */
async function getTopRiskyPRs(
  repositoryId: string,
  weekStart: Date,
  weekEnd: Date,
  executor: DatabaseExecutor,
  limit: number = 5
): Promise<TopRiskyPR[]> {
  // First, get the latest analysis ID for each PR in the week
  const latestAnalyses = await executor
    .selectFrom('analyses')
    .innerJoin('pull_requests', 'pull_requests.id', 'analyses.pr_id')
    .where('pull_requests.repository_id', '=', repositoryId)
    .where('analyses.analyzed_at', '>=', weekStart)
    .where('analyses.analyzed_at', '<=', weekEnd)
    .select((eb) => [
      'pull_requests.id as pr_id',
      eb.fn.max('analyses.id').as('latest_analysis_id'),
    ])
    .groupBy('pull_requests.id')
    .execute()

  if (latestAnalyses.length === 0) {
    return []
  }

  const latestAnalysisIds = latestAnalyses.map((a) => a.latest_analysis_id)

  // Now get the full data for these analyses with security findings count
  const results = await executor
    .selectFrom('analyses')
    .innerJoin('pull_requests', 'pull_requests.id', 'analyses.pr_id')
    .leftJoin('security_findings', 'security_findings.analysis_id', 'analyses.id')
    .where('analyses.id', 'in', latestAnalysisIds)
    .select((eb) => [
      'pull_requests.number',
      'pull_requests.title',
      'analyses.risk_score',
      'analyses.risk_level',
      'analyses.complexity_score',
      'analyses.analyzed_at',
      eb.fn.count<number>('security_findings.id').as('finding_count'),
    ])
    .groupBy([
      'pull_requests.number',
      'pull_requests.title',
      'analyses.risk_score',
      'analyses.risk_level',
      'analyses.complexity_score',
      'analyses.analyzed_at',
    ])
    .orderBy('analyses.risk_score', 'desc')
    .limit(limit)
    .execute()

  return results.map((r) => ({
    prNumber: r.number,
    prTitle: r.title,
    riskScore: r.risk_score,
    riskLevel: r.risk_level,
    complexityScore: r.complexity_score,
    securityFindings: Number(r.finding_count),
    analyzedAt: new Date(r.analyzed_at).toISOString(),
  }))
}

/**
 * Get daily breakdown for the week
 */
async function getDailyBreakdown(
  repositoryId: string,
  weekStart: Date,
  weekEnd: Date,
  executor: DatabaseExecutor
): Promise<DailyBreakdown[]> {
  const results = await executor
    .selectFrom('analyses')
    .innerJoin('pull_requests', 'pull_requests.id', 'analyses.pr_id')
    .leftJoin('security_findings', 'security_findings.analysis_id', 'analyses.id')
    .where('pull_requests.repository_id', '=', repositoryId)
    .where('analyses.analyzed_at', '>=', weekStart)
    .where('analyses.analyzed_at', '<=', weekEnd)
    .select((eb) => [
      sql<string>`date(analyses.analyzed_at)`.as('date'),
      eb.fn.count<number>(sql`distinct analyses.id`).as('prs_analyzed'),
      eb.fn.avg<number>('analyses.risk_score').as('avg_risk'),
      eb.fn.count<number>('security_findings.id').as('findings'),
    ])
    .groupBy(sql`date(analyses.analyzed_at)`)
    .orderBy('date', 'asc')
    .execute()

  return results.map((r) => {
    // PostgreSQL DATE type may return a Date object at runtime despite TypeScript type
    const dateValue = r.date as unknown
    const dateStr = dateValue instanceof Date
      ? dateValue.toISOString().split('T')[0]
      : String(dateValue)
    return {
      date: dateStr,
      prsAnalyzed: Number(r.prs_analyzed),
      avgRiskScore: Math.round(Number(r.avg_risk || 0) * 10) / 10,
      securityFindings: Number(r.findings),
    }
  })
}

/**
 * Generate a complete weekly report for a repository
 *
 * @param owner - Repository owner
 * @param name - Repository name
 * @param weeksAgo - Number of weeks in the past (0 = current week)
 * @param executor - Database executor (for transaction support)
 * @returns Complete weekly report data
 */
export async function generateWeeklyReport(
  owner: string,
  name: string,
  weeksAgo: number = 0,
  executor: DatabaseExecutor = db
): Promise<WeeklyReport | null> {
  // Get repository ID
  const repository = await executor
    .selectFrom('repositories')
    .select(['id', 'owner', 'name'])
    .where('owner', '=', owner)
    .where('name', '=', name)
    .executeTakeFirst()

  if (!repository) {
    return null
  }

  const { weekStart, weekEnd } = getWeekBounds(weeksAgo)
  const { weekStart: prevWeekStart, weekEnd: prevWeekEnd } = getWeekBounds(weeksAgo + 1)

  // Execute all queries in parallel
  const [prSummary, securitySummary, topRiskyPRs, dailyBreakdown, prevPRSummary, prevSecuritySummary] =
    await Promise.all([
      getWeeklyPRSummary(repository.id, weekStart, weekEnd, executor),
      getWeeklySecuritySummary(repository.id, weekStart, weekEnd, executor),
      getTopRiskyPRs(repository.id, weekStart, weekEnd, executor),
      getDailyBreakdown(repository.id, weekStart, weekEnd, executor),
      getWeeklyPRSummary(repository.id, prevWeekStart, prevWeekEnd, executor),
      getWeeklySecuritySummary(repository.id, prevWeekStart, prevWeekEnd, executor),
    ])

  // Calculate week-over-week changes
  const comparisonWithPreviousWeek = {
    riskScoreChange:
      prevPRSummary.avgRiskScore > 0
        ? Math.round(((prSummary.avgRiskScore - prevPRSummary.avgRiskScore) / prevPRSummary.avgRiskScore) * 100)
        : 0,
    complexityChange:
      prevPRSummary.avgComplexityScore > 0
        ? Math.round(
          ((prSummary.avgComplexityScore - prevPRSummary.avgComplexityScore) / prevPRSummary.avgComplexityScore) * 100
        )
        : 0,
    securityFindingsChange:
      prevSecuritySummary.totalFindings > 0
        ? Math.round(
          ((securitySummary.totalFindings - prevSecuritySummary.totalFindings) / prevSecuritySummary.totalFindings) *
          100
        )
        : 0,
    prCountChange:
      prevPRSummary.totalPRsAnalyzed > 0
        ? Math.round(
          ((prSummary.totalPRsAnalyzed - prevPRSummary.totalPRsAnalyzed) / prevPRSummary.totalPRsAnalyzed) * 100
        )
        : 0,
  }

  return {
    summary: {
      reportId: generateReportId(),
      repositoryOwner: repository.owner,
      repositoryName: repository.name,
      weekStart: weekStart.toISOString().split('T')[0],
      weekEnd: weekEnd.toISOString().split('T')[0],
      generatedAt: new Date().toISOString(),
    },
    prSummary,
    securitySummary,
    topRiskyPRs,
    dailyBreakdown,
    comparisonWithPreviousWeek,
  }
}

/**
 * Get list of available weeks with data for a repository
 *
 * @param owner - Repository owner
 * @param name - Repository name
 * @param limit - Number of weeks to return
 * @param executor - Database executor
 * @returns Array of week start dates that have data
 */
export async function getAvailableReportWeeks(
  owner: string,
  name: string,
  limit: number = 12,
  executor: DatabaseExecutor = db
): Promise<string[]> {
  const repository = await executor
    .selectFrom('repositories')
    .select('id')
    .where('owner', '=', owner)
    .where('name', '=', name)
    .executeTakeFirst()

  if (!repository) {
    return []
  }

  const results = await executor
    .selectFrom('analyses')
    .innerJoin('pull_requests', 'pull_requests.id', 'analyses.pr_id')
    .where('pull_requests.repository_id', '=', repository.id)
    .select(sql<string>`date(date_trunc('week', analyses.analyzed_at))`.as('week_start'))
    .groupBy(sql`date(date_trunc('week', analyses.analyzed_at))`)
    .orderBy('week_start', 'desc')
    .limit(limit)
    .execute()

  return results.map((r) => {
    // PostgreSQL DATE type may return a Date object at runtime despite TypeScript type
    const dateValue = r.week_start as unknown
    return dateValue instanceof Date
      ? dateValue.toISOString().split('T')[0]
      : String(dateValue)
  })
}
