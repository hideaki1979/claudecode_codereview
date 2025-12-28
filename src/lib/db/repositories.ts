/**
 * Repository management functions
 *
 * CRUD operations for the repositories table.
 * Handles GitHub repository metadata storage and retrieval.
 */

import { db } from './kysely'
import { z } from 'zod'
import { fromZodError } from 'zod-validation-error'
import type { Repository, NewRepository, DatabaseExecutor } from './types'

/**
 * Input validation schema for new repositories
 */
const newRepositorySchema = z.object({
  owner: z
    .string()
    .min(1, 'owner is required')
    .max(100, 'owner too long')
    .regex(/^[a-zA-Z0-9_-]+$/, 'owner contains invalid characters'),
  name: z
    .string()
    .min(1, 'name is required')
    .max(100, 'name too long')
    .regex(/^[a-zA-Z0-9._-]+$/, 'name contains invalid characters'),
})

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
 * @param executor - Optional database executor for transaction support
 * @returns Repository if found, undefined otherwise
 */
export async function findRepositoryByOwnerAndName(
  owner: string,
  name: string,
  executor: DatabaseExecutor = db
): Promise<Repository | undefined> {
  return await executor
    .selectFrom('repositories')
    .selectAll()
    .where('owner', '=', owner)
    .where('name', '=', name)
    .executeTakeFirst()
}

/**
 * Find or create repository (atomic upsert)
 *
 * Uses ON CONFLICT to ensure atomic operation and prevent TOCTOU race conditions.
 * Idempotent: returns existing repository unchanged or creates new one.
 * Useful for ensuring repository exists before creating related records.
 *
 * @param repository - Repository data (owner and name)
 * @param executor - Optional database executor for transaction support
 * @returns Existing or newly created repository
 * @throws {Error} If input validation fails or database operation fails
 */
export async function findOrCreateRepository(
  repository: NewRepository,
  executor: DatabaseExecutor = db
): Promise<Repository> {
  // Input validation
  const parseResult = newRepositorySchema.safeParse(repository)
  if (!parseResult.success) {
    const validationError = fromZodError(parseResult.error)
    throw new Error(`Invalid repository data: ${validationError.message}`)
  }

  try {
    // Atomic upsert using ON CONFLICT
    // Uses unique constraint: repositories_owner_name_unique (owner, name)
    const result = await executor
      .insertInto('repositories')
      .values(repository)
      .onConflict((oc) =>
        oc
          .columns(['owner', 'name'])
          .doNothing()
      )
      .returningAll()
      .executeTakeFirst()

    // If insert succeeded, return the new record
    if (result) {
      return result
    }

    // If conflict occurred (doNothing), fetch the existing record
    const existing = await findRepositoryByOwnerAndName(
      repository.owner,
      repository.name,
      executor
    )

    if (!existing) {
      throw new Error(
        `Failed to find or create repository: ${repository.owner}/${repository.name}`
      )
    }

    return existing
  } catch (error) {
    // Re-throw validation errors as-is
    if (error instanceof Error && error.message.startsWith('Invalid repository data:')) {
      throw error
    }

    // Wrap database errors with context
    const message = error instanceof Error ? error.message : 'Unknown error'
    throw new Error(
      `Database error in findOrCreateRepository: ${message}`
    )
  }
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
