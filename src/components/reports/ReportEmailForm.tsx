'use client'

/**
 * Report Email Form Component
 *
 * Form to send weekly report via email with optional PDF attachment.
 */

import { useState } from 'react'
import { Mail, Send, Loader2, CheckCircle, AlertCircle, Paperclip } from 'lucide-react'

interface ReportEmailFormProps {
  owner: string
  repo: string
  weeksAgo: number
  isEmailConfigured: boolean
}

interface FormState {
  to: string
  attachPDF: boolean
}

export function ReportEmailForm({
  owner,
  repo,
  weeksAgo,
  isEmailConfigured,
}: ReportEmailFormProps): React.JSX.Element {
  const [isOpen, setIsOpen] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null)
  const [form, setForm] = useState<FormState>({
    to: '',
    attachPDF: false,
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSending(true)
    setResult(null)

    try {
      const response = await fetch('/api/reports/email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          owner,
          repo,
          weeksAgo,
          to: form.to,
          attachPDF: form.attachPDF,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setResult({
          success: true,
          message: 'メールを送信しました',
        })
        setForm({ to: '', attachPDF: false })
      } else {
        setResult({
          success: false,
          message: data.message || 'メール送信に失敗しました',
        })
      }
    } catch (error) {
      console.error('Email send error:', error)
      setResult({
        success: false,
        message: 'メール送信中にエラーが発生しました',
      })
    } finally {
      setIsSending(false)
    }
  }

  if (!isEmailConfigured) {
    return (
      <div className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-4 py-2 text-sm text-gray-500">
        <Mail className="h-4 w-4" />
        メール未設定
      </div>
    )
  }

  return (
    <div className="relative">
      <button
        onClick={() => {
          setIsOpen(!isOpen)
          setResult(null)
        }}
        className="inline-flex items-center gap-2 rounded-lg border border-blue-300 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100"
      >
        <Mail className="h-4 w-4" />
        メールで送信
      </button>

      {isOpen && (
        <div className="absolute right-0 z-10 mt-2 w-80 rounded-lg border border-gray-200 bg-white p-4 shadow-lg">
          <h4 className="mb-3 text-sm font-semibold text-gray-900">
            レポートをメールで送信
          </h4>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label htmlFor="email" className="mb-1 block text-xs text-gray-600">
                送信先メールアドレス
              </label>
              <input
                type="email"
                id="email"
                value={form.to}
                onChange={(e) => setForm({ ...form, to: e.target.value })}
                placeholder="example@email.com"
                required
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={form.attachPDF}
                onChange={(e) => setForm({ ...form, attachPDF: e.target.checked })}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <Paperclip className="h-4 w-4 text-gray-500" />
              PDF添付
            </label>

            {result && (
              <div
                className={`flex items-center gap-2 rounded-md p-2 text-sm ${
                  result.success
                    ? 'bg-green-50 text-green-700'
                    : 'bg-red-50 text-red-700'
                }`}
              >
                {result.success ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  <AlertCircle className="h-4 w-4" />
                )}
                {result.message}
              </div>
            )}

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-md px-3 py-2 text-sm text-gray-600 hover:bg-gray-100"
              >
                キャンセル
              </button>
              <button
                type="submit"
                disabled={isSending || !form.to}
                className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {isSending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                送信
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
