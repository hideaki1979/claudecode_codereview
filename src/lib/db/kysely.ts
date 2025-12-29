/**
 * Kysely database client configuration
 *
 * This file sets up the type-safe database client using Kysely.
 * Supports both:
 * - Development: Docker Compose with pg Pool
 * - Production: Neon serverless with @neondatabase/serverless Pool
 */

import { Kysely, PostgresDialect } from 'kysely'
import { Pool as PgPool } from 'pg'
import { Pool as NeonPool } from '@neondatabase/serverless'
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
  DATABASE_URL_LOCAL: z
    .string()
    .regex(postgresUrlPattern, {
      message: 'DATABASE_URL_LOCAL must be a valid PostgreSQL connection URL',
    })
    .optional(),
  POSTGRES_URL: z
    .string()
    .regex(postgresUrlPattern, {
      message: 'POSTGRES_URL must be a valid PostgreSQL connection URL (postgres:// or postgresql://)',
    })
    .optional(),
  DATABASE_URL_UNPOOLED: z
    .string()
    .regex(postgresUrlPattern, {
      message: 'DATABASE_URL_UNPOOLED must be a valid PostgreSQL connection URL',
    })
    .optional(),
  USE_LOCAL_DB: z.string().optional(),
})

/**
 * Detect if running in Vercel/Neon production environment
 *
 * Environment detection priority:
 * 1. USE_LOCAL_DB=true → Force local Docker database
 * 2. VERCEL=1 → Vercel production/preview environment
 * 3. DATABASE_URL contains neon.tech → Neon environment
 * 4. Otherwise → Local Docker environment
 *
 * @returns true if running in Neon environment, false for local Docker
 */
export const isNeonEnvironment = (): boolean => {
  // Explicit override: force local database (for development)
  if (process.env.USE_LOCAL_DB === 'true') {
    return false
  }

  // Check for Vercel environment (production/preview deployments)
  if (process.env.VERCEL) {
    return true
  }

  // Check if DATABASE_URL contains Neon-specific hosts
  const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL
  if (connectionString) {
    return (
      connectionString.includes('neon.tech') ||
      connectionString.includes('vercel-storage.com')
    )
  }

  return false
}

/**
 * Get validated environment variables
 * @internal
 */
const getValidatedEnv = () => {
  const parseResult = envSchema.safeParse(process.env)
  if (!parseResult.success) {
    const validationError = fromZodError(parseResult.error)
    throw new Error(
      `Invalid database configuration: ${validationError.message}`
    )
  }
  return parseResult.data
}

/**
 * Get validated connection string
 *
 * Priority:
 * 1. If USE_LOCAL_DB=true: Use DATABASE_URL_LOCAL (for Docker development)
 * 2. Otherwise: Use DATABASE_URL or POSTGRES_URL (for Neon/production)
 *
 * @returns PostgreSQL connection string
 */
export const getConnectionString = (): string => {
  const env = getValidatedEnv()

  // If USE_LOCAL_DB is set, require DATABASE_URL_LOCAL explicitly
  if (env.USE_LOCAL_DB === 'true') {
    const localUrl = env.DATABASE_URL_LOCAL
    if (!localUrl) {
      throw new Error(
        'USE_LOCAL_DB is set but DATABASE_URL_LOCAL is not configured. ' +
        'Please configure it in your .env file for local development.'
      )
    }
    return localUrl
  }

  // Production: use DATABASE_URL or POSTGRES_URL
  const connectionString = env.DATABASE_URL || env.POSTGRES_URL

  if (!connectionString) {
    throw new Error(
      'Database connection string not found. Please set DATABASE_URL or POSTGRES_URL environment variable.'
    )
  }

  return connectionString
}

/**
 * Create PostgreSQL connection pool
 *
 * Environment detection:
 * - Vercel/Neon: Uses @neondatabase/serverless Pool (WebSocket-based)
 * - Local/Docker: Uses pg Pool (TCP-based)
 *
 * @returns Configured PostgreSQL connection pool
 * @throws {Error} If environment variables are invalid or missing
 */
const createPool = (): PgPool | NeonPool => {
  const connectionString = getConnectionString()

  if (isNeonEnvironment()) {
    // Neon serverless environment
    // Connection caching is enabled by default server-side (since Feb 2024)
    return new NeonPool({
      connectionString,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000, // Slightly longer for serverless cold starts
    })
  }

  // Development environment: Use standard pg Pool
  return new PgPool({
    connectionString,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  })
}

/**
 * Kysely database instance
 *
 * This is the main database client used throughout the application.
 * It provides type-safe query building based on the Database schema.
 *
 * Automatically selects the appropriate pool based on environment:
 * - Production (Vercel/Neon): Serverless-optimized connection pool
 * - Development (Docker): Standard PostgreSQL connection pool
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

/**
 * Get unpooled connection string for migrations
 *
 * For Neon: Uses DATABASE_URL_UNPOOLED for direct connections
 * For Local: Uses DATABASE_URL_LOCAL or getConnectionString()
 *
 * This respects USE_LOCAL_DB setting to prevent accidental
 * migrations against production database.
 *
 * @returns Direct (unpooled) PostgreSQL connection string
 */
export const getUnpooledConnectionString = (): string => {
  const env = getValidatedEnv()

  // If USE_LOCAL_DB is set, require DATABASE_URL_LOCAL explicitly
  if (env.USE_LOCAL_DB === 'true') {
    const localUrl = env.DATABASE_URL_LOCAL
    if (!localUrl) {
      throw new Error(
        'USE_LOCAL_DB is set but DATABASE_URL_LOCAL is not configured. ' +
        'Please configure it in your .env file for local development.'
      )
    }
    return localUrl
  }

  // Production: prefer unpooled connection for migrations
  const unpooled = env.DATABASE_URL_UNPOOLED
  if (unpooled) {
    return unpooled
  }

  // Fall back to regular connection string
  return getConnectionString()
}
