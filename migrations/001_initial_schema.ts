/**
 * Initial database schema migration
 *
 * Creates all tables and indexes for the Code Review Dashboard.
 * Tables:
 * - repositories: GitHub repository metadata
 * - pull_requests: PR information
 * - analyses: Analysis results
 * - security_findings: Security issue detections
 */

import { Kysely, sql } from 'kysely'
import type { Database } from '../src/lib/db/types'

export async function up(db: Kysely<Database>): Promise<void> {
  // Ensure UUID extension is available (redundant with init script, but safe)
  await sql`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`.execute(db)

  // ===== REPOSITORIES TABLE =====
  await db.schema
    .createTable('repositories')
    .addColumn('id', 'uuid', (col) =>
      col.primaryKey().defaultTo(sql`uuid_generate_v4()`)
    )
    .addColumn('owner', 'text', (col) => col.notNull())
    .addColumn('name', 'text', (col) => col.notNull())
    .addColumn('created_at', 'timestamp', (col) =>
      col.defaultTo(sql`CURRENT_TIMESTAMP`).notNull()
    )
    .addUniqueConstraint('repositories_owner_name_unique', ['owner', 'name'])
    .execute()

  // ===== PULL REQUESTS TABLE =====
  await db.schema
    .createTable('pull_requests')
    .addColumn('id', 'text', (col) =>
      col.primaryKey().defaultTo(sql`uuid_generate_v4()::text`)
    )
    .addColumn('repository_id', 'uuid', (col) =>
      col.references('repositories.id').onDelete('cascade').notNull()
    )
    .addColumn('number', 'integer', (col) => col.notNull())
    .addColumn('title', 'text', (col) => col.notNull())
    .addColumn('state', 'text', (col) => col.notNull())
    .addColumn('created_at', 'timestamp', (col) => col.notNull())
    .addColumn('updated_at', 'timestamp', (col) => col.notNull())
    .addUniqueConstraint('pull_requests_repo_number_unique', [
      'repository_id',
      'number',
    ])
    .execute()

  // Index for repository lookup
  await db.schema
    .createIndex('pull_requests_repository_id_idx')
    .on('pull_requests')
    .column('repository_id')
    .execute()

  // Index for state filtering
  await db.schema
    .createIndex('pull_requests_state_idx')
    .on('pull_requests')
    .columns(['repository_id', 'state'])
    .execute()

  // ===== ANALYSES TABLE =====
  await db.schema
    .createTable('analyses')
    .addColumn('id', 'uuid', (col) =>
      col.primaryKey().defaultTo(sql`uuid_generate_v4()`)
    )
    .addColumn('pr_id', 'text', (col) =>
      col.references('pull_requests.id').onDelete('cascade').notNull()
    )
    .addColumn('risk_score', 'integer', (col) => col.notNull())
    .addColumn('risk_level', 'text', (col) => col.notNull())
    .addColumn('complexity_score', 'integer', (col) => col.notNull())
    .addColumn('complexity_level', 'text', (col) => col.notNull())
    .addColumn('lines_changed', 'integer', (col) => col.notNull())
    .addColumn('files_changed', 'integer', (col) => col.notNull())
    .addColumn('security_score', 'integer', (col) => col.notNull())
    .addColumn('analyzed_at', 'timestamp', (col) => col.notNull())
    .execute()

  // Index for PR lookup
  await db.schema
    .createIndex('analyses_pr_id_idx')
    .on('analyses')
    .column('pr_id')
    .execute()

  // Index for temporal queries
  await db.schema
    .createIndex('analyses_analyzed_at_idx')
    .on('analyses')
    .column('analyzed_at')
    .execute()

  // Index for risk filtering (composite for better performance)
  await db.schema
    .createIndex('analyses_risk_level_analyzed_at_idx')
    .on('analyses')
    .columns(['risk_level', 'analyzed_at'])
    .execute()

  // ===== SECURITY FINDINGS TABLE =====
  await db.schema
    .createTable('security_findings')
    .addColumn('id', 'uuid', (col) =>
      col.primaryKey().defaultTo(sql`uuid_generate_v4()`)
    )
    .addColumn('analysis_id', 'text', (col) =>
      col.references('analyses.id').onDelete('cascade').notNull()
    )
    .addColumn('type', 'text', (col) => col.notNull())
    .addColumn('severity', 'text', (col) => col.notNull())
    .addColumn('message', 'text', (col) => col.notNull())
    .addColumn('file', 'text', (col) => col.notNull())
    .addColumn('line', 'integer')
    .addColumn('snippet', 'text')
    .execute()

  // Index for analysis lookup
  await db.schema
    .createIndex('security_findings_analysis_id_idx')
    .on('security_findings')
    .column('analysis_id')
    .execute()

  // Index for severity filtering (composite for better query performance)
  await db.schema
    .createIndex('security_findings_severity_type_idx')
    .on('security_findings')
    .columns(['severity', 'type'])
    .execute()

  console.log('✅ Initial schema migration completed')
}

export async function down(db: Kysely<Database>): Promise<void> {
  // Drop tables in reverse order (respecting foreign key constraints)
  await db.schema.dropTable('security_findings').execute()
  await db.schema.dropTable('analyses').execute()
  await db.schema.dropTable('pull_requests').execute()
  await db.schema.dropTable('repositories').execute()

  console.log('✅ Initial schema rollback completed')
}
