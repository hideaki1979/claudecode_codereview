/**
 * Security Findings management functions
 *
 * CRUD operations for the security_findings table.
 * Handles security issue detection results storage and retrieval.
 */

import { db } from './kysely'
import { z } from 'zod'
import { fromZodError } from 'zod-validation-error'
import type { SecurityFinding, NewSecurityFinding } from './types'

/**
 * Input validation schema for new security findings
 */
const newSecurityFindingSchema = z.object({
  analysis_id: z.string().uuid('analysis_id must be a valid UUID'),
  type: z.string().min(1, 'type is required'),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  message: z.string().min(1, 'message is required'),
  file: z.string().min(1, 'file is required'),
  line: z.number().int().positive().nullable(),
  snippet: z.string().nullable(),
})

/**
 * Batch size limit for bulk inserts
 * PostgreSQL parameter limit: 65,535
 * SecurityFinding has 7 columns → max ~9,362 rows/batch
 * Using 1,000 for safety margin
 */
const BATCH_SIZE = 1000

/**
 * Create a new security finding record
 *
 * @param finding - Security finding data
 * @returns Created security finding with generated id
 * @throws {Error} If input validation fails or database operation fails
 */
export async function createSecurityFinding(
  finding: NewSecurityFinding
): Promise<SecurityFinding> {
  // Input validation
  const parseResult = newSecurityFindingSchema.safeParse(finding)
  if (!parseResult.success) {
    const validationError = fromZodError(parseResult.error)
    throw new Error(`Invalid security finding data: ${validationError.message}`)
  }

  try {
    return await db
      .insertInto('security_findings')
      .values(finding)
      .returningAll()
      .executeTakeFirstOrThrow()
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    throw new Error(`Database error in createSecurityFinding: ${message}`)
  }
}

/**
 * Create multiple security findings in batch
 *
 * More efficient than calling createSecurityFinding multiple times.
 * Automatically splits large arrays into batches to avoid PostgreSQL parameter limits.
 *
 * @param findings - Array of security finding data
 * @returns Array of created security findings with generated ids
 * @throws {Error} If input validation fails or database operation fails
 */
export async function createSecurityFindings(
  findings: NewSecurityFinding[]
): Promise<SecurityFinding[]> {
  if (findings.length === 0) {
    return []
  }

  // Validate all findings
  const validationErrors: string[] = []
  for (let i = 0; i < findings.length; i++) {
    const parseResult = newSecurityFindingSchema.safeParse(findings[i])
    if (!parseResult.success) {
      const validationError = fromZodError(parseResult.error)
      validationErrors.push(`[${i}]: ${validationError.message}`)
    }
  }

  if (validationErrors.length > 0) {
    throw new Error(
      `Invalid security findings data:\n${validationErrors.slice(0, 5).join('\n')}` +
        (validationErrors.length > 5
          ? `\n...and ${validationErrors.length - 5} more errors`
          : '')
    )
  }

  try {
    // Split into batches if necessary
    if (findings.length <= BATCH_SIZE) {
      return await db
        .insertInto('security_findings')
        .values(findings)
        .returningAll()
        .execute()
    }

    // Process in batches for large arrays
    const results: SecurityFinding[] = []
    for (let i = 0; i < findings.length; i += BATCH_SIZE) {
      const batch = findings.slice(i, i + BATCH_SIZE)
      const batchResults = await db
        .insertInto('security_findings')
        .values(batch)
        .returningAll()
        .execute()
      results.push(...batchResults)
    }

    return results
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    throw new Error(
      `Database error in createSecurityFindings (${findings.length} items): ${message}`
    )
  }
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
 * List all security findings for multiple analyses (batch query)
 *
 * Solves N+1 query problem by fetching findings for multiple analyses in one query.
 * Results are grouped by analysis_id for efficient mapping.
 *
 * @param analysisIds - Array of Analysis UUIDs
 * @returns Map of analysis_id to array of security findings
 */
export async function listSecurityFindingsByAnalysisIds(
  analysisIds: string[]
): Promise<Map<string, SecurityFinding[]>> {
  if (analysisIds.length === 0) {
    return new Map()
  }

  const findings = await db
    .selectFrom('security_findings')
    .selectAll()
    .where('analysis_id', 'in', analysisIds)
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
    .execute()

  // Group by analysis_id
  const resultMap = new Map<string, SecurityFinding[]>()

  // Initialize all IDs with empty arrays
  for (const id of analysisIds) {
    resultMap.set(id, [])
  }

  // Populate with actual findings
  for (const finding of findings) {
    const list = resultMap.get(finding.analysis_id)
    if (list) {
      list.push(finding)
    }
  }

  return resultMap
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
