/**
 * Pull Request management functions
 *
 * CRUD operations for the pull_requests table.
 * Handles GitHub PR metadata storage and retrieval.
 */

import { db } from './kysely'
import { z } from 'zod'
import { fromZodError } from 'zod-validation-error'
import type { PullRequest, NewPullRequest } from './types'

/**
 * Input validation schema for new pull requests
 */
const newPullRequestSchema = z.object({
  repository_id: z.string().uuid('repository_id must be a valid UUID'),
  number: z.number().int().positive('number must be a positive integer'),
  title: z.string().min(1, 'title is required').max(500, 'title too long'),
  state: z.enum(['open', 'closed', 'merged']),
  created_at: z.date(),
  updated_at: z.date(),
})

/**
 * Create a new pull request record
 *
 * @param pullRequest - PR data
 * @returns Created pull request with generated id
 * @throws {Error} If PR with same repository_id and number already exists
 */
export async function createPullRequest(
  pullRequest: NewPullRequest
): Promise<PullRequest> {
  return await db
    .insertInto('pull_requests')
    .values(pullRequest)
    .returningAll()
    .executeTakeFirstOrThrow()
}

/**
 * Find pull request by ID
 *
 * @param id - Pull request UUID
 * @returns Pull request if found, undefined otherwise
 */
export async function findPullRequestById(
  id: string
): Promise<PullRequest | undefined> {
  return await db
    .selectFrom('pull_requests')
    .selectAll()
    .where('id', '=', id)
    .executeTakeFirst()
}

/**
 * Find pull request by repository and PR number
 *
 * @param repositoryId - Repository UUID
 * @param number - GitHub PR number
 * @returns Pull request if found, undefined otherwise
 */
export async function findPullRequestByNumber(
  repositoryId: string,
  number: number
): Promise<PullRequest | undefined> {
  return await db
    .selectFrom('pull_requests')
    .selectAll()
    .where('repository_id', '=', repositoryId)
    .where('number', '=', number)
    .executeTakeFirst()
}

/**
 * Find or create pull request (atomic upsert)
 *
 * Uses ON CONFLICT to ensure atomic operation and prevent TOCTOU race conditions.
 * Idempotent: returns existing PR unchanged or creates new one.
 *
 * @param pullRequest - PR data
 * @returns Existing or newly created pull request
 * @throws {Error} If input validation fails or database operation fails
 */
export async function findOrCreatePullRequest(
  pullRequest: NewPullRequest
): Promise<PullRequest> {
  // Input validation
  const parseResult = newPullRequestSchema.safeParse(pullRequest)
  if (!parseResult.success) {
    const validationError = fromZodError(parseResult.error)
    throw new Error(`Invalid pull request data: ${validationError.message}`)
  }

  try {
    // Atomic upsert using ON CONFLICT
    // Uses unique constraint: pull_requests_repo_number_unique (repository_id, number)
    const result = await db
      .insertInto('pull_requests')
      .values(pullRequest)
      .onConflict((oc) =>
        oc
          .columns(['repository_id', 'number'])
          .doNothing()
      )
      .returningAll()
      .executeTakeFirst()

    // If insert succeeded, return the new record
    if (result) {
      return result
    }

    // If conflict occurred (doNothing), fetch the existing record
    const existing = await findPullRequestByNumber(
      pullRequest.repository_id,
      pullRequest.number
    )

    if (!existing) {
      throw new Error(
        `Failed to find or create pull request: repository_id=${pullRequest.repository_id}, number=${pullRequest.number}`
      )
    }

    return existing
  } catch (error) {
    // Re-throw validation errors as-is
    if (error instanceof Error && error.message.startsWith('Invalid pull request data:')) {
      throw error
    }

    // Wrap database errors with context
    const message = error instanceof Error ? error.message : 'Unknown error'
    throw new Error(
      `Database error in findOrCreatePullRequest: ${message}`
    )
  }
}

/**
 * Update pull request
 *
 * @param id - Pull request UUID
 * @param updates - Fields to update
 * @returns Updated pull request
 * @throws {Error} If pull request not found
 */
export async function updatePullRequest(
  id: string,
  updates: Partial<Omit<PullRequest, 'id' | 'repository_id' | 'number'>>
): Promise<PullRequest> {
  if (Object.keys(updates).length === 0) {
    const existing = await findPullRequestById(id)
    if (!existing) {
      throw new Error(`Pull request with id ${id} not found`)
    }
    return existing;
  }
  return await db
    .updateTable('pull_requests')
    .set(updates)
    .where('id', '=', id)
    .returningAll()
    .executeTakeFirstOrThrow()
}

/**
 * List pull requests for a repository
 *
 * @param repositoryId - Repository UUID
 * @param options - Query options
 * @param options.state - Filter by state
 * @param options.limit - Maximum number of results (default: 100)
 * @param options.offset - Number of results to skip (default: 0)
 * @returns Array of pull requests
 */
export async function listPullRequestsByRepository(
  repositoryId: string,
  options?: {
    state?: 'open' | 'closed' | 'merged'
    limit?: number
    offset?: number
  }
): Promise<PullRequest[]> {
  const { state, limit = 100, offset = 0 } = options || {}

  let query = db
    .selectFrom('pull_requests')
    .selectAll()
    .where('repository_id', '=', repositoryId)

  if (state) {
    query = query.where('state', '=', state)
  }

  return await query
    .orderBy('updated_at', 'desc')
    .limit(limit)
    .offset(offset)
    .execute()
}

/**
 * Delete pull request by ID
 *
 * Cascades to related analyses and security_findings.
 *
 * @param id - Pull request UUID
 * @returns Number of deleted records (0 or 1)
 */
export async function deletePullRequest(id: string): Promise<number> {
  const result = await db
    .deleteFrom('pull_requests')
    .where('id', '=', id)
    .executeTakeFirst()

  return Number(result.numDeletedRows)
}
