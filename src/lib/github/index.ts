/**
 * GitHub API Integration Module
 *
 * This module provides a TypeScript client for interacting with GitHub's REST API,
 * specifically focused on Pull Request operations.
 *
 * @module github
 *
 * @example
 * ```ts
 * import { listPullRequests, getPullRequest, getPullRequestDiff } from '@/lib/github';
 *
 * // List open pull requests
 * const { data: prs } = await listPullRequests({
 *   owner: 'facebook',
 *   repo: 'react',
 *   state: 'open'
 * });
 *
 * // Get specific PR details
 * const pr = await getPullRequest({
 *   owner: 'facebook',
 *   repo: 'react',
 *   pull_number: 12345
 * });
 *
 * // Get PR diff
 * const diff = await getPullRequestDiff({
 *   owner: 'facebook',
 *   repo: 'react',
 *   pull_number: 12345
 * });
 * ```
 */

// Client exports
export { getOctokit, resetOctokit, hasGitHubToken } from './client';

// Pull Request operations
export { listPullRequests, getPullRequest } from './pullRequests';

// Diff operations
export {
  getPullRequestDiff,
  getPullRequestPatch,
  getPullRequestFile,
  filterFilesByStatus,
  filterFilesByExtension,
} from './diff';

// Utility functions
export {
  handleGitHubError,
  validateRepository,
  validatePullNumber,
  validatePagination,
  validateToken,
  parseLinkHeader,
  extractPageNumber,
} from './utils';

// Type exports
export type {
  GitHubUser,
  GitHubLabel,
  GitHubMilestone,
  GitHubRepository,
  GitHubPullRequest,
  GitHubPullRequestSimple,
  GitHubPullRequestFile,
  GitHubDiff,
  ListPullRequestsParams,
  GetPullRequestParams,
  GetPullRequestDiffParams,
  GitHubAPIError,
  PaginationInfo,
} from '@/types/github';
