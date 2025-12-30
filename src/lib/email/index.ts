/**
 * Email utilities barrel file
 */

export { sendWeeklyReportEmail, sendTestEmail, isEmailConfigured } from './send'
export type { EmailSendResult } from './send'
export { WeeklyReportEmail } from './templates/WeeklyReportEmail'
