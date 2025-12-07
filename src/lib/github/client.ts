import { Octokit } from '@octokit/rest';

/**
 * GitHub API Client
 */
let octokitInstance: Octokit | null = null;

/**
 * Get or create Octokit instance
 *
 * @param token - GitHub personal access token (optional, uses env var if not provided)
 * @returns Configured Octokit instance
 * @throws Error if no token is provided and GITHUB_TOKEN env var is not set
 */
export function getOctokit(token?: string): Octokit {
  // ステップ1: トークンの取得（引数 > 環境変数の優先順位）
  const authToken = token || process.env.GITHUB_TOKEN;

  // ステップ2: トークンの検証
  if (!authToken) {
    throw new Error(
      'GitHub token is required. Provide it as an argument or set GITHUB_TOKEN environment variable.'
    );
  }

  // ステップ3: 既存インスタンスがあれば再利用（シングルトンパターン）
  if (octokitInstance) {
    return octokitInstance;
  }

  // ステップ4: 新規インスタンスの作成
  octokitInstance = new Octokit({
    auth: authToken,  // 認証トークン
    userAgent: 'code-review-dashboard/1.0.0', // APIリクエストのUser-Agent識別子
    timeZone: 'Asia/Tokyo', // タイムゾーン設定
    baseUrl: 'https://api.github.com',  // GitHub APIのエンドポイント
  });

  return octokitInstance;
}

/**
 * Reset the Octokit instance (useful for testing or token rotation)
 */
export function resetOctokit(): void {
  octokitInstance = null;
}

/**
 * Check if GitHub token is configured
 *
 * @returns true if token is available
 */
export function hasGitHubToken(): boolean {
  return !!process.env.GITHUB_TOKEN;
}
