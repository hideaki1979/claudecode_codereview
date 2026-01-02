/**
 * CSV Export Utility
 *
 * Generates CSV exports from weekly report data.
 * Provides multiple sheet types for comprehensive data export.
 */

import type { WeeklyReport } from '../db/reports'

/**
 * Escape CSV value (handle commas, quotes, newlines)
 */
function escapeCSV(value: string | number | null | undefined): string {
  if (value === null || value === undefined) {
    return ''
  }
  const str = String(value)
  // If contains comma, quote, or newline, wrap in quotes and escape existing quotes
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

/**
 * Convert array of objects to CSV string
 */
function arrayToCSV<T extends Record<string, unknown>>(data: T[], headers?: string[]): string {
  if (data.length === 0) {
    return headers ? headers.join(',') + '\n' : ''
  }

  const keys = headers || Object.keys(data[0])
  const headerRow = keys.join(',')

  const dataRows = data.map((row) =>
    keys.map((key) => escapeCSV(row[key] as string | number | null | undefined)).join(',')
  )

  return [headerRow, ...dataRows].join('\n')
}

/**
 * Generate summary CSV from weekly report
 */
export function generateSummaryCSV(report: WeeklyReport): string {
  // Keys must match the headers passed to arrayToCSV
  const summaryData = [
    { Metric: 'Report ID', Value: report.summary.reportId },
    { Metric: 'Repository', Value: `${report.summary.repositoryOwner}/${report.summary.repositoryName}` },
    { Metric: 'Week Start', Value: report.summary.weekStart },
    { Metric: 'Week End', Value: report.summary.weekEnd },
    { Metric: 'Generated At', Value: report.summary.generatedAt },
    { Metric: '', Value: '' },
    { Metric: 'PR Summary', Value: '' },
    { Metric: 'Total PRs Analyzed', Value: report.prSummary.totalPRsAnalyzed },
    { Metric: 'Average Risk Score', Value: report.prSummary.avgRiskScore },
    { Metric: 'Average Complexity Score', Value: report.prSummary.avgComplexityScore },
    { Metric: 'Average Security Score', Value: report.prSummary.avgSecurityScore },
    { Metric: 'Total Lines Changed', Value: report.prSummary.totalLinesChanged },
    { Metric: 'Total Files Changed', Value: report.prSummary.totalFilesChanged },
    { Metric: '', Value: '' },
    { Metric: 'Risk Distribution', Value: '' },
    { Metric: 'Low Risk PRs', Value: report.prSummary.riskDistribution.low },
    { Metric: 'Medium Risk PRs', Value: report.prSummary.riskDistribution.medium },
    { Metric: 'High Risk PRs', Value: report.prSummary.riskDistribution.high },
    { Metric: 'Critical Risk PRs', Value: report.prSummary.riskDistribution.critical },
    { Metric: '', Value: '' },
    { Metric: 'Security Findings', Value: '' },
    { Metric: 'Total Findings', Value: report.securitySummary.totalFindings },
    { Metric: 'Critical', Value: report.securitySummary.criticalCount },
    { Metric: 'High', Value: report.securitySummary.highCount },
    { Metric: 'Medium', Value: report.securitySummary.mediumCount },
    { Metric: 'Low', Value: report.securitySummary.lowCount },
    { Metric: '', Value: '' },
    { Metric: 'Week-over-Week Changes', Value: '' },
    { Metric: 'Risk Score Change (%)', Value: report.comparisonWithPreviousWeek.riskScoreChange },
    { Metric: 'Complexity Change (%)', Value: report.comparisonWithPreviousWeek.complexityChange },
    { Metric: 'Security Findings Change (%)', Value: report.comparisonWithPreviousWeek.securityFindingsChange },
    { Metric: 'PR Count Change (%)', Value: report.comparisonWithPreviousWeek.prCountChange },
  ]

  return arrayToCSV(summaryData, ['Metric', 'Value'])
}

/**
 * Generate top risky PRs CSV
 */
export function generateTopRiskyPRsCSV(report: WeeklyReport): string {
  const headers = ['PR Number', 'Title', 'Risk Score', 'Risk Level', 'Complexity Score', 'Security Findings', 'Analyzed At']

  const data = report.topRiskyPRs.map((pr) => ({
    'PR Number': pr.prNumber,
    Title: pr.prTitle,
    'Risk Score': pr.riskScore,
    'Risk Level': pr.riskLevel,
    'Complexity Score': pr.complexityScore,
    'Security Findings': pr.securityFindings,
    'Analyzed At': pr.analyzedAt,
  }))

  return arrayToCSV(data, headers)
}

/**
 * Generate daily breakdown CSV
 */
export function generateDailyBreakdownCSV(report: WeeklyReport): string {
  const headers = ['Date', 'PRs Analyzed', 'Average Risk Score', 'Security Findings']

  const data = report.dailyBreakdown.map((day) => ({
    Date: day.date,
    'PRs Analyzed': day.prsAnalyzed,
    'Average Risk Score': day.avgRiskScore,
    'Security Findings': day.securityFindings,
  }))

  return arrayToCSV(data, headers)
}

/**
 * Generate finding types CSV
 */
export function generateFindingTypesCSV(report: WeeklyReport): string {
  const headers = ['Finding Type', 'Count']

  const data = report.securitySummary.topFindingTypes.map((finding) => ({
    'Finding Type': finding.type,
    Count: finding.count,
  }))

  return arrayToCSV(data, headers)
}

/**
 * Export type options
 */
export type CSVExportType = 'summary' | 'risky-prs' | 'daily-breakdown' | 'finding-types' | 'full'

/**
 * Generate CSV export based on type
 *
 * @param report - Weekly report data
 * @param exportType - Type of export to generate
 * @returns CSV string
 */
export function generateCSVExport(report: WeeklyReport, exportType: CSVExportType): string {
  switch (exportType) {
    case 'summary':
      return generateSummaryCSV(report)
    case 'risky-prs':
      return generateTopRiskyPRsCSV(report)
    case 'daily-breakdown':
      return generateDailyBreakdownCSV(report)
    case 'finding-types':
      return generateFindingTypesCSV(report)
    case 'full':
      // Combine all CSVs with section headers
      return [
        '=== WEEKLY REPORT SUMMARY ===',
        generateSummaryCSV(report),
        '',
        '=== TOP RISKY PULL REQUESTS ===',
        generateTopRiskyPRsCSV(report),
        '',
        '=== DAILY BREAKDOWN ===',
        generateDailyBreakdownCSV(report),
        '',
        '=== TOP FINDING TYPES ===',
        generateFindingTypesCSV(report),
      ].join('\n')
    default:
      return generateSummaryCSV(report)
  }
}
