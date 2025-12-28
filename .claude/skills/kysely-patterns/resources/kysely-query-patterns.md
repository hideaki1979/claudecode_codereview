# Kysely Query Patterns for Code Review Dashboard

Project-specific query patterns optimized for read-heavy PR analysis workload.

## Dashboard Analytics Queries

### Daily Risk Trend Analysis
```typescript
// Get risk trends over time for trend charts
export async function getDailyRiskTrends(
  repositoryId: string,
  days: number = 30
): Promise<Array<{
  date: string
  avg_risk_score: number
  max_risk_score: number
  pr_count: number
  critical_count: number
}>> {
  // ✅ SECURE: Calculate date in JavaScript to avoid sql.raw() injection risk
  const sinceDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

  return await db
    .selectFrom('analyses as a')
    .innerJoin('pull_requests as pr', 'pr.id', 'a.pr_id')
    .select([
      sql<string>`DATE(a.analyzed_at)`.as('date'),
      sql<number>`AVG(a.risk_score)`.as('avg_risk_score'),
      sql<number>`MAX(a.risk_score)`.as('max_risk_score'),
      sql<number>`COUNT(DISTINCT pr.id)`.as('pr_count'),
      sql<number>`SUM(CASE WHEN a.risk_level = 'critical' THEN 1 ELSE 0 END)`.as('critical_count'),
    ])
    .where('pr.repository_id', '=', repositoryId)
    .where('a.analyzed_at', '>=', sinceDate)
    .groupBy(sql`DATE(a.analyzed_at)`)
    .orderBy('date', 'desc')
    .execute()
}
```

**Required Index**:
```sql
CREATE INDEX idx_analyses_pr_analyzed ON analyses(pr_id, analyzed_at DESC);
CREATE INDEX idx_pr_repository ON pull_requests(repository_id);
```

### Security Findings Aggregation
```typescript
// Get security statistics for dashboard overview
export async function getSecurityStats(
  analysisId: string
): Promise<{
  total: number
  by_severity: Record<string, number>
  by_type: Record<string, number>
}> {
  const findings = await db
    .selectFrom('security_findings')
    .select(['severity', 'type', db.fn.count('id').as('count')])
    .where('analysis_id', '=', analysisId)
    .groupBy(['severity', 'type'])
    .execute()

  return {
    total: findings.reduce((sum, f) => sum + Number(f.count), 0),
    by_severity: Object.fromEntries(
      findings.map(f => [f.severity, Number(f.count)])
    ),
    by_type: Object.fromEntries(
      findings.map(f => [f.type, Number(f.count)])
    ),
  }
}
```

## Efficient Data Fetching Patterns

### Latest Analysis for Multiple PRs
```typescript
// Avoid N+1: Fetch latest analysis for each PR in single query
export async function getLatestAnalysesForPRs(
  prIds: string[]
): Promise<Analysis[]> {
  // Use DISTINCT ON for PostgreSQL-specific optimization
  return await db
    .selectFrom('analyses')
    .distinctOn('pr_id')
    .selectAll()
    .where('pr_id', 'in', prIds)
    .orderBy('pr_id')
    .orderBy('analyzed_at', 'desc')
    .execute()
}
```

### Full PR Context with Relations
```typescript
// Single query to get PR with all related data
export async function getPRWithFullContext(
  owner: string,
  repo: string,
  number: number
) {
  return await db
    .selectFrom('repositories as r')
    .innerJoin('pull_requests as pr', 'pr.repository_id', 'r.id')
    .leftJoin('analyses as a', 'a.pr_id', 'pr.id')
    .select([
      'r.owner',
      'r.name',
      'pr.number',
      'pr.title',
      'pr.state',
      'a.risk_score',
      'a.risk_level',
      'a.analyzed_at',
    ])
    .where('r.owner', '=', owner)
    .where('r.name', '=', repo)
    .where('pr.number', '=', number)
    .orderBy('a.analyzed_at', 'desc')
    .limit(1)
    .executeTakeFirst()
}
```

## Performance Optimization Patterns

### Pagination with Total Count
```typescript
// Efficient pagination that also returns total count
export async function paginateAnalyses(
  filters: { riskLevel?: string },
  page: number = 1,
  pageSize: number = 20
) {
  const offset = (page - 1) * pageSize

  // Run count and data queries in parallel
  const [total, data] = await Promise.all([
    db
      .selectFrom('analyses')
      .select(db.fn.count('id').as('count'))
      .$if(Boolean(filters.riskLevel), (qb) =>
        qb.where('risk_level', '=', filters.riskLevel!)
      )
      .executeTakeFirstOrThrow()
      .then(r => Number(r.count)),

    db
      .selectFrom('analyses')
      .selectAll()
      .$if(Boolean(filters.riskLevel), (qb) =>
        qb.where('risk_level', '=', filters.riskLevel!)
      )
      .orderBy('analyzed_at', 'desc')
      .limit(pageSize)
      .offset(offset)
      .execute(),
  ])

  return {
    data,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  }
}
```

