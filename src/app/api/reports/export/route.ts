/**
 * Report Export API Endpoint
 *
 * GET /api/reports/export - Export report as PDF or CSV
 * Query params:
 *   - owner: Repository owner (required)
 *   - repo: Repository name (required)
 *   - weeksAgo: Number of weeks in the past (default: 0)
 *   - format: Export format ('pdf' | 'csv')
 *   - csvType: CSV export type ('summary' | 'risky-prs' | 'daily-breakdown' | 'finding-types' | 'full')
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { generateWeeklyReport } from '@/lib/db/reports'
import { generateReportPDF } from '@/lib/export/pdf'
import { generateCSVExport, type CSVExportType } from '@/lib/export/csv'

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
  format: z.enum(['pdf', 'csv']).default('pdf'),
  csvType: z
    .enum(['summary', 'risky-prs', 'daily-breakdown', 'finding-types', 'full'])
    .optional()
    .default('summary'),
})

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url)

    // Parse and validate query parameters
    const params = {
      owner: searchParams.get('owner') || '',
      repo: searchParams.get('repo') || '',
      weeksAgo: searchParams.get('weeksAgo') || '0',
      format: searchParams.get('format') || 'pdf',
      csvType: searchParams.get('csvType') || 'summary',
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

    const { owner, repo, weeksAgo, format, csvType } = validation.data

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

    // Generate filename
    const filename = `${owner}-${repo}-report-${report.summary.weekStart}`

    if (format === 'pdf') {
      // Generate PDF (async - loads Japanese font dynamically)
      const pdfBase64 = await generateReportPDF(report)
      const pdfBuffer = Buffer.from(pdfBase64, 'base64')

      return new NextResponse(pdfBuffer, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${filename}.pdf"`,
          'Content-Length': pdfBuffer.length.toString(),
        },
      })
    } else {
      // Generate CSV
      const csvContent = generateCSVExport(report, csvType as CSVExportType)

      return new NextResponse(csvContent, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="${filename}-${csvType}.csv"`,
        },
      })
    }
  } catch (error) {
    console.error('Report export error:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
