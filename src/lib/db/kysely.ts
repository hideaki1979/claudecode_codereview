/**
 * Kysely database client configuration
 *
 * This file sets up the type-safe database client using Kysely.
 * Uses pg Pool for PostgreSQL connection management.
 * Compatible with both development (Docker Compose) and production (Vercel Postgres).
 */

import { Kysely, PostgresDialect } from 'kysely'
import { Pool } from 'pg'
import { z } from 'zod'
import { fromZodError } from 'zod-validation-error'
import type { Database } from './types'

/**
 * PostgreSQL connection string validation regex
 * Matches: postgres:// or postgresql:// URLs
 */
const postgresUrlPattern = /^postgres(ql)?:\/\/.+/

/**
 * Environment variable schema for database configuration
 *
 * Validates that at least one database connection string is provided.
 */
const envSchema = z.object({
  DATABASE_URL: z
    .string()
    .regex(postgresUrlPattern, {
      message: 'DATABASE_URL must be a valid PostgreSQL connection URL (postgres:// or postgresql://)',
    })
    .optional(),
  POSTGRES_URL: z
    .string()
    .regex(postgresUrlPattern, {
      message: 'POSTGRES_URL must be a valid PostgreSQL connection URL (postgres:// or postgresql://)',
    })
    .optional(),
})

/**
 * Create PostgreSQL connection pool
 *
 * Environment variables:
 * - DATABASE_URL: PostgreSQL connection string (development)
 * - POSTGRES_URL: Vercel Postgres connection string (production)
 *
 * @returns Configured PostgreSQL connection pool
 * @throws {Error} If environment variables are invalid or missing
 */
const createPool = (): Pool => {
  // Validate environment variables
  const parseResult = envSchema.safeParse(process.env)

  if (!parseResult.success) {
    const validationError = fromZodError(parseResult.error)
    throw new Error(
      `Invalid database configuration: ${validationError.message}`
    )
  }

  const env = parseResult.data
  const connectionString = env.POSTGRES_URL || env.DATABASE_URL

  if (!connectionString) {
    throw new Error(
      'Database connection string not found. Please set DATABASE_URL or POSTGRES_URL environment variable.'
    )
  }

  return new Pool({
    connectionString,
    max: 10, // Maximum number of connections in pool
    idleTimeoutMillis: 30000, // Close idle connections after 30 seconds
    connectionTimeoutMillis: 2000, // Timeout for new connections
  })
}

/**
 * Kysely database instance
 *
 * This is the main database client used throughout the application.
 * It provides type-safe query building based on the Database schema.
 *
 * @example
 * ```typescript
 * import { db } from '@/lib/db/kysely'
 *
 * const repos = await db
 *   .selectFrom('repositories')
 *   .selectAll()
 *   .execute()
 * ```
 */
export const db = new Kysely<Database>({
  dialect: new PostgresDialect({
    pool: createPool(),
  }),
})

/**
 * Type-safe database instance type
 * Useful for dependency injection and testing
 */
export type DB = typeof db
