---
name: kysely-patterns
description: Kysely and PostgreSQL best practices for type-safe database operations in this project
allowed-tools:
  - Read
  - Edit
  - Bash
---

# Kysely Patterns Skill

This skill provides comprehensive guidance for writing type-safe database operations using Kysely with PostgreSQL, specifically tailored for the Code Review Dashboard project.

## Core Principles

### Type Safety

- Leverage TypeScript's type inference for compile-time query validation
- Avoid type assertions and `any` types in database operations
- Maintain synchronized types between database schema and TypeScript interfaces
- Use discriminated unions for query result types

### Performance

- Optimize for read-heavy workload (90% reads, 10% writes)
- Use proper indexes for common query patterns
- Avoid N+1 queries with JOIN operations
- Batch operations when performing bulk inserts/updates

### Data Integrity

- Use database constraints (FOREIGN KEY, UNIQUE, NOT NULL)
- Implement CASCADE/RESTRICT policies appropriately
- Validate data at database level, not just application level
- Design reversible migrations for safe schema changes

## Common Patterns

### 1. Basic CRUD Operations

**Find by ID** (Type-safe single record retrieval)
```typescript
// ✅ Good: Type-safe with proper error handling
export async function findAnalysisById(
  id: string
): Promise<Analysis | undefined> {
  return await db
    .selectFrom('analyses')
    .selectAll()
    .where('id', '=', id)
    .executeTakeFirst()
}

// ❌ Bad: Throws on not found
const result = await db
  .selectFrom('analyses')
  .selectAll()
  .where('id', '=', id)
  .executeTakeFirstOrThrow() // Don't use unless you want to throw
```

**Find or Create** (Upsert pattern)
```typescript
// ✅ Good: Atomic find-or-create with type safety
export async function findOrCreateRepository(
  repository: NewRepository
): Promise<Repository> {
  const existing = await db
    .selectFrom('repositories')
    .selectAll()
    .where('owner', '=', repository.owner)
    .where('name', '=', repository.name)
    .executeTakeFirst()

  if (existing) {
    return existing
  }

  return await db
    .insertInto('repositories')
    .values(repository)
    .returningAll()
    .executeTakeFirstOrThrow()
}
```

**List with Pagination**
```typescript
// ✅ Good: Efficient pagination with proper types
export async function listAnalysesByRiskLevel(
  riskLevel: 'low' | 'medium' | 'high' | 'critical',
  options?: {
    limit?: number
    offset?: number
  }
): Promise<Analysis[]> {
  const { limit = 100, offset = 0 } = options || {}

  return await db
    .selectFrom('analyses')
    .selectAll()
    .where('risk_level', '=', riskLevel)
    .orderBy('analyzed_at', 'desc')
    .limit(limit)
    .offset(offset)
    .execute()
}
```

### 2. JOIN Operations

**Inner Join with Type Safety**
```typescript
// ✅ Good: Explicit column selection for clear types
export async function getAnalysesWithPR(
  repositoryId: string
): Promise<AnalysisWithPR[]> {
  return await db
    .selectFrom('analyses as a')
    .innerJoin('pull_requests as pr', 'pr.id', 'a.pr_id')
    .select([
      'a.id as analysis_id',
      'a.risk_score',
      'a.risk_level',
      'pr.id as pr_id',
      'pr.number as pr_number',
      'pr.title as pr_title',
    ])
    .where('pr.repository_id', '=', repositoryId)
    .orderBy('a.analyzed_at', 'desc')
    .execute()
}

// ❌ Bad: selectAll() loses type clarity
const results = await db
  .selectFrom('analyses')
  .innerJoin('pull_requests', ...)
  .selectAll() // Which table's columns?
  .execute()
```

### 3. Aggregation Queries

