/**
 * Repository management functions
 *
 * CRUD operations for the repositories table.
 * Handles GitHub repository metadata storage and retrieval.
 */

import { db } from './kysely'
import type { Database } from './types'

type Repository = Database['repositories']
type NewRepository = Omit<Repository, 'id' | 'created_at'>

/**
 * Create a new repository record
 *
 * @param repository - Repository data (owner and name)
 * @returns Created repository with generated id and created_at
 * @throws {Error} If repository with same owner/name already exists
 */
export async function createRepository(
  repository: NewRepository
): Promise<Repository> {
  return await db
    .insertInto('repositories')
    .values(repository)
    .returningAll()
    .executeTakeFirstOrThrow()
}

/**
 * Find repository by ID
 *
 * @param id - Repository UUID
 * @returns Repository if found, undefined otherwise
 */
export async function findRepositoryById(
  id: string
): Promise<Repository | undefined> {
  return await db
    .selectFrom('repositories')
    .selectAll()
    .where('id', '=', id)
    .executeTakeFirst()
}

/**
 * Find repository by owner and name
 *
 * @param owner - Repository owner (GitHub username or organization)
 * @param name - Repository name
 * @returns Repository if found, undefined otherwise
 */
export async function findRepositoryByOwnerAndName(
  owner: string,
  name: string
): Promise<Repository | undefined> {
  return await db
    .selectFrom('repositories')
    .selectAll()
    .where('owner', '=', owner)
    .where('name', '=', name)
    .executeTakeFirst()
}

/**
 * Find or create repository
 *
 * Idempotent operation that returns existing repository or creates new one.
 * Useful for ensuring repository exists before creating related records.
 *
 * @param repository - Repository data (owner and name)
 * @returns Existing or newly created repository
 */
export async function findOrCreateRepository(
  repository: NewRepository
): Promise<Repository> {
  const existing = await findRepositoryByOwnerAndName(
    repository.owner,
    repository.name
  )

  if (existing) {
    return existing
  }

  return await createRepository(repository)
}

/**
 * List all repositories
 *
 * @param options - Query options
 * @param options.limit - Maximum number of results (default: 100)
 * @param options.offset - Number of results to skip (default: 0)
 * @param options.orderBy - Sort order (default: 'created_at' DESC)
 * @returns Array of repositories
 */
export async function listRepositories(options?: {
  limit?: number
  offset?: number
  orderBy?: 'created_at' | 'owner' | 'name'
  order?: 'asc' | 'desc'
}): Promise<Repository[]> {
  const { limit = 100, offset = 0, orderBy = 'created_at', order = 'desc' } =
    options || {}

  return await db
    .selectFrom('repositories')
    .selectAll()
    .orderBy(orderBy, order)
    .limit(limit)
    .offset(offset)
    .execute()
}

/**
 * Delete repository by ID
 *
 * Cascades to related pull_requests, analyses, and security_findings.
 *
 * @param id - Repository UUID
 * @returns Number of deleted records (0 or 1)
 */
export async function deleteRepository(id: string): Promise<number> {
  const result = await db
    .deleteFrom('repositories')
    .where('id', '=', id)
    .executeTakeFirst()

  return Number(result.numDeletedRows)
}
