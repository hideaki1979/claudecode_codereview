/**
 * Email Configuration Hook
 *
 * Fetches and caches email service configuration status using SWR.
 * Provides consistent data fetching pattern with automatic caching.
 */

import useSWR from 'swr'

interface EmailConfigResponse {
  configured: boolean
  message: string
}

interface UseEmailConfigResult {
  isConfigured: boolean
  isLoading: boolean
  error: Error | undefined
}

const fetcher = async (url: string): Promise<EmailConfigResponse> => {
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error('Failed to fetch email configuration')
  }
  return res.json()
}

/**
 * Hook to check if email service is configured
 *
 * @returns Object containing:
 *   - isConfigured: Whether email service is available
 *   - isLoading: Whether the check is in progress
 *   - error: Any error that occurred during the check
 */
export function useEmailConfig(): UseEmailConfigResult {
  const { data, error, isLoading } = useSWR<EmailConfigResponse>(
    '/api/reports/email',
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 60000, // Cache for 1 minute
    }
  )

  return {
    isConfigured: data?.configured ?? false,
    isLoading,
    error,
  }
}
