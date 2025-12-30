/**
 * PDF Export Utility
 *
 * Generates PDF reports using jsPDF.
 * Provides formatted weekly report documents with charts and tables.
 */

import { jsPDF } from 'jspdf'
import type { WeeklyReport } from '../db/reports'

/**
 * Generate a PDF report from weekly report data
 *
 * @param report - Weekly report data
 * @returns Base64 encoded PDF data
 */
export function generateReportPDF(report: WeeklyReport): string {
  const doc = new jsPDF('p', 'mm', 'a4')
  const pageWidth = doc.internal.pageSize.getWidth()
  const margin = 20
  let yPos = margin

  // Helper function to add a new page if needed
  const checkPageBreak = (height: number) => {
    if (yPos + height > doc.internal.pageSize.getHeight() - margin) {
      doc.addPage()
      yPos = margin
    }
  }

  // Title
  doc.setFontSize(24)
  doc.setFont('helvetica', 'bold')
  doc.text('Weekly Code Review Report', pageWidth / 2, yPos, { align: 'center' })
  yPos += 15

  // Repository info
  doc.setFontSize(14)
  doc.setFont('helvetica', 'normal')
  doc.text(
    `${report.summary.repositoryOwner}/${report.summary.repositoryName}`,
    pageWidth / 2,
    yPos,
    { align: 'center' }
  )
  yPos += 10

  // Date range
  doc.setFontSize(12)
  doc.setTextColor(100)
  doc.text(`${report.summary.weekStart} ~ ${report.summary.weekEnd}`, pageWidth / 2, yPos, {
    align: 'center',
  })
  yPos += 5
  doc.text(`Generated: ${new Date(report.summary.generatedAt).toLocaleString()}`, pageWidth / 2, yPos, {
    align: 'center',
  })
  doc.setTextColor(0)
  yPos += 15

  // Divider
  doc.setDrawColor(200)
  doc.line(margin, yPos, pageWidth - margin, yPos)
  yPos += 10

  // Summary Section
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.text('Summary', margin, yPos)
  yPos += 10

  doc.setFontSize(11)
  doc.setFont('helvetica', 'normal')

  // Summary stats in two columns
  const col1X = margin
  const col2X = pageWidth / 2

  doc.text(`Total PRs Analyzed: ${report.prSummary.totalPRsAnalyzed}`, col1X, yPos)
  doc.text(`Avg Risk Score: ${report.prSummary.avgRiskScore}`, col2X, yPos)
  yPos += 7

  doc.text(`Total Lines Changed: ${report.prSummary.totalLinesChanged.toLocaleString()}`, col1X, yPos)
  doc.text(`Avg Complexity Score: ${report.prSummary.avgComplexityScore}`, col2X, yPos)
  yPos += 7

  doc.text(`Total Files Changed: ${report.prSummary.totalFilesChanged}`, col1X, yPos)
  doc.text(`Avg Security Score: ${report.prSummary.avgSecurityScore}`, col2X, yPos)
  yPos += 15

  // Week-over-week comparison
  checkPageBreak(40)
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('Week-over-Week Changes', margin, yPos)
  yPos += 8

  doc.setFontSize(11)
  doc.setFont('helvetica', 'normal')

  const formatChange = (value: number): string => {
    const sign = value >= 0 ? '+' : ''
    return `${sign}${value}%`
  }

  doc.text(`Risk Score: ${formatChange(report.comparisonWithPreviousWeek.riskScoreChange)}`, col1X, yPos)
  doc.text(`Complexity: ${formatChange(report.comparisonWithPreviousWeek.complexityChange)}`, col2X, yPos)
  yPos += 7

  doc.text(
    `Security Findings: ${formatChange(report.comparisonWithPreviousWeek.securityFindingsChange)}`,
    col1X,
    yPos
  )
  doc.text(`PR Count: ${formatChange(report.comparisonWithPreviousWeek.prCountChange)}`, col2X, yPos)
  yPos += 15

  // Risk Distribution
  checkPageBreak(50)
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('Risk Distribution', margin, yPos)
  yPos += 8

  doc.setFontSize(11)
  doc.setFont('helvetica', 'normal')

  const riskDist = report.prSummary.riskDistribution
  doc.text(`Low: ${riskDist.low}`, margin, yPos)
  doc.text(`Medium: ${riskDist.medium}`, margin + 40, yPos)
  doc.text(`High: ${riskDist.high}`, margin + 80, yPos)
  doc.text(`Critical: ${riskDist.critical}`, margin + 120, yPos)
  yPos += 15

  // Security Findings Section
  checkPageBreak(60)
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.text('Security Findings', margin, yPos)
  yPos += 10

  doc.setFontSize(11)
  doc.setFont('helvetica', 'normal')

  doc.text(`Total Findings: ${report.securitySummary.totalFindings}`, col1X, yPos)
  yPos += 7

  doc.text(`Critical: ${report.securitySummary.criticalCount}`, margin, yPos)
  doc.text(`High: ${report.securitySummary.highCount}`, margin + 40, yPos)
  doc.text(`Medium: ${report.securitySummary.mediumCount}`, margin + 80, yPos)
  doc.text(`Low: ${report.securitySummary.lowCount}`, margin + 120, yPos)
  yPos += 12

  // Top finding types
  if (report.securitySummary.topFindingTypes.length > 0) {
    doc.setFont('helvetica', 'bold')
    doc.text('Top Finding Types:', margin, yPos)
    yPos += 7
    doc.setFont('helvetica', 'normal')

    report.securitySummary.topFindingTypes.forEach((finding) => {
      doc.text(`  - ${finding.type}: ${finding.count}`, margin, yPos)
      yPos += 6
    })
    yPos += 5
  }

  // Top Risky PRs Section
  checkPageBreak(80)
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.text('Top Risky Pull Requests', margin, yPos)
  yPos += 10

  if (report.topRiskyPRs.length === 0) {
    doc.setFontSize(11)
    doc.setFont('helvetica', 'italic')
    doc.text('No high-risk PRs this week.', margin, yPos)
    yPos += 10
  } else {
    // Table header
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')

    const colWidths = [20, 70, 25, 25, 30]
    const headers = ['PR #', 'Title', 'Risk', 'Level', 'Findings']

    let xPos = margin
    headers.forEach((header, i) => {
      doc.text(header, xPos, yPos)
      xPos += colWidths[i]
    })
    yPos += 3

    doc.setDrawColor(150)
    doc.line(margin, yPos, pageWidth - margin, yPos)
    yPos += 5

    // Table rows
    doc.setFont('helvetica', 'normal')
    report.topRiskyPRs.forEach((pr) => {
      checkPageBreak(10)
      xPos = margin

      doc.text(`#${pr.prNumber}`, xPos, yPos)
      xPos += colWidths[0]

      // Truncate long titles
      const maxTitleLength = 35
      const title = pr.prTitle.length > maxTitleLength ? pr.prTitle.substring(0, maxTitleLength) + '...' : pr.prTitle
      doc.text(title, xPos, yPos)
      xPos += colWidths[1]

      doc.text(pr.riskScore.toString(), xPos, yPos)
      xPos += colWidths[2]

      doc.text(pr.riskLevel, xPos, yPos)
      xPos += colWidths[3]

      doc.text(pr.securityFindings.toString(), xPos, yPos)

      yPos += 7
    })
  }
  yPos += 10

  // Daily Breakdown Section
  checkPageBreak(80)
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.text('Daily Breakdown', margin, yPos)
  yPos += 10

  if (report.dailyBreakdown.length === 0) {
    doc.setFontSize(11)
    doc.setFont('helvetica', 'italic')
    doc.text('No data available for this week.', margin, yPos)
  } else {
    // Table header
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')

    const dailyColWidths = [35, 40, 40, 45]
    const dailyHeaders = ['Date', 'PRs Analyzed', 'Avg Risk', 'Findings']

    let xPos = margin
    dailyHeaders.forEach((header, i) => {
      doc.text(header, xPos, yPos)
      xPos += dailyColWidths[i]
    })
    yPos += 3

    doc.setDrawColor(150)
    doc.line(margin, yPos, pageWidth - margin, yPos)
    yPos += 5

    // Table rows
    doc.setFont('helvetica', 'normal')
    report.dailyBreakdown.forEach((day) => {
      checkPageBreak(10)
      xPos = margin

      doc.text(day.date, xPos, yPos)
      xPos += dailyColWidths[0]

      doc.text(day.prsAnalyzed.toString(), xPos, yPos)
      xPos += dailyColWidths[1]

      doc.text(day.avgRiskScore.toString(), xPos, yPos)
      xPos += dailyColWidths[2]

      doc.text(day.securityFindings.toString(), xPos, yPos)

      yPos += 7
    })
  }

  // Footer
  const totalPages = doc.getNumberOfPages()
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.setTextColor(150)
    doc.text(
      `Page ${i} of ${totalPages}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: 'center' }
    )
    doc.text(
      'Generated by Code Review Dashboard',
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 5,
      { align: 'center' }
    )
  }

  // Return base64 encoded PDF
  return doc.output('datauristring').split(',')[1]
}
