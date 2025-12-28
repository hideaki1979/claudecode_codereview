/**
 * GitHub API Retry Utility
 *
 * Provides robust retry logic for GitHub API calls with:
 * - Status code based retry detection (429, 5xx)
 * - Network error retry detection
 * - Exponential backoff with jitter
 * - Rate limit header support
 */

import { RequestError } from '@octokit/request-error'

/**
 * Retry configuration options
 */
export interface RetryOptions {
  /** Maximum number of retry attempts (default: 3) */
  maxRetries?: number
  /** Base delay in milliseconds for exponential backoff (default: 1000) */
  baseDelay?: number
  /** Maximum delay in milliseconds (default: 30000) */
  maxDelay?: number
  /** Optional callback for logging retry attempts */
  onRetry?: (attempt: number, delay: number, error: unknown) => void
}

/**
 * HTTP status codes that are considered retryable
 */
const RETRYABLE_STATUS_CODES = [
  429, // Too Many Requests (Rate Limit)
  500, // Internal Server Error
  502, // Bad Gateway
  503, // Service Unavailable
  504, // Gateway Timeout
]

/**
 * Network error codes that are considered retryable
 */
const RETRYABLE_NETWORK_ERRORS = [
  'ETIMEDOUT',
  'ECONNRESET',
  'ECONNREFUSED',
  'ENOTFOUND',
  'ENETUNREACH',
  'EAI_AGAIN',
]

/**
 * Determines if an error is retryable
 *
 * @param error - The error to check
 * @returns true if the error is retryable
 */
export function isRetryableError(error: unknown): boolean {
  // Octokit's RequestError with retryable status codes
  if (error instanceof RequestError) {
    return RETRYABLE_STATUS_CODES.includes(error.status)
  }

  // Network errors (Node.js error codes)
  if (error instanceof Error) {
    const errorCode = (error as NodeJS.ErrnoException).code
    if (errorCode && RETRYABLE_NETWORK_ERRORS.includes(errorCode)) {
      return true
    }
  }

  return false
}

/**
 * Calculates the delay before the next retry attempt
 *
 * Uses exponential backoff with jitter, and respects Retry-After headers
 * for rate limit errors.
 *
 * @param error - The error that caused the retry
 * @param baseDelay - Base delay in milliseconds
 * @param attempt - Current attempt number (0-based)
 * @param maxDelay - Maximum delay in milliseconds
 * @returns Delay in milliseconds before next retry
 */
export function calculateRetryDelay(
  error: unknown,
  baseDelay: number,
  attempt: number,
  maxDelay: number
): number {
  // For rate limit errors, respect Retry-After header if available
  if (error instanceof RequestError && error.status === 429) {
    const retryAfter = error.response?.headers?.['retry-after']
    if (retryAfter !== undefined) {
      const retryAfterMs = parseInt(String(retryAfter), 10) * 1000
      if (!isNaN(retryAfterMs) && retryAfterMs > 0) {
        return Math.min(retryAfterMs, maxDelay)
      }
    }

    // Also check x-ratelimit-reset header
    const resetTime = error.response?.headers?.['x-ratelimit-reset']
    if (resetTime !== undefined) {
      const resetTimestamp = parseInt(String(resetTime), 10) * 1000
      const now = Date.now()
      if (!isNaN(resetTimestamp) && resetTimestamp > now) {
        return Math.min(resetTimestamp - now + 1000, maxDelay)
      }
    }
  }

  // Exponential backoff with jitter
  const exponentialDelay = baseDelay * Math.pow(2, attempt)
  const jitter = Math.random() * 1000
  return Math.min(exponentialDelay + jitter, maxDelay)
}

/**
 * Executes a function with automatic retry on retryable errors
 *
 * @param fn - The async function to execute
 * @param options - Retry configuration options
 * @returns The result of the function
 * @throws The last error if all retries are exhausted
 *
 * @example
 * ```ts
 * const result = await withRetry(
 *   () => octokit.pulls.get({ owner, repo, pull_number }),
 *   { maxRetries: 3, baseDelay: 1000 }
 * )
 * ```
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxRetries = 3,
    baseDelay = 1000,
    maxDelay = 30000,
    onRetry,
  } = options

  let lastError: unknown

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error
      const isLastAttempt = attempt === maxRetries

      if (isLastAttempt || !isRetryableError(error)) {
        throw error
      }

      const delay = calculateRetryDelay(error, baseDelay, attempt, maxDelay)

      if (onRetry) {
        onRetry(attempt + 1, delay, error)
      }

      await new Promise((resolve) => setTimeout(resolve, delay))
    }
  }

  // This should never be reached, but TypeScript requires it
  throw lastError
}

/**
 * Default retry logger for development/debugging
 */
export function defaultRetryLogger(
  attempt: number,
  delay: number,
  error: unknown
): void {
  const errorMessage = error instanceof Error ? error.message : 'Unknown error'
  const status = error instanceof RequestError ? ` (status: ${error.status})` : ''
  console.warn(
    `[GitHub API] Retry attempt ${attempt} after ${delay}ms - ${errorMessage}${status}`
  )
}
