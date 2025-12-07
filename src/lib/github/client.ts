import { Octokit } from '@octokit/rest';

/**
 * GitHub API Client
 */
let octokitInstance: Octokit | null = null;

/**
 * Octokitインスタンスの取得または作成
 *
 * @param token - GitHubパーソナルアクセストークン（オプション、未指定の場合は環境変数を使用）
 * @returns 設定済みのOctokitインスタンス
 * @throws トークンが提供されず、GITHUB_TOKEN環境変数も設定されていない場合にエラーをスロー
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

  // ステップ3: トークンが明示的に渡された場合は、常に新しいインスタンスを作成
  // これにより、異なるトークンで呼び出された場合に正しい認証情報が使用される
  if (token) {
    return new Octokit({
      auth: authToken,
      userAgent: 'code-review-dashboard/1.0.0',
      timeZone: 'Asia/Tokyo',
      baseUrl: 'https://api.github.com',
    });
  }

  // ステップ4: 環境変数のみを使用する場合は、シングルトンパターンを適用
  // パフォーマンス向上のため、既存インスタンスがあれば再利用
  if (octokitInstance) {
    return octokitInstance;
  }

  // ステップ5: 新規インスタンスの作成（環境変数を使用）
  octokitInstance = new Octokit({
    auth: authToken,  // 認証トークン
    userAgent: 'code-review-dashboard/1.0.0', // APIリクエストのUser-Agent識別子
    timeZone: 'Asia/Tokyo', // タイムゾーン設定
    baseUrl: 'https://api.github.com',  // GitHub APIのエンドポイント
  });

  return octokitInstance;
}

/**
 * Octokitインスタンスのリセット（テストやトークンローテーションに有用）
 */
export function resetOctokit(): void {
  octokitInstance = null;
}

/**
 * GitHubトークンが設定されているかチェック
 *
 * @returns トークンが利用可能な場合true
 */
export function hasGitHubToken(): boolean {
  return !!process.env.GITHUB_TOKEN;
}
