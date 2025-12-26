/**
 * Security Findings management functions
 *
 * CRUD operations for the security_findings table.
 * Handles security issue detection results storage and retrieval.
 */

import { db } from './kysely'
import type { Database } from './types'

type SecurityFinding = Database['security_findings']
type NewSecurityFinding = Omit<SecurityFinding, 'id'>

/**
 * Create a new security finding record
 *
 * @param finding - Security finding data
 * @returns Created security finding with generated id
 */
export async function createSecurityFinding(
  finding: NewSecurityFinding
): Promise<SecurityFinding> {
  return await db
    .insertInto('security_findings')
    .values(finding)
    .returningAll()
    .executeTakeFirstOrThrow()
}

/**
 * Create multiple security findings in batch
 *
 * More efficient than calling createSecurityFinding multiple times.
 *
 * @param findings - Array of security finding data
 * @returns Array of created security findings with generated ids
 */
export async function createSecurityFindings(
  findings: NewSecurityFinding[]
): Promise<SecurityFinding[]> {
  if (findings.length === 0) {
    return []
  }

  return await db
    .insertInto('security_findings')
    .values(findings)
    .returningAll()
    .execute()
}

/**
 * Find security finding by ID
 *
 * @param id - Security finding UUID
 * @returns Security finding if found, undefined otherwise
 */
export async function findSecurityFindingById(
  id: string
): Promise<SecurityFinding | undefined> {
  return await db
    .selectFrom('security_findings')
    .selectAll()
    .where('id', '=', id)
    .executeTakeFirst()
}

/**
 * List all security findings for an analysis
 *
 * @param analysisId - Analysis UUID
 * @param options - Query options
 * @param options.severity - Filter by severity
 * @param options.type - Filter by type
 * @param options.limit - Maximum number of results (default: 100)
 * @param options.offset - Number of results to skip (default: 0)
 * @returns Array of security findings ordered by severity (critical → low)
 */
export async function listSecurityFindingsByAnalysisId(
  analysisId: string,
  options?: {
    severity?: 'low' | 'medium' | 'high' | 'critical'
    type?: string
    limit?: number
    offset?: number
  }
): Promise<SecurityFinding[]> {
  const { severity, type, limit = 100, offset = 0 } = options || {}

  let query = db
    .selectFrom('security_findings')
    .selectAll()
    .where('analysis_id', '=', analysisId)

  if (severity) {
    query = query.where('severity', '=', severity)
  }

  if (type) {
    query = query.where('type', '=', type)
  }

  // Order by severity (critical first)
  return await query
    .orderBy(
      db
        .case()
        .when('severity', '=', 'critical')
        .then(4)
        .when('severity', '=', 'high')
        .then(3)
        .when('severity', '=', 'medium')
        .then(2)
        .else(1)
        .end(),
      'desc'
    )
    .limit(limit)
    .offset(offset)
    .execute()
}

/**
 * Get security finding statistics for an analysis
 *
 * @param analysisId - Analysis UUID
 * @returns Statistics object with severity counts and type breakdown
 */
export async function getSecurityFindingStatistics(analysisId: string): Promise<{
  total: number
  severityCounts: {
    low: number
    medium: number
    high: number
    critical: number
  }
  typeCounts: Record<string, number>
}> {
  // Get severity counts
  const severityRows = await db
    .selectFrom('security_findings')
    .select(['severity', db.fn.count('id').as('count')])
    .where('analysis_id', '=', analysisId)
    .groupBy('severity')
    .execute()

  const severityCounts = {
    low: 0,
    medium: 0,
    high: 0,
    critical: 0,
  }

  let total = 0
  severityRows.forEach((row) => {
    const count = Number(row.count)
    severityCounts[row.severity] = count
    total += count
  })

  // Get type counts
  const typeRows = await db
    .selectFrom('security_findings')
    .select(['type', db.fn.count('id').as('count')])
    .where('analysis_id', '=', analysisId)
    .groupBy('type')
    .execute()

  const typeCounts: Record<string, number> = {}
  typeRows.forEach((row) => {
    typeCounts[row.type] = Number(row.count)
  })

  return {
    total,
    severityCounts,
    typeCounts,
  }
}

/**
 * List security findings by severity across all analyses
 *
 * Useful for dashboards showing critical security issues.
 *
 * @param severity - Severity level
 * @param options - Query options
 * @param options.limit - Maximum number of results (default: 100)
 * @param options.offset - Number of results to skip (default: 0)
 * @returns Array of security findings
 */
export async function listSecurityFindingsBySeverity(
  severity: 'low' | 'medium' | 'high' | 'critical',
  options?: {
    limit?: number
    offset?: number
  }
): Promise<SecurityFinding[]> {
  const { limit = 100, offset = 0 } = options || {}

  return await db
    .selectFrom('security_findings')
    .selectAll()
    .where('severity', '=', severity)
    .limit(limit)
    .offset(offset)
    .execute()
}

/**
 * Delete security finding by ID
 *
 * @param id - Security finding UUID
 * @returns Number of deleted records (0 or 1)
 */
export async function deleteSecurityFinding(id: string): Promise<number> {
  const result = await db
    .deleteFrom('security_findings')
    .where('id', '=', id)
    .executeTakeFirst()

  return Number(result.numDeletedRows)
}

/**
 * Delete all security findings for an analysis
 *
 * Useful when re-analyzing a PR.
 *
 * @param analysisId - Analysis UUID
 * @returns Number of deleted records
 */
export async function deleteSecurityFindingsByAnalysisId(
  analysisId: string
): Promise<number> {
  const result = await db
    .deleteFrom('security_findings')
    .where('analysis_id', '=', analysisId)
    .executeTakeFirst()

  return Number(result.numDeletedRows)
}
