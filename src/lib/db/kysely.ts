/**
 * Kysely database client configuration
 *
 * This file sets up the type-safe database client using Kysely.
 * It automatically detects the environment and uses the appropriate connection pool:
 * - Development: pg Pool (for Docker Compose)
 * - Production: @vercel/postgres (for Vercel Postgres)
 */

import { Kysely, PostgresDialect } from 'kysely'
import { Pool } from 'pg'
import type { Database } from './types'

/**
 * Create PostgreSQL connection pool
 *
 * Environment variables:
 * - DATABASE_URL: PostgreSQL connection string (development)
 * - POSTGRES_URL: Vercel Postgres connection string (production)
 */
const createPool = () => {
  const connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL

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
