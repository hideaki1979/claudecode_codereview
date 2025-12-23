/**
 * Database migration runner
 *
 * This script runs all pending migrations in the migrations/ directory.
 * Run with: npm run db:migrate
 */

import 'dotenv/config'
import { Kysely, Migrator, FileMigrationProvider } from 'kysely'
import { promises as fs } from 'fs'
import * as path from 'path'
import { db } from './kysely'

/**
 * Run all pending migrations
 */
export async function migrateToLatest(): Promise<void> {
  const migrator = new Migrator({
    db: db as Kysely<any>,
    provider: new FileMigrationProvider({
      fs,
      path,
      migrationFolder: path.join(process.cwd(), 'migrations'),
    }),
  })

  const { error, results } = await migrator.migrateToLatest()

  results?.forEach((it) => {
    if (it.status === 'Success') {
      console.log(`✅ Migration "${it.migrationName}" executed successfully`)
    } else if (it.status === 'Error') {
      console.error(`❌ Migration "${it.migrationName}" failed`)
    }
  })

  if (error) {
    console.error('❌ Migration failed:', error)
    process.exit(1)
  }

  console.log('✅ All migrations completed successfully')
  await db.destroy()
}

// Run migrations if called directly
if (require.main === module) {
  migrateToLatest()
    .then(() => {
      console.log('🎉 Database migration complete!')
      process.exit(0)
    })
    .catch((error) => {
      console.error('💥 Migration error:', error)
      process.exit(1)
    })
}
