'use client'

/**
 * Report Export Buttons Component
 *
 * Provides PDF and CSV export functionality for weekly reports.
 */

import { useState } from 'react'
import { Download, FileText, Table, Loader2, ChevronDown } from 'lucide-react'
import toast from 'react-hot-toast'

interface ReportExportButtonsProps {
  owner: string
  repo: string
  weeksAgo: number
}

type CSVExportType = 'summary' | 'risky-prs' | 'daily-breakdown' | 'finding-types' | 'full'

export function ReportExportButtons({
  owner,
  repo,
  weeksAgo,
}: ReportExportButtonsProps): React.JSX.Element {
  const [isExporting, setIsExporting] = useState<'pdf' | 'csv' | null>(null)
  const [showCSVOptions, setShowCSVOptions] = useState(false)

  const baseUrl = `/api/reports/export?owner=${encodeURIComponent(owner)}&repo=${encodeURIComponent(repo)}&weeksAgo=${weeksAgo}`

  const handlePDFExport = async () => {
    setIsExporting('pdf')
    try {
      const response = await fetch(`${baseUrl}&format=pdf`)
      if (!response.ok) {
        // Try to get error details from response
        const contentType = response.headers.get('content-type')
        let errorMessage = `PDF export failed (${response.status})`
        if (contentType?.includes('application/json')) {
          try {
            const errorData = await response.json()
            errorMessage = errorData.message || errorData.error || errorMessage
          } catch {
            // Ignore JSON parse errors
          }
        }
        throw new Error(errorMessage)
      }
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${owner}-${repo}-report.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
      toast.success('PDFをダウンロードしました')
    } catch (error) {
      console.error('PDF export error:', error)
      const message = error instanceof Error ? error.message : 'PDFエクスポートに失敗しました'
      toast.error(`PDF出力失敗: ${message}`)
    } finally {
      setIsExporting(null)
    }
  }

  const handleCSVExport = async (csvType: CSVExportType) => {
    setIsExporting('csv')
    setShowCSVOptions(false)
    try {
      const response = await fetch(`${baseUrl}&format=csv&csvType=${csvType}`)
      if (!response.ok) {
        // Try to get error details from response
        const contentType = response.headers.get('content-type')
        let errorMessage = `CSV export failed (${response.status})`
        if (contentType?.includes('application/json')) {
          try {
            const errorData = await response.json()
            errorMessage = errorData.message || errorData.error || errorMessage
          } catch {
            // Ignore JSON parse errors
          }
        }
        throw new Error(errorMessage)
      }
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${owner}-${repo}-${csvType}.csv`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
      toast.success('CSVをダウンロードしました')
    } catch (error) {
      console.error('CSV export error:', error)
      const message = error instanceof Error ? error.message : 'CSVエクスポートに失敗しました'
      toast.error(`CSV出力失敗: ${message}`)
    } finally {
      setIsExporting(null)
    }
  }

  const csvOptions: { type: CSVExportType; label: string }[] = [
    { type: 'summary', label: 'サマリー' },
    { type: 'risky-prs', label: 'リスクPR一覧' },
    { type: 'daily-breakdown', label: '日別内訳' },
    { type: 'finding-types', label: '検出タイプ' },
    { type: 'full', label: '全データ' },
  ]

  return (
    <div className="flex items-center gap-2">
      {/* PDF Export Button */}
      <button
        onClick={handlePDFExport}
        disabled={isExporting !== null}
        className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 disabled:opacity-50"
      >
        {isExporting === 'pdf' ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <FileText className="h-4 w-4" />
        )}
        PDFダウンロード
      </button>

      {/* CSV Export Dropdown */}
      <div className="relative">
        <button
          onClick={() => setShowCSVOptions(!showCSVOptions)}
          disabled={isExporting !== null}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 disabled:opacity-50"
        >
          {isExporting === 'csv' ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Table className="h-4 w-4" />
          )}
          CSVダウンロード
          <ChevronDown className={`h-4 w-4 transition-transform ${showCSVOptions ? 'rotate-180' : ''}`} />
        </button>

        {showCSVOptions && (
          <div className="absolute right-0 z-10 mt-1 w-48 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
            {csvOptions.map((option) => (
              <button
                key={option.type}
                onClick={() => handleCSVExport(option.type)}
                className="flex w-full items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                <Download className="h-4 w-4" />
                {option.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
