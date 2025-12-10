import type {
  GitHubPullRequest,
  GitHubPullRequestSimple,
  PaginationInfo,
} from './github';

/**
 * API Response Types using Discriminated Unions
 */

// Success response for pull request list
export interface SuccessListResponse {
  success: true;
  data: GitHubPullRequestSimple[];
  pagination: PaginationInfo;
  rateLimit: RateLimitInfo;
}

// Success response for single pull request
export interface SuccessPullRequestResponse {
  success: true;
  data: GitHubPullRequest;
  rateLimit: RateLimitInfo;
}

// Error response
export interface ErrorResponse {
  success: false;
  error: {
    message: string;
    code: ErrorCode;
    details?: string;
  };
}

// Discriminated union for all API responses
export type ApiListResponse = SuccessListResponse | ErrorResponse;
export type ApiPullRequestResponse = SuccessPullRequestResponse | ErrorResponse;

/**
 * Error Codes
 */
export type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'RATE_LIMIT_EXCEEDED'
  | 'INTERNAL_ERROR'
  | 'GITHUB_API_ERROR'
  | 'INVALID_TOKEN'
  | 'MISSING_TOKEN';

/**
 * Rate Limit Information
 */
export interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: number; // Unix timestamp
  used: number;
}

/**
 * Request Validation Schemas
 */
export interface ListPullRequestsQuery {
  owner: string;
  repo: string;
  state?: 'open' | 'closed' | 'all';
  sort?: 'created' | 'updated' | 'popularity' | 'long-running';
  direction?: 'asc' | 'desc';
  per_page?: number;
  page?: number;
}

export interface GetPullRequestBody {
  owner: string;
  repo: string;
  pull_number: number;
}

/**
 * Cache Entry
 */
export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

/**
 * HTTP Status Codes
 */
export const HTTP_STATUS = {
  OK: 200,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
} as const;

/**
 * Cache Configuration
 */
export const CACHE_CONFIG = {
  TTL: 900, // 15 minutes in seconds
  MAX_ENTRIES: 100,
} as const;
