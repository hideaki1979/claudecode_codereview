/**
 * Repository-Specific Trend Analysis API Route Handler
 *
 * Provides trend data for a specific repository including:
 * - Daily risk score trends
 * - Weekly complexity trends
 * - Security alert trends
 * - Overall trend summary
 *
 * Endpoint: GET /api/trends/[repositoryId]
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
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
 * Route params type
 */
interface RouteParams {
  params: {
    repositoryId: string
  }
}

/**
 * GET /api/trends/[repositoryId] - Get trend data for a specific repository
 *
 * Query Parameters:
 * - type: Trend type (daily-risk | weekly-complexity | security-alerts | summary)
 * - days: Number of days for daily trends (1-365, default: 30)
 * - weeks: Number of weeks for weekly trends (1-52, default: 12)
 *
 * @param request - NextRequest
 * @param params - Route parameters containing repositoryId
 * @returns Trend data response
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  try {
    // Await params to get repositoryId (Next.js 16 async params requirement)
    const { repositoryId } = params

    // Validate repositoryId format (UUID)
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(repositoryId)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid repository ID format',
          code: 'VALIDATION_ERROR',
        },
        { status: HTTP_STATUS.BAD_REQUEST }
      )
    }

    // Parse and validate query parameters
    const { searchParams } = new URL(request.url)
    const queryParams = {
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

    const { type, days, weeks } = validation.data

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
          repositoryId,
          type,
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
