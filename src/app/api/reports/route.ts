/**
 * Weekly Report API Endpoint
 *
 * GET /api/reports - Generate or retrieve weekly report
 * Query params:
 *   - owner: Repository owner (required)
 *   - repo: Repository name (required)
 *   - weeksAgo: Number of weeks in the past (default: 0 = current week)
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { generateWeeklyReport, getAvailableReportWeeks } from '@/lib/db/reports'

// Query parameter validation schema
const querySchema = z.object({
  owner: z.string().min(1, 'Owner is required'),
  repo: z.string().min(1, 'Repository name is required'),
  weeksAgo: z
    .string()
    .regex(/^\d+$/, 'weeksAgo must be a non-negative integer')
    .transform(Number)
    .refine((val) => val >= 0 && val <= 52, {
      message: 'weeksAgo must be between 0 and 52',
    })
    .optional()
    .default(0),
  type: z
    .enum(['report', 'available-weeks'])
    .optional()
    .default('report'),
})

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url)

    // Parse and validate query parameters
    const params = {
      owner: searchParams.get('owner') || '',
      repo: searchParams.get('repo') || '',
      weeksAgo: searchParams.get('weeksAgo') || '0',
      type: searchParams.get('type') || 'report',
    }

    const validation = querySchema.safeParse(params)
    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Invalid parameters',
          details: validation.error.issues.map((issue) => ({
            field: issue.path.join('.'),
            message: issue.message,
          })),
        },
        { status: 400 }
      )
    }

    const { owner, repo, weeksAgo, type } = validation.data

    // Handle different request types
    if (type === 'available-weeks') {
      const weeks = await getAvailableReportWeeks(owner, repo)
      return NextResponse.json({
        owner,
        repo,
        availableWeeks: weeks,
      })
    }

    // Generate weekly report
    const report = await generateWeeklyReport(owner, repo, weeksAgo)

    if (!report) {
      return NextResponse.json(
        {
          error: 'Repository not found',
          message: `No repository found for ${owner}/${repo}`,
        },
        { status: 404 }
      )
    }

    return NextResponse.json(report, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      },
    })
  } catch (error) {
    console.error('Report generation error:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
