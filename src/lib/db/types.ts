/**
 * Database schema type definitions for Kysely
 *
 * This file defines the TypeScript types for all database tables.
 * Kysely uses these types to provide type-safe query building.
 *
 * Key concepts:
 * - Generated<T>: For auto-generated fields (e.g., UUID primary keys)
 * - ColumnType<S, I, U>: For columns with different select/insert/update types
 * - Selectable<T>: Type for SELECT results (unwraps Generated)
 * - Insertable<T>: Type for INSERT values (Generated fields become optional)
 * - Updateable<T>: Type for UPDATE values
 */

import {
  ColumnType,
  Generated,
  Insertable,
  Selectable,
  Updateable,
} from 'kysely'

/**
 * Repositories table
 * Stores GitHub repository information
 */
export interface RepositoryTable {
  id: Generated<string>
  owner: string
  name: string
  created_at: ColumnType<Date, string | undefined, never>
}

export type Repository = Selectable<RepositoryTable>
export type NewRepository = Insertable<RepositoryTable>
export type RepositoryUpdate = Updateable<RepositoryTable>

/**
 * Pull Requests table
 * Stores GitHub PR metadata
 */
export interface PullRequestTable {
  id: Generated<string>
  repository_id: string
  number: number
  title: string
  state: 'open' | 'closed' | 'merged'
  created_at: Date
  updated_at: Date
}

export type PullRequest = Selectable<PullRequestTable>
export type NewPullRequest = Insertable<PullRequestTable>
export type PullRequestUpdate = Updateable<PullRequestTable>

/**
 * Analyses table
 * Stores PR analysis results
 */
export interface AnalysisTable {
  id: Generated<string>
  pr_id: string
  risk_score: number
  risk_level: 'low' | 'medium' | 'high' | 'critical'
  complexity_score: number
  complexity_level: 'low' | 'medium' | 'high'
  lines_changed: number
  files_changed: number
  security_score: number
  analyzed_at: Date
}

export type Analysis = Selectable<AnalysisTable>
export type NewAnalysis = Insertable<AnalysisTable>
export type AnalysisUpdate = Updateable<AnalysisTable>

/**
 * Security Findings table
 * Stores detected security issues
 */
export interface SecurityFindingTable {
  id: Generated<string>
  analysis_id: string
  type: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  message: string
  file: string
  line: number | null
  snippet: string | null
}

export type SecurityFinding = Selectable<SecurityFindingTable>
export type NewSecurityFinding = Insertable<SecurityFindingTable>
export type SecurityFindingUpdate = Updateable<SecurityFindingTable>

/**
 * Database interface mapping table names to their types
 */
export interface Database {
  repositories: RepositoryTable
  pull_requests: PullRequestTable
  analyses: AnalysisTable
  security_findings: SecurityFindingTable
}