**Complex Analytics with CTEs**
```typescript
// ✅ Good: Type-safe aggregation with proper SQL expressions
export async function getDailyRiskTrends(
  repositoryId: string,
  days: number = 30
): Promise<RiskTrendData[]> {
  return await db
    .selectFrom('analyses as a')
    .innerJoin('pull_requests as pr', 'pr.id', 'a.pr_id')
    .select([
      sql<string>`DATE(a.analyzed_at)`.as('date'),
      sql<number>`AVG(a.risk_score)`.as('avg_risk_score'),
      sql<number>`MAX(a.risk_score)`.as('max_risk_score'),
      sql<number>`COUNT(DISTINCT pr.id)`.as('pr_count'),
    ])
    .where('pr.repository_id', '=', repositoryId)
    .where('a.analyzed_at', '>=',
      sql`CURRENT_DATE - INTERVAL '${sql.raw(days.toString())} days'`
    )
    .groupBy(sql`DATE(a.analyzed_at)`)
    .orderBy('date', 'desc')
    .execute()
}
```

### 4. Batch Operations

**Bulk Insert with Type Safety**
```typescript
// ✅ Good: Efficient bulk insert
export async function createSecurityFindings(
  findings: NewSecurityFinding[]
): Promise<SecurityFinding[]> {
  if (findings.length === 0) {
    return []
  }

  return await db
    .insertInto('security_findings')
    .values(findings)
    .returningAll()
    .execute()
}

// ❌ Bad: Multiple individual inserts (N+1 problem)
for (const finding of findings) {
  await db.insertInto('security_findings').values(finding).execute()
}
```

### 5. Dynamic Queries

**Conditional Filtering**
```typescript
// ✅ Good: Type-safe dynamic query building
export async function searchAnalyses(filters: {
  riskLevel?: 'low' | 'medium' | 'high' | 'critical'
  since?: Date
  repositoryId?: string
}): Promise<Analysis[]> {
  let query = db
    .selectFrom('analyses as a')
    .selectAll()

  // Apply optional filters
  if (filters.riskLevel) {
    query = query.where('a.risk_level', '=', filters.riskLevel)
  }

  if (filters.since) {
    query = query.where('a.analyzed_at', '>=', filters.since)
  }

  if (filters.repositoryId) {
    query = query
      .innerJoin('pull_requests as pr', 'pr.id', 'a.pr_id')
      .where('pr.repository_id', '=', filters.repositoryId)
  }

  return await query
    .orderBy('a.analyzed_at', 'desc')
    .execute()
}
```

## Migration Patterns

### Creating Migrations

```typescript
// migrations/001_initial_schema.ts
import { Kysely, sql } from 'kysely'

export async function up(db: Kysely<any>): Promise<void> {
  // Create extension
  await db.schema
    .createType('pr_state')
    .asEnum(['open', 'closed', 'merged'])
    .execute()

  // Create table
  await db.schema
    .createTable('repositories')
    .addColumn('id', 'uuid', (col) =>
      col.primaryKey().defaultTo(sql`gen_random_uuid()`)
    )
    .addColumn('owner', 'text', (col) => col.notNull())
    .addColumn('name', 'text', (col) => col.notNull())
    .addColumn('created_at', 'timestamp', (col) =>
      col.defaultTo(sql`CURRENT_TIMESTAMP`).notNull()
    )
    .addUniqueConstraint('repositories_owner_name_unique', ['owner', 'name'])
    .execute()

  // Create index
  await db.schema
    .createIndex('repositories_owner_name_idx')
    .on('repositories')
    .columns(['owner', 'name'])
    .execute()
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable('repositories').execute()
  await db.schema.dropType('pr_state').execute()
}
```

### Adding Indexes

```typescript
// migrations/003_add_performance_indexes.ts
export async function up(db: Kysely<any>): Promise<void> {
  // Covering index for common query pattern
  await db.schema
    .createIndex('idx_analyses_pr_analyzed')
    .on('analyses')
    .columns(['pr_id', 'analyzed_at'])
    .execute()

  // Partial index for active PRs only
  await db.schema
    .createIndex('idx_pr_open_state')
    .on('pull_requests')
    .columns(['repository_id', 'state'])
    .where(sql`state = 'open'`)
    .execute()
}
```

## Performance Guidelines

### Index Strategy

**✅ Good: Index for common queries**
```sql
-- Query: Fetch latest analyses for a PR
SELECT * FROM analyses
WHERE pr_id = ?
ORDER BY analyzed_at DESC
LIMIT 10;

-- Index: Covers WHERE + ORDER BY
CREATE INDEX idx_analyses_pr_analyzed
ON analyses(pr_id, analyzed_at DESC);
```

