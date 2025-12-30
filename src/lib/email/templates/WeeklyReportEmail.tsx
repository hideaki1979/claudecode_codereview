/**
 * Weekly Report Email Template
 *
 * React Email template for weekly code review reports.
 */

import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Heading,
  Text,
  Hr,
  Link,
} from '@react-email/components'
import type { WeeklyReport } from '../../db/reports'

interface WeeklyReportEmailProps {
  report: WeeklyReport
  dashboardUrl?: string
}

export function WeeklyReportEmail({ report, dashboardUrl = 'https://code-review-dashboard.vercel.app' }: WeeklyReportEmailProps) {
  const getRiskLevelColor = (level: string): string => {
    switch (level) {
      case 'critical':
        return '#dc2626'
      case 'high':
        return '#ea580c'
      case 'medium':
        return '#ca8a04'
      case 'low':
        return '#16a34a'
      default:
        return '#6b7280'
    }
  }

  return (
    <Html lang="ja">
      <Head>
        <title>Weekly Code Review Report - {report.summary.repositoryOwner}/{report.summary.repositoryName}</title>
      </Head>
      <Body style={styles.body}>
        <Container style={styles.container}>
          {/* Header */}
          <Section style={styles.header}>
            <Heading as="h1" style={styles.title}>
              Weekly Code Review Report
            </Heading>
            <Text style={styles.subtitle}>
              {report.summary.repositoryOwner}/{report.summary.repositoryName}
            </Text>
            <Text style={styles.dateRange}>
              {report.summary.weekStart} ~ {report.summary.weekEnd}
            </Text>
          </Section>

          <Hr style={styles.divider} />

          {/* Summary Stats */}
          <Section style={styles.section}>
            <Heading as="h2" style={styles.sectionTitle}>
              Summary
            </Heading>
            <table style={styles.statsTable}>
              <tbody>
                <tr>
                  <td style={styles.statLabel}>Total PRs Analyzed</td>
                  <td style={styles.statValue}>{report.prSummary.totalPRsAnalyzed}</td>
                  <td style={styles.statLabel}>Avg Risk Score</td>
                  <td style={styles.statValue}>{report.prSummary.avgRiskScore}</td>
                </tr>
                <tr>
                  <td style={styles.statLabel}>Lines Changed</td>
                  <td style={styles.statValue}>{report.prSummary.totalLinesChanged.toLocaleString()}</td>
                  <td style={styles.statLabel}>Avg Complexity</td>
                  <td style={styles.statValue}>{report.prSummary.avgComplexityScore}</td>
                </tr>
                <tr>
                  <td style={styles.statLabel}>Files Changed</td>
                  <td style={styles.statValue}>{report.prSummary.totalFilesChanged}</td>
                  <td style={styles.statLabel}>Security Score</td>
                  <td style={styles.statValue}>{report.prSummary.avgSecurityScore}</td>
                </tr>
              </tbody>
            </table>
          </Section>

          {/* Week-over-Week Changes */}
          <Section style={styles.section}>
            <Heading as="h2" style={styles.sectionTitle}>
              Week-over-Week Changes
            </Heading>
            <table style={styles.changeTable}>
              <tbody>
                <tr>
                  <td style={styles.changeLabel}>Risk Score</td>
                  <td
                    style={{
                      ...styles.changeValue,
                      color:
                        report.comparisonWithPreviousWeek.riskScoreChange > 0
                          ? '#dc2626'
                          : report.comparisonWithPreviousWeek.riskScoreChange < 0
                          ? '#16a34a'
                          : '#6b7280',
                    }}
                  >
                    {report.comparisonWithPreviousWeek.riskScoreChange >= 0 ? '+' : ''}
                    {report.comparisonWithPreviousWeek.riskScoreChange}%
                  </td>
                  <td style={styles.changeLabel}>Security Findings</td>
                  <td
                    style={{
                      ...styles.changeValue,
                      color:
                        report.comparisonWithPreviousWeek.securityFindingsChange > 0
                          ? '#dc2626'
                          : report.comparisonWithPreviousWeek.securityFindingsChange < 0
                          ? '#16a34a'
                          : '#6b7280',
                    }}
                  >
                    {report.comparisonWithPreviousWeek.securityFindingsChange >= 0 ? '+' : ''}
                    {report.comparisonWithPreviousWeek.securityFindingsChange}%
                  </td>
                </tr>
              </tbody>
            </table>
          </Section>

          <Hr style={styles.divider} />

          {/* Risk Distribution */}
          <Section style={styles.section}>
            <Heading as="h2" style={styles.sectionTitle}>
              Risk Distribution
            </Heading>
            <table style={styles.distributionTable}>
              <tbody>
                <tr>
                  <td style={{ ...styles.riskBox, backgroundColor: '#dcfce7' }}>
                    <Text style={{ ...styles.riskLabel, color: '#16a34a' }}>Low</Text>
                    <Text style={styles.riskValue}>{report.prSummary.riskDistribution.low}</Text>
                  </td>
                  <td style={{ ...styles.riskBox, backgroundColor: '#fef9c3' }}>
                    <Text style={{ ...styles.riskLabel, color: '#ca8a04' }}>Medium</Text>
                    <Text style={styles.riskValue}>{report.prSummary.riskDistribution.medium}</Text>
                  </td>
                  <td style={{ ...styles.riskBox, backgroundColor: '#fed7aa' }}>
                    <Text style={{ ...styles.riskLabel, color: '#ea580c' }}>High</Text>
                    <Text style={styles.riskValue}>{report.prSummary.riskDistribution.high}</Text>
                  </td>
                  <td style={{ ...styles.riskBox, backgroundColor: '#fecaca' }}>
                    <Text style={{ ...styles.riskLabel, color: '#dc2626' }}>Critical</Text>
                    <Text style={styles.riskValue}>{report.prSummary.riskDistribution.critical}</Text>
                  </td>
                </tr>
              </tbody>
            </table>
          </Section>

          {/* Security Summary */}
          <Section style={styles.section}>
            <Heading as="h2" style={styles.sectionTitle}>
              Security Findings
            </Heading>
            <Text style={styles.totalFindings}>
              Total: {report.securitySummary.totalFindings} findings
            </Text>
            {report.securitySummary.criticalCount > 0 && (
              <Text style={{ ...styles.alertText, color: '#dc2626' }}>
                {report.securitySummary.criticalCount} Critical issues require immediate attention
              </Text>
            )}
          </Section>

          <Hr style={styles.divider} />

          {/* Top Risky PRs */}
          {report.topRiskyPRs.length > 0 && (
            <Section style={styles.section}>
              <Heading as="h2" style={styles.sectionTitle}>
                Top Risky Pull Requests
              </Heading>
              <table style={styles.prTable}>
                <thead>
                  <tr>
                    <th style={styles.prHeader}>PR</th>
                    <th style={styles.prHeader}>Title</th>
                    <th style={styles.prHeader}>Risk</th>
                  </tr>
                </thead>
                <tbody>
                  {report.topRiskyPRs.slice(0, 5).map((pr) => (
                    <tr key={pr.prNumber}>
                      <td style={styles.prCell}>#{pr.prNumber}</td>
                      <td style={styles.prCell}>
                        {pr.prTitle.length > 40 ? pr.prTitle.substring(0, 40) + '...' : pr.prTitle}
                      </td>
                      <td style={{ ...styles.prCell, color: getRiskLevelColor(pr.riskLevel) }}>
                        {pr.riskScore} ({pr.riskLevel})
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Section>
          )}

          {/* Footer */}
          <Section style={styles.footer}>
            <Link href={dashboardUrl} style={styles.dashboardLink}>
              View Full Report in Dashboard
            </Link>
            <Text style={styles.footerText}>
              This report was automatically generated by Code Review Dashboard.
            </Text>
            <Text style={styles.footerText}>
              Report ID: {report.summary.reportId}
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

const styles = {
  body: {
    backgroundColor: '#f3f4f6',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    margin: '0',
    padding: '20px 0',
  },
  container: {
    backgroundColor: '#ffffff',
    borderRadius: '8px',
    margin: '0 auto',
    maxWidth: '600px',
    padding: '0',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
  },
  header: {
    backgroundColor: '#1f2937',
    borderRadius: '8px 8px 0 0',
    padding: '30px 20px',
    textAlign: 'center' as const,
  },
  title: {
    color: '#ffffff',
    fontSize: '24px',
    fontWeight: 'bold',
    margin: '0 0 10px 0',
  },
  subtitle: {
    color: '#9ca3af',
    fontSize: '16px',
    margin: '0 0 5px 0',
  },
  dateRange: {
    color: '#6b7280',
    fontSize: '14px',
    margin: '0',
  },
  divider: {
    borderColor: '#e5e7eb',
    borderWidth: '1px',
    margin: '0',
  },
  section: {
    padding: '20px',
  },
  sectionTitle: {
    color: '#1f2937',
    fontSize: '18px',
    fontWeight: 'bold',
    margin: '0 0 15px 0',
  },
  statsTable: {
    width: '100%',
    borderCollapse: 'collapse' as const,
  },
  statLabel: {
    color: '#6b7280',
    fontSize: '12px',
    padding: '5px 10px 5px 0',
    textAlign: 'left' as const,
  },
  statValue: {
    color: '#1f2937',
    fontSize: '16px',
    fontWeight: 'bold',
    padding: '5px 20px 5px 0',
    textAlign: 'left' as const,
  },
  changeTable: {
    width: '100%',
    borderCollapse: 'collapse' as const,
  },
  changeLabel: {
    color: '#6b7280',
    fontSize: '12px',
    padding: '5px 10px 5px 0',
  },
  changeValue: {
    fontSize: '16px',
    fontWeight: 'bold',
    padding: '5px 20px 5px 0',
  },
  distributionTable: {
    width: '100%',
    borderCollapse: 'separate' as const,
    borderSpacing: '8px',
  },
  riskBox: {
    borderRadius: '8px',
    padding: '15px',
    textAlign: 'center' as const,
    width: '25%',
  },
  riskLabel: {
    fontSize: '12px',
    fontWeight: 'bold',
    margin: '0 0 5px 0',
    textTransform: 'uppercase' as const,
  },
  riskValue: {
    color: '#1f2937',
    fontSize: '24px',
    fontWeight: 'bold',
    margin: '0',
  },
  totalFindings: {
    color: '#1f2937',
    fontSize: '14px',
    margin: '0 0 10px 0',
  },
  alertText: {
    fontSize: '14px',
    fontWeight: 'bold',
    margin: '0',
    padding: '10px',
    backgroundColor: '#fef2f2',
    borderRadius: '4px',
  },
  prTable: {
    width: '100%',
    borderCollapse: 'collapse' as const,
    fontSize: '12px',
  },
  prHeader: {
    backgroundColor: '#f3f4f6',
    color: '#6b7280',
    fontWeight: 'bold',
    padding: '10px',
    textAlign: 'left' as const,
    borderBottom: '1px solid #e5e7eb',
  },
  prCell: {
    padding: '10px',
    borderBottom: '1px solid #e5e7eb',
    color: '#1f2937',
  },
  footer: {
    backgroundColor: '#f9fafb',
    borderRadius: '0 0 8px 8px',
    padding: '20px',
    textAlign: 'center' as const,
  },
  dashboardLink: {
    backgroundColor: '#3b82f6',
    borderRadius: '6px',
    color: '#ffffff',
    display: 'inline-block',
    fontSize: '14px',
    fontWeight: 'bold',
    padding: '12px 24px',
    textDecoration: 'none',
  },
  footerText: {
    color: '#9ca3af',
    fontSize: '12px',
    margin: '15px 0 0 0',
  },
}

export default WeeklyReportEmail
