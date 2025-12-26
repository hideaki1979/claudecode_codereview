/**
 * Pull Request management functions
 *
 * CRUD operations for the pull_requests table.
 * Handles GitHub PR metadata storage and retrieval.
 */

import { db } from './kysely'
import type { Database } from './types'

type PullRequest = Database['pull_requests']
type NewPullRequest = Omit<PullRequest, 'id'>

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
 * Find or create pull request
 *
 * Idempotent operation that returns existing PR or creates new one.
 *
 * @param pullRequest - PR data
 * @returns Existing or newly created pull request
 */
export async function findOrCreatePullRequest(
  pullRequest: NewPullRequest
): Promise<PullRequest> {
  const existing = await findPullRequestByNumber(
    pullRequest.repository_id,
    pullRequest.number
  )

  if (existing) {
    return existing
  }

  return await createPullRequest(pullRequest)
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
