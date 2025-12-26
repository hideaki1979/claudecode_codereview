/**
 * Analysis management functions
 *
 * CRUD operations for the analyses table.
 * Handles PR analysis results storage and retrieval.
 */

import { db } from './kysely'
import type { Database } from './types'

type Analysis = Database['analyses']
type NewAnalysis = Omit<Analysis, 'id'>

/**
 * Create a new analysis record
 *
 * @param analysis - Analysis data
 * @returns Created analysis with generated id
 */
export async function createAnalysis(
  analysis: NewAnalysis
): Promise<Analysis> {
  return await db
    .insertInto('analyses')
    .values(analysis)
    .returningAll()
    .executeTakeFirstOrThrow()
}

/**
 * Find analysis by ID
 *
 * @param id - Analysis UUID
 * @returns Analysis if found, undefined otherwise
 */
export async function findAnalysisById(
  id: string
): Promise<Analysis | undefined> {
  return await db
    .selectFrom('analyses')
    .selectAll()
    .where('id', '=', id)
    .executeTakeFirst()
}

/**
 * Find latest analysis for a pull request
 *
 * @param prId - Pull request UUID
 * @returns Latest analysis if found, undefined otherwise
 */
export async function findLatestAnalysisByPrId(
  prId: string
): Promise<Analysis | undefined> {
  return await db
    .selectFrom('analyses')
    .selectAll()
    .where('pr_id', '=', prId)
    .orderBy('analyzed_at', 'desc')
    .executeTakeFirst()
}

/**
 * List all analyses for a pull request
 *
 * @param prId - Pull request UUID
 * @param options - Query options
 * @param options.limit - Maximum number of results (default: 100)
 * @param options.offset - Number of results to skip (default: 0)
 * @returns Array of analyses ordered by analyzed_at DESC
 */
export async function listAnalysesByPrId(
  prId: string,
  options?: {
    limit?: number
    offset?: number
  }
): Promise<Analysis[]> {
  const { limit = 100, offset = 0 } = options || {}

  return await db
    .selectFrom('analyses')
    .selectAll()
    .where('pr_id', '=', prId)
    .orderBy('analyzed_at', 'desc')
    .limit(limit)
    .offset(offset)
    .execute()
}

/**
 * List analyses by risk level
 *
 * Useful for dashboards showing high-risk PRs.
 *
 * @param riskLevel - Risk level filter
 * @param options - Query options
 * @param options.limit - Maximum number of results (default: 100)
 * @param options.offset - Number of results to skip (default: 0)
 * @param options.since - Only include analyses after this date
 * @returns Array of analyses ordered by analyzed_at DESC
 */
export async function listAnalysesByRiskLevel(
  riskLevel: 'low' | 'medium' | 'high' | 'critical',
  options?: {
    limit?: number
    offset?: number
    since?: Date
  }
): Promise<Analysis[]> {
  const { limit = 100, offset = 0, since } = options || {}

  let query = db
    .selectFrom('analyses')
    .selectAll()
    .where('risk_level', '=', riskLevel)

  if (since) {
    query = query.where('analyzed_at', '>=', since)
  }

  return await query
    .orderBy('analyzed_at', 'desc')
    .limit(limit)
    .offset(offset)
    .execute()
}

/**
 * Get analysis statistics for a date range
 *
 * @param options - Query options
 * @param options.since - Start date (default: 30 days ago)
 * @param options.until - End date (default: now)
 * @returns Statistics object with counts and averages
 */
export async function getAnalysisStatistics(options?: {
  since?: Date
  until?: Date
}): Promise<{
  total: number
  averageRiskScore: number
  averageComplexityScore: number
  averageSecurityScore: number
  riskLevelCounts: {
    low: number
    medium: number
    high: number
    critical: number
  }
}> {
  const since = options?.since || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  const until = options?.until || new Date()

  // Get aggregated statistics
  const stats = await db
    .selectFrom('analyses')
    .select([
      db.fn.count('id').as('total'),
      db.fn.avg('risk_score').as('avg_risk'),
      db.fn.avg('complexity_score').as('avg_complexity'),
      db.fn.avg('security_score').as('avg_security'),
    ])
    .where('analyzed_at', '>=', since)
    .where('analyzed_at', '<=', until)
    .executeTakeFirst()

  // Get risk level counts
  const riskCounts = await db
    .selectFrom('analyses')
    .select(['risk_level', db.fn.count('id').as('count')])
    .where('analyzed_at', '>=', since)
    .where('analyzed_at', '<=', until)
    .groupBy('risk_level')
    .execute()

  const riskLevelCounts = {
    low: 0,
    medium: 0,
    high: 0,
    critical: 0,
  }

  riskCounts.forEach((row) => {
    riskLevelCounts[row.risk_level] = Number(row.count)
  })

  return {
    total: Number(stats?.total || 0),
    averageRiskScore: Number(stats?.avg_risk || 0),
    averageComplexityScore: Number(stats?.avg_complexity || 0),
    averageSecurityScore: Number(stats?.avg_security || 0),
    riskLevelCounts,
  }
}

/**
 * Delete analysis by ID
 *
 * Cascades to related security_findings.
 *
 * @param id - Analysis UUID
 * @returns Number of deleted records (0 or 1)
 */
export async function deleteAnalysis(id: string): Promise<number> {
  const result = await db
    .deleteFrom('analyses')
    .where('id', '=', id)
    .executeTakeFirst()

  return Number(result.numDeletedRows)
}
