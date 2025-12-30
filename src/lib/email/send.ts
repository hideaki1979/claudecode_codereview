/**
 * Email Sending Utility
 *
 * Sends emails using Resend with React Email templates.
 */

import { Resend } from 'resend'
import { render } from '@react-email/render'
import { WeeklyReportEmail } from './templates/WeeklyReportEmail'
import type { WeeklyReport } from '../db/reports'

// Initialize Resend client (lazy initialization for serverless)
let resendClient: Resend | null = null

function getResendClient(): Resend {
  if (!resendClient) {
    const apiKey = process.env.RESEND_API_KEY
    if (!apiKey) {
      throw new Error('RESEND_API_KEY environment variable is not set')
    }
    resendClient = new Resend(apiKey)
  }
  return resendClient
}

/**
 * Email send result
 */
export interface EmailSendResult {
  success: boolean
  id?: string
  error?: string
}

/**
 * Send weekly report email
 *
 * @param to - Recipient email address(es)
 * @param report - Weekly report data
 * @param options - Additional options
 * @returns Send result
 */
export async function sendWeeklyReportEmail(
  to: string | string[],
  report: WeeklyReport,
  options?: {
    from?: string
    replyTo?: string
    dashboardUrl?: string
    attachPDF?: boolean
    pdfData?: string // Base64 encoded PDF
  }
): Promise<EmailSendResult> {
  try {
    const resend = getResendClient()
    const recipients = Array.isArray(to) ? to : [to]

    // Build email subject
    const subject = `[Weekly Report] ${report.summary.repositoryOwner}/${report.summary.repositoryName} - ${report.summary.weekStart}`

    // Build attachments if PDF is provided
    interface Attachment {
      content: string
      filename: string
    }
    const attachments: Attachment[] = []
    if (options?.attachPDF && options?.pdfData) {
      attachments.push({
        content: options.pdfData,
        filename: `weekly-report-${report.summary.weekStart}.pdf`,
      })
    }

    // Render React component to HTML
    const emailHtml = await render(
      WeeklyReportEmail({
        report,
        dashboardUrl: options?.dashboardUrl,
      })
    )

    const { data, error } = await resend.emails.send({
      from: options?.from || 'Code Review Dashboard <noreply@resend.dev>',
      to: recipients,
      subject,
      html: emailHtml,
      replyTo: options?.replyTo,
      attachments: attachments.length > 0 ? attachments : undefined,
    })

    if (error) {
      console.error('Failed to send email:', error)
      return {
        success: false,
        error: error.message,
      }
    }

    return {
      success: true,
      id: data?.id,
    }
  } catch (error) {
    console.error('Email send error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Send test email to verify configuration
 */
export async function sendTestEmail(to: string): Promise<EmailSendResult> {
  try {
    const resend = getResendClient()

    const { data, error } = await resend.emails.send({
      from: 'Code Review Dashboard <noreply@resend.dev>',
      to: [to],
      subject: 'Test Email - Code Review Dashboard',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h1>Test Email</h1>
          <p>This is a test email from Code Review Dashboard.</p>
          <p>If you received this email, your email configuration is working correctly.</p>
          <p style="color: #666; font-size: 12px;">Sent at: ${new Date().toISOString()}</p>
        </div>
      `,
    })

    if (error) {
      return {
        success: false,
        error: error.message,
      }
    }

    return {
      success: true,
      id: data?.id,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Check if email service is configured
 */
export function isEmailConfigured(): boolean {
  return !!process.env.RESEND_API_KEY
}