### Batch Upsert Pattern
```typescript
// Efficient bulk upsert for updating/inserting multiple records
export async function upsertRepositories(
  repositories: Array<{ owner: string; name: string }>
): Promise<Repository[]> {
  return await db
    .insertInto('repositories')
    .values(repositories)
    .onConflict((oc) =>
      oc
        .columns(['owner', 'name'])
        .doUpdateSet({
          updated_at: sql`CURRENT_TIMESTAMP`,
        })
    )
    .returningAll()
    .execute()
}
```

## Type-Safe Dynamic Query Building

### LIKE Pattern Escaping

```typescript
// ✅ SECURE: Escape special characters in LIKE patterns
// Prevents unintended wildcard matching when user input contains %, _, or \
function escapeLikePattern(value: string): string {
  return value.replace(/[%_\\]/g, '\\$&')
}

// Usage: Always escape user input before using in LIKE/ILIKE patterns
const searchPattern = `%${escapeLikePattern(userInput)}%`
```

### Complex Filter Builder

```typescript
// ✅ SECURE: Escape LIKE pattern special characters
function escapeLikePattern(value: string): string {
  return value.replace(/[%_\\]/g, '\\$&')
}

export async function searchPRs(filters: {
  repositoryId?: string
  state?: 'open' | 'closed' | 'merged'
  minRiskScore?: number
  hasFindings?: boolean
  search?: string
}) {
  let query = db
    .selectFrom('pull_requests as pr')
    .leftJoin('analyses as a', 'a.pr_id', 'pr.id')
    .select([
      'pr.id',
      'pr.number',
      'pr.title',
      'pr.state',
      'a.risk_score',
      'a.risk_level',
    ])

  // Apply filters conditionally with type safety
  if (filters.repositoryId) {
    query = query.where('pr.repository_id', '=', filters.repositoryId)
  }

  if (filters.state) {
    query = query.where('pr.state', '=', filters.state)
  }

  if (filters.minRiskScore !== undefined) {
    query = query.where('a.risk_score', '>=', filters.minRiskScore)
  }

  if (filters.hasFindings) {
    query = query
      .innerJoin('security_findings as sf', 'sf.analysis_id', 'a.id')
      .where('sf.severity', 'in', ['high', 'critical'])
  }

  if (filters.search) {
    // ✅ SECURE: Escape user input to prevent wildcard injection
    const escapedSearch = escapeLikePattern(filters.search)
    query = query.where((eb) =>
      eb.or([
        eb('pr.title', 'ilike', `%${escapedSearch}%`),
        eb('pr.number', '=', parseInt(filters.search) || 0),
      ])
    )
  }

  return await query
    .orderBy('a.analyzed_at', 'desc')
    .execute()
}
```

## Anti-Patterns to Avoid

### ❌ Don't: Multiple round trips to database

```typescript
// BAD: N+1 query
for (const pr of pullRequests) {
  const analysis = await db.selectFrom('analyses').where('pr_id', '=', pr.id).executeTakeFirst()
  const findings = await db.selectFrom('security_findings').where('analysis_id', '=', analysis.id).execute()
}

// GOOD: Single query with JOIN
const results = await db
  .selectFrom('pull_requests as pr')
  .leftJoin('analyses as a', 'a.pr_id', 'pr.id')
  .leftJoin('security_findings as sf', 'sf.analysis_id', 'a.id')
  .selectAll(['pr', 'a'])
  .select(['sf.id as finding_id', 'sf.severity'])
  .execute()
```

### ❌ Don't: Select all columns from all tables

```typescript
// BAD: Ambiguous column names
const result = await db
  .selectFrom('analyses')
  .innerJoin('pull_requests', ...)
  .selectAll() // Which 'id'? Which 'created_at'?
  .execute()

// GOOD: Explicit column selection
const result = await db
  .selectFrom('analyses as a')
  .innerJoin('pull_requests as pr', ...)
  .selectAll('a')
  .select(['pr.number', 'pr.title'])
  .execute()
```

### ❌ Don't: Build SQL strings manually

```typescript
// BAD: SQL injection risk
const riskLevel = req.query.risk
const results = await sql`SELECT * FROM analyses WHERE risk_level = ${riskLevel}`.execute(db)

// GOOD: Parameterized query
const results = await db
  .selectFrom('analyses')
  .selectAll()
  .where('risk_level', '=', riskLevel)
  .execute()
```

## References

- Project database schema: `database/migrations/001_initial_schema.ts`
- Type definitions: `src/lib/db/types.ts`
- CRUD operations: `src/lib/db/`
