/**
 * General Trend Analysis API Route Handler
 *
 * Provides aggregated trend data across repositories or for specific repositories
 * when filtering by owner/repo parameters.
 *
 * Endpoint: GET /api/trends
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db/kysely'
import {
  getDailyRiskTrend,
  getWeeklyComplexityTrend,
  getSecurityAlertTrend,
  getOverallTrendSummary,
} from '@/lib/db/trends'
import { HTTP_STATUS } from '@/types/api'

/**
 * Query parameter validation schema
 */
const trendsQuerySchema = z.object({
  owner: z.string().min(1).optional(),
  repo: z.string().min(1).optional(),
  type: z
    .enum(['daily-risk', 'weekly-complexity', 'security-alerts', 'summary'])
    .optional()
    .default('summary'),
  days: z
    .string()
    .regex(/^\d+$/, 'Days must be a positive number')
    .transform(Number)
    .refine((val) => val > 0 && val <= 365, {
      message: 'Days must be between 1 and 365',
    })
    .optional()
    .default(30),
  weeks: z
    .string()
    .regex(/^\d+$/, 'Weeks must be a positive number')
    .transform(Number)
    .refine((val) => val > 0 && val <= 52, {
      message: 'Weeks must be between 1 and 52',
    })
    .optional()
    .default(12),
})

/**
 * GET /api/trends - Get trend data across repositories or for a specific repository
 *
 * Query Parameters:
 * - owner: Repository owner (optional, requires repo)
 * - repo: Repository name (optional, requires owner)
 * - type: Trend type (daily-risk | weekly-complexity | security-alerts | summary)
 * - days: Number of days for daily trends (1-365, default: 30)
 * - weeks: Number of weeks for weekly trends (1-52, default: 12)
 *
 * @param request - NextRequest
 * @returns Trend data response
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Parse and validate query parameters
    const { searchParams } = new URL(request.url)
    const queryParams = {
      owner: searchParams.get('owner') || undefined,
      repo: searchParams.get('repo') || undefined,
      type: searchParams.get('type') || undefined,
      days: searchParams.get('days') || undefined,
      weeks: searchParams.get('weeks') || undefined,
    }

    const validation = trendsQuerySchema.safeParse(queryParams)

    if (!validation.success) {
      const firstError = validation.error.issues[0]
      return NextResponse.json(
        {
          success: false,
          error: firstError.message,
          code: 'VALIDATION_ERROR',
          details: validation.error.message,
        },
        { status: HTTP_STATUS.BAD_REQUEST }
      )
    }

    const { owner, repo, type, days, weeks } = validation.data

    // Validate that both owner and repo are provided together
    if ((owner && !repo) || (!owner && repo)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Both owner and repo must be provided together',
          code: 'VALIDATION_ERROR',
        },
        { status: HTTP_STATUS.BAD_REQUEST }
      )
    }

    // If owner and repo are provided, find the repository ID
    let repositoryId: string | undefined

    if (owner && repo) {
      const repository = await db
        .selectFrom('repositories')
        .select('id')
        .where('owner', '=', owner)
        .where('name', '=', repo)
        .executeTakeFirst()

      if (!repository) {
        return NextResponse.json(
          {
            success: false,
            error: 'Repository not found',
            code: 'NOT_FOUND',
          },
          { status: HTTP_STATUS.NOT_FOUND }
        )
      }

      repositoryId = repository.id
    }

    // If no specific repository, return aggregated trends across all repositories
    if (!repositoryId) {
      // For now, return an error indicating this feature is not yet implemented
      // In the future, this could aggregate data across all repositories
      return NextResponse.json(
        {
          success: false,
          error: 'Aggregated trends across all repositories not yet supported. Please specify owner and repo parameters.',
          code: 'NOT_IMPLEMENTED',
        },
        { status: HTTP_STATUS.NOT_FOUND }
      )
    }

    // Fetch trend data based on type
    let trendData: unknown

    switch (type) {
      case 'daily-risk':
        trendData = await getDailyRiskTrend(repositoryId, days)
        break

      case 'weekly-complexity':
        trendData = await getWeeklyComplexityTrend(repositoryId, weeks)
        break

      case 'security-alerts':
        trendData = await getSecurityAlertTrend(repositoryId, days)
        break

      case 'summary':
        trendData = await getOverallTrendSummary(repositoryId, days)
        break

      default:
        return NextResponse.json(
          {
            success: false,
            error: 'Invalid trend type',
            code: 'VALIDATION_ERROR',
          },
          { status: HTTP_STATUS.BAD_REQUEST }
        )
    }

    // Return successful response with caching headers
    return NextResponse.json(
      {
        success: true,
        data: {
          repository: {
            id: repositoryId,
            owner,
            name: repo,
          },
          type,
          period: {
            days,
            weeks,
          },
          trend: trendData,
        },
      },
      {
        status: HTTP_STATUS.OK,
        headers: {
          // Cache for 5 minutes, allow stale for 10 minutes
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
          // Vercel CDN headers
          'CDN-Cache-Control': 'public, s-maxage=300',
          'Vercel-CDN-Cache-Control': 'public, s-maxage=300',
        },
      }
    )
  } catch (error) {
    console.error('Trends API error:', error)

    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_SERVER_ERROR',
        // Include details only in development
        ...(process.env.NODE_ENV === 'development' && {
          details: error instanceof Error ? error.message : 'Unknown error',
        }),
      },
      { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
    )
  }
}
