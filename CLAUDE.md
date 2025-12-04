# Code Review Dashboard - Project Context

## Project Overview

A Next.js-based GitHub Pull Request analysis dashboard that automatically evaluates code quality and security vulnerabilities.

**Stack**: Next.js 16 (App Router), TypeScript, React, Tailwind CSS, Octokit

## Project Structure

```tree
code-review-dashboard/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/reviews/        # API endpoints for PR analysis
│   │   ├── dashboard/          # Dashboard UI
│   │   └── layout.tsx          # Root layout
│   ├── components/             # React components
│   │   ├── ReviewCard.tsx      # PR review display
│   │   ├── SecurityBadge.tsx   # Security score indicator
│   │   └── QualityMetrics.tsx  # Code quality visualization
│   ├── lib/                    # Utility functions
│   │   ├── github.ts           # GitHub API client
│   │   ├── analyzer.ts         # Code analysis logic
│   │   └── db.ts               # Database operations
│   └── types/                  # TypeScript type definitions
├── .claude/
│   ├── agents/                 # Sub-agents
│   └── skills/                 # Custom skills
└── agent_docs/                 # Additional documentation
```

## How to Work on This Project

### Running the Development Server

```bash
npm run dev
# Runs on http://localhost:3000
```

### Testing

```bash
npm run test        # Run tests
npm run test:watch  # Watch mode
npm run type-check  # TypeScript validation
```

### Building

```bash
npm run build       # Production build
npm run start       # Run production server
```

## Key Conventions

1. **Component Organization**: Use Server Components by default, add `'use client'` only when needed
2. **Type Safety**: All functions and components must have explicit TypeScript types
3. **API Routes**: Follow REST conventions, use proper HTTP status codes
4. **Error Handling**: Use try-catch with meaningful error messages
5. **Validation**: Use Zod for runtime validation

## Specialized Agents

When working on this project, you have access to specialized sub-agents:

- **security-reviewer**: Use when implementing authentication, API endpoints, or handling sensitive data
- **code-quality-analyzer**: Use before finalizing implementations or during refactoring

Invoke them explicitly: "Use security-reviewer to check this authentication flow"

## Skills

- **typescript-best-practices**: Automatically active for TypeScript/Next.js code

## Important Reference Documents

For detailed context on specific areas:

- `agent_docs/github_integration.md` - GitHub API integration patterns
- `agent_docs/security_requirements.md` - Security requirements and compliance
- `agent_docs/architecture.md` - System architecture and data flow

Read these files when working on related features.

## Database Schema

We use SQLite for development. Connection details in `.env.local`:

```bash
DATABASE_URL="file:./dev.db"
GITHUB_TOKEN="your_token_here"
```

Main tables:

- `pull_requests` - PR metadata
- `reviews` - Review results
- `security_findings` - Security vulnerability records

## Notes

- Never commit `.env.local`
- Run `npm run lint` before committing
- Security findings must be encrypted before storage
- All API routes require authentication
