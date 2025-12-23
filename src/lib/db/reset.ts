/**
 * Database reset script
 *
 * ⚠️ WARNING: This script drops all tables and recreates the schema.
 * Only use in development!
 *
 * Run with: npm run db:reset
 */

import 'dotenv/config'
import { sql } from 'kysely'
import { db } from './kysely'
import { migrateToLatest } from './migrate'

async function reset(): Promise<void> {
  console.log('⚠️  WARNING: This will drop all tables and data!')
  console.log('🗑️  Dropping schema...')

  try {
    // Drop and recreate schema
    await sql`DROP SCHEMA public CASCADE`.execute(db)
    await sql`CREATE SCHEMA public`.execute(db)

    // Grant permissions
    await sql`GRANT ALL ON SCHEMA public TO postgres`.execute(db)
    await sql`GRANT ALL ON SCHEMA public TO public`.execute(db)

    console.log('✅ Schema reset complete')
    console.log('🚀 Running migrations...')

    // Run migrations
    await migrateToLatest()

    console.log('✅ Database reset and migration complete')
  } catch (error) {
    console.error('❌ Reset failed:', error)
    throw error
  } finally {
    await db.destroy()
  }
}

// Run reset if called directly
if (require.main === module) {
  reset()
    .then(() => {
      console.log('🎉 Database reset complete!')
      process.exit(0)
    })
    .catch((error) => {
      console.error('💥 Reset error:', error)
      process.exit(1)
    })
}