**✅ Good: Composite index for multi-column filters**
```sql
-- Query: Filter by repository and state
SELECT * FROM pull_requests
WHERE repository_id = ? AND state = 'open';

-- Index: Covers both columns
CREATE INDEX idx_pr_repo_state
ON pull_requests(repository_id, state);
```

### Query Optimization

**Avoid N+1 Queries**
```typescript
// ❌ Bad: N+1 query problem
const pullRequests = await db.selectFrom('pull_requests').execute()
for (const pr of pullRequests) {
  const analysis = await db
    .selectFrom('analyses')
    .where('pr_id', '=', pr.id)
    .executeTakeFirst()
}

// ✅ Good: Single query with JOIN
const results = await db
  .selectFrom('pull_requests as pr')
  .leftJoin('analyses as a', 'a.pr_id', 'pr.id')
  .selectAll('pr')
  .select(['a.risk_score', 'a.risk_level'])
  .execute()
```

## Type Safety Best Practices

### Maintaining Type Definitions

```typescript
// src/lib/db/types.ts
import type { ColumnType, Selectable, Insertable, Updateable } from 'kysely'

// Database schema interface
export interface Database {
  repositories: RepositoryTable
  pull_requests: PullRequestTable
  analyses: AnalysisTable
  security_findings: SecurityFindingTable
}

// Table interface with all columns
export interface AnalysisTable {
  id: ColumnType<string, string | undefined, never>
  pr_id: string
  risk_score: number
  risk_level: 'low' | 'medium' | 'high' | 'critical'
  analyzed_at: ColumnType<Date, Date | string, Date | string>
}

// Helper types for different operations
export type Analysis = Selectable<AnalysisTable>
export type NewAnalysis = Insertable<AnalysisTable>
export type AnalysisUpdate = Updateable<AnalysisTable>
```

## Common Pitfalls to Avoid

### ❌ Don't: Use selectAll() without table prefix
```typescript
// Ambiguous columns in JOINs
const result = await db
  .selectFrom('analyses')
  .innerJoin('pull_requests', ...)
  .selectAll() // Which 'id'? Which 'created_at'?
  .execute()
```

### ❌ Don't: Forget to handle undefined results
```typescript
// Will crash if analysis doesn't exist
const analysis = await db
  .selectFrom('analyses')
  .selectAll()
  .where('id', '=', id)
  .executeTakeFirstOrThrow() // Throws error instead of returning undefined
```

### ❌ Don't: Construct SQL strings manually
```typescript
// SQL injection vulnerability
const riskLevel = userInput
const query = sql`SELECT * FROM analyses WHERE risk_level = ${riskLevel}`

// ✅ Use parameterized queries
const results = await db
  .selectFrom('analyses')
  .selectAll()
  .where('risk_level', '=', riskLevel) // Automatically parameterized
  .execute()
```

## Testing Database Operations

```typescript
// tests/db/analyses.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '@/lib/db/kysely'
import { createAnalysis } from '@/lib/db/analyses'

describe('createAnalysis', () => {
  beforeEach(async () => {
    // Clean up test data
    await db.deleteFrom('analyses').execute()
  })

  it('should create analysis with proper types', async () => {
    const newAnalysis = {
      pr_id: 'test-pr-id',
      risk_score: 75,
      risk_level: 'high' as const,
      complexity_score: 8,
      analyzed_at: new Date(),
    }

    const result = await createAnalysis(newAnalysis)

    expect(result.id).toBeDefined()
    expect(result.risk_level).toBe('high')
    expect(result.risk_score).toBe(75)
  })
})
```

## Resources

- [Kysely Documentation](https://kysely.dev/)
- [PostgreSQL Performance Tips](https://wiki.postgresql.org/wiki/Performance_Optimization)
- Project-specific query patterns in `resources/kysely-query-patterns.md`

## When to Use This Skill

- Creating new database operations (CRUD, queries)
- Optimizing slow database queries
- Writing migrations for schema changes
- Reviewing database-related code for type safety
- Implementing complex analytical queries
