/**
 * GitHub Pull Request Types
 */

export interface GitHubUser {
  login: string;
  id: number;
  avatar_url: string;
  html_url: string;
  type: string;
}

export interface GitHubLabel {
  id: number;
  name: string;
  color: string;
  description: string | null;
}

export interface GitHubMilestone {
  id: number;
  number: number;
  title: string;
  description: string | null;
  state: 'open' | 'closed';
}

export interface GitHubRepository {
  id: number;
  name: string;
  full_name: string;
  owner: GitHubUser;
  private: boolean;
  html_url: string;
  description: string | null;
  fork: boolean;
  default_branch: string;
}

export interface GitHubPullRequest {
  id: number;
  number: number;
  state: 'open' | 'closed';
  title: string;
  body: string | null;
  user: GitHubUser;
  labels: GitHubLabel[];
  milestone: GitHubMilestone | null;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
  merged_at: string | null;
  head: {
    ref: string;
    sha: string;
    repo: GitHubRepository | null;
  };
  base: {
    ref: string;
    sha: string;
    repo: GitHubRepository;
  };
  draft: boolean;
  merged: boolean;
  mergeable: boolean | null;
  mergeable_state: string;
  merged_by: GitHubUser | null;
  comments: number;
  review_comments: number;
  commits: number;
  additions: number;
  deletions: number;
  changed_files: number;
  html_url: string;
  diff_url: string;
  patch_url: string;
}

export interface GitHubPullRequestFile {
  sha: string;
  filename: string;
  status: 'added' | 'removed' | 'modified' | 'renamed' | 'copied' | 'changed' | 'unchanged';
  additions: number;
  deletions: number;
  changes: number;
  blob_url: string;
  raw_url: string;
  contents_url: string;
  patch?: string;
  previous_filename?: string;
}

export interface GitHubDiff {
  files: GitHubPullRequestFile[];
  total_additions: number;
  total_deletions: number;
  total_changes: number;
}

/**
 * API Request Parameters
 */
export interface ListPullRequestsParams {
  owner: string;
  repo: string;
  state?: 'open' | 'closed' | 'all';
  head?: string;
  base?: string;
  sort?: 'created' | 'updated' | 'popularity' | 'long-running';
  direction?: 'asc' | 'desc';
  per_page?: number;
  page?: number;
}

export interface GetPullRequestParams {
  owner: string;
  repo: string;
  pull_number: number;
}

export interface GetPullRequestDiffParams {
  owner: string;
  repo: string;
  pull_number: number;
}

/**
 * API Response Types
 */
export interface GitHubAPIError {
  message: string;
  documentation_url?: string;
  status?: number;
}

export interface PaginationInfo {
  page: number;
  per_page: number;
  total_count?: number;
  has_next_page: boolean;
  has_prev_page: boolean;
}
