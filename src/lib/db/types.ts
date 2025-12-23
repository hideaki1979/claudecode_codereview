/**
 * Database schema type definitions for Kysely
 *
 * This file defines the TypeScript types for all database tables.
 * Kysely uses these types to provide type-safe query building.
 */

export interface Database {
  /**
   * Repositories table
   * Stores GitHub repository information
   */
  repositories: {
    id: string
    owner: string
    name: string
    created_at: Date
  }

  /**
   * Pull Requests table
   * Stores GitHub PR metadata
   */
  pull_requests: {
    id: string
    repository_id: string
    number: number
    title: string
    state: 'open' | 'closed' | 'merged'
    created_at: Date
    updated_at: Date
  }

  /**
   * Analyses table
   * Stores PR analysis results
   */
  analyses: {
    id: string
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

  /**
   * Security Findings table
   * Stores detected security issues
   */
  security_findings: {
    id: string
    analysis_id: string
    type: string
    severity: 'low' | 'medium' | 'high' | 'critical'
    message: string
    file: string
    line: number | null
    snippet: string | null
  }
}
