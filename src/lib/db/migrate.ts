/**
 * Database migration runner
 *
 * This script runs all pending migrations in the migrations/ directory.
 * Run with: npm run db:migrate
 *
 * For Neon/Vercel Postgres: Uses DATABASE_URL_UNPOOLED for direct connection
 * (required for schema changes as pooled connections may have limitations)
 *
 * This module imports shared environment detection and connection string
 * logic from kysely.ts to ensure consistent behavior across the application.
 */

import 'dotenv/config'
import { Kysely, Migrator, FileMigrationProvider, PostgresDialect } from 'kysely'
import { Pool as PgPool } from 'pg'
import { Pool as NeonPool } from '@neondatabase/serverless'
import { promises as fs } from 'fs'
import * as path from 'path'
import type { Database } from './types'
import { isNeonEnvironment, getUnpooledConnectionString } from './kysely'

/**
 * Create database instance for migrations
 * Uses direct connection (unpooled) for schema changes
 *
 * This function uses shared environment detection from kysely.ts,
 * ensuring migrations respect USE_LOCAL_DB setting and use the
 * correct connection string for the target environment.
 */
const createMigrationDb = (): Kysely<Database> => {
  const connectionString = getUnpooledConnectionString()
  const isNeon = isNeonEnvironment()

  // Log which environment is being used
  if (process.env.USE_LOCAL_DB === 'true') {
    console.log('🐳 Using local Docker database for migrations (USE_LOCAL_DB=true)')
  } else if (isNeon) {
    console.log('🌐 Using Neon serverless pool for migrations')
  } else {
    console.log('🐳 Using pg pool for migrations (local/Docker)')
  }

  let pool: PgPool | NeonPool

  if (isNeon) {
    pool = new NeonPool({
      connectionString,
      max: 1, // Single connection for migrations
      connectionTimeoutMillis: 30000, // Longer timeout for schema changes
    })
  } else {
    pool = new PgPool({
      connectionString,
      max: 1,
      connectionTimeoutMillis: 10000,
    })
  }

  return new Kysely<Database>({
    dialect: new PostgresDialect({ pool }),
  })
}

/**
 * Run all pending migrations
 */
export async function migrateToLatest(): Promise<void> {
  const db = createMigrationDb()

  try {
    const migrator = new Migrator({
      db,
      provider: new FileMigrationProvider({
        fs,
        path,
        migrationFolder: path.join(process.cwd(), 'migrations'),
      }),
    })

    console.log('🚀 Running migrations...')
    const { error, results } = await migrator.migrateToLatest()

    results?.forEach((it) => {
      if (it.status === 'Success') {
        console.log(`✅ Migration "${it.migrationName}" executed successfully`)
      } else if (it.status === 'Error') {
        console.error(`❌ Migration "${it.migrationName}" failed`)
      } else if (it.status === 'NotExecuted') {
        console.log(`⏭️  Migration "${it.migrationName}" was not executed`)
      }
    })

    if (error) {
      console.error('❌ Migration failed:', error)
      throw error
    }

    if (results?.length === 0) {
      console.log('ℹ️  No pending migrations to run')
    } else {
      console.log('✅ All migrations completed successfully')
    }
  } finally {
    await db.destroy()
  }
}

// Run migrations if called directly
if (require.main === module) {
  ;(async () => {
    try {
      await migrateToLatest()
      console.log('🎉 Database migration complete!')
      process.exit(0)
    } catch (error) {
      console.error('💥 Migration error:', error)
      process.exit(1)
    }
  })()
}
