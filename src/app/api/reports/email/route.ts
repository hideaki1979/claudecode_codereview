/**
 * Report Email API Endpoint
 *
 * POST /api/reports/email - Send weekly report via email
 * Body:
 *   - owner: Repository owner (required)
 *   - repo: Repository name (required)
 *   - weeksAgo: Number of weeks in the past (default: 0)
 *   - to: Email recipient(s) (required)
 *   - attachPDF: Whether to attach PDF (default: false)
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { generateWeeklyReport } from '@/lib/db/reports'
import { sendWeeklyReportEmail, isEmailConfigured } from '@/lib/email'
import { generateReportPDF } from '@/lib/export/pdf'

// Request body validation schema
// Note: 'from' is intentionally NOT configurable by clients to prevent email spoofing
const bodySchema = z.object({
  owner: z.string().min(1, 'Owner is required'),
  repo: z.string().min(1, 'Repository name is required'),
  weeksAgo: z.number().int().min(0).max(52).default(0),
  to: z.union([z.string().email(), z.array(z.string().email())]),
  attachPDF: z.boolean().default(false),
  replyTo: z.string().email().optional(),
})

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Check if email is configured
    if (!isEmailConfigured()) {
      return NextResponse.json(
        {
          error: 'Email service not configured',
          message: 'RESEND_API_KEY environment variable is not set',
        },
        { status: 503 }
      )
    }

    // Parse and validate request body
    const body = await request.json()
    const validation = bodySchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Invalid request body',
          details: validation.error.issues.map((issue) => ({
            field: issue.path.join('.'),
            message: issue.message,
          })),
        },
        { status: 400 }
      )
    }

    const { owner, repo, weeksAgo, to, attachPDF, replyTo } = validation.data

    // Generate the report
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

    // Generate PDF if requested (async - loads Japanese font dynamically)
    let pdfData: string | undefined
    if (attachPDF) {
      pdfData = await generateReportPDF(report)
    }

    // Send email (from address is fixed server-side to prevent spoofing)
    const result = await sendWeeklyReportEmail(to, report, {
      replyTo,
      attachPDF,
      pdfData,
    })

    if (!result.success) {
      return NextResponse.json(
        {
          error: 'Failed to send email',
          message: result.error,
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      emailId: result.id,
      recipients: Array.isArray(to) ? to : [to],
      reportId: report.summary.reportId,
      message: 'Email sent successfully',
    })
  } catch (error) {
    console.error('Email send error:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/reports/email - Check email service status
 */
export async function GET(): Promise<NextResponse> {
  return NextResponse.json({
    configured: isEmailConfigured(),
    message: isEmailConfigured()
      ? 'Email service is configured and ready'
      : 'Email service is not configured. Set RESEND_API_KEY environment variable.',
  })
}
