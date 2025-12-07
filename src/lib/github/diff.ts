import { getOctokit } from './client';
import { handleGitHubError, validateRepository, validatePullNumber } from './utils';
import type {
  GitHubDiff,
  GitHubPullRequestFile,
  GetPullRequestDiffParams,
} from '@/types/github';

/**
 * Get pull request diff (list of changed files)
 *
 * @param params - Request parameters
 * @param token - Optional GitHub token (uses env var if not provided)
 * @returns Diff information including all changed files
 * @throws Error if API request fails
 *
 * @example
 * ```ts
 * const diff = await getPullRequestDiff({
 *   owner: 'facebook',
 *   repo: 'react',
 *   pull_number: 12345
 * });
 *
 * console.log(`Total changes: ${diff.total_changes}`);
 * console.log(`Files changed: ${diff.files.length}`);
 * ```
 */

// 変更ファイル一覧の取得
export async function getPullRequestDiff(
  params: GetPullRequestDiffParams,
  token?: string
): Promise<GitHubDiff> {
  try {
    const octokit = getOctokit(token);

    const { owner, repo, pull_number } = params;

    // Validate parameters
    validateRepository(owner, repo);
    validatePullNumber(pull_number);

    // Use paginate to fetch all files across multiple pages
    // This ensures we get all changed files, even if there are more than 100
    const files = (await octokit.paginate(octokit.rest.pulls.listFiles, {
      owner,
      repo,
      pull_number,
      per_page: 100, // Maximum allowed
    })) as GitHubPullRequestFile[];

    // Calculate totals
    const total_additions = files.reduce((sum, file) => sum + file.additions, 0);
    const total_deletions = files.reduce((sum, file) => sum + file.deletions, 0);
    const total_changes = files.reduce((sum, file) => sum + file.changes, 0);

    return {
      files,
      total_additions,
      total_deletions,
      total_changes,
    };
  } catch (error) {
    throw handleGitHubError(error, 'Failed to fetch pull request diff');
  }
}

/**
 * Get raw patch content for a pull request
 *
 * @param params - Request parameters
 * @param token - Optional GitHub token (uses env var if not provided)
 * @returns Raw patch string
 * @throws Error if API request fails
 *
 * @example
 * ```ts
 * const patch = await getPullRequestPatch({
 *   owner: 'facebook',
 *   repo: 'react',
 *   pull_number: 12345
 * });
 * ```
 */

// 生のパッチ形式取得
export async function getPullRequestPatch(
  params: GetPullRequestDiffParams,
  token?: string
): Promise<string> {
  try {
    const octokit = getOctokit(token);

    const { owner, repo, pull_number } = params;

    // Validate parameters
    validateRepository(owner, repo);
    validatePullNumber(pull_number);

    // Request patch format
    const response = await octokit.rest.pulls.get({
      owner,
      repo,
      pull_number,
      mediaType: {
        format: 'patch',
      },
    });

    // Response data will be the raw patch string
    return response.data as unknown as string;
  } catch (error) {
    throw handleGitHubError(error, 'Failed to fetch pull request patch');
  }
}

/**
 * Get specific file content from a pull request
 *
 * @param params - Request parameters
 * @param filename - Specific file to retrieve
 * @param token - Optional GitHub token (uses env var if not provided)
 * @returns File information with patch
 * @throws Error if API request fails or file not found
 *
 * @example
 * ```ts
 * const file = await getPullRequestFile({
 *   owner: 'facebook',
 *   repo: 'react',
 *   pull_number: 12345
 * }, 'src/App.tsx');
 * ```
 */

// 特定ファイルの取得
export async function getPullRequestFile(
  params: GetPullRequestDiffParams,
  filename: string,
  token?: string
): Promise<GitHubPullRequestFile> {
  try {
    if (!filename) {
      throw new Error('Filename is required');
    }

    const diff = await getPullRequestDiff(params, token);

    const file = diff.files.find((f) => f.filename === filename);

    if (!file) {
      throw new Error(`File '${filename}' not found in pull request changes`);
    }

    return file;
  } catch (error) {
    throw handleGitHubError(error, 'Failed to fetch pull request file');
  }
}

/**
 * Filter files by status
 *
 * @param files - Array of PR files
 * @param status - Status to filter by
 * @returns Filtered array of files
 *
 * @example
 * ```ts
 * const diff = await getPullRequestDiff({ owner, repo, pull_number });
 * const addedFiles = filterFilesByStatus(diff.files, 'added');
 * const modifiedFiles = filterFilesByStatus(diff.files, 'modified');
 * ```
 */

// ステータスでフィルタリング
export function filterFilesByStatus(
  files: GitHubPullRequestFile[],
  status: GitHubPullRequestFile['status']
): GitHubPullRequestFile[] {
  return files.filter((file) => file.status === status);
}

/**
 * Filter files by extension
 *
 * @param files - Array of PR files
 * @param extensions - Array of extensions to filter by (e.g., ['.ts', '.tsx'])
 * @returns Filtered array of files
 *
 * @example
 * ```ts
 * const diff = await getPullRequestDiff({ owner, repo, pull_number });
 * const tsFiles = filterFilesByExtension(diff.files, ['.ts', '.tsx']);
 * ```
 */

// 拡張子でフィルタリング
export function filterFilesByExtension(
  files: GitHubPullRequestFile[],
  extensions: string[]
): GitHubPullRequestFile[] {
  return files.filter((file) =>
    extensions.some((ext) => file.filename.endsWith(ext))
  );
}

