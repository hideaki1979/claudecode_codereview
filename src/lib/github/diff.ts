import { getOctokit } from './client';
import { handleGitHubError, validateRepository, validatePullNumber } from './utils';
import type {
  GitHubDiff,
  GitHubPullRequestFile,
  GetPullRequestDiffParams,
} from '@/types/github';

/**
 * プルリクエストの差分を取得（変更されたファイルの一覧）
 *
 * @param params - リクエストパラメータ
 * @param token - オプションのGitHubトークン（未指定の場合は環境変数を使用）
 * @returns すべての変更ファイルを含む差分情報
 * @throws APIリクエストが失敗した場合にエラーをスロー
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

    // パラメータの検証
    validateRepository(owner, repo);
    validatePullNumber(pull_number);

    // ページネーションを使用して複数ページにわたるすべてのファイルを取得
    // これにより、100件を超える場合でもすべての変更ファイルを取得できる
    const files = (await octokit.paginate(octokit.rest.pulls.listFiles, {
      owner,
      repo,
      pull_number,
      per_page: 100, // 最大許容値
    })) as GitHubPullRequestFile[];

    // 合計値の計算
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
 * プルリクエストの生のパッチコンテンツを取得
 *
 * @param params - リクエストパラメータ
 * @param token - オプションのGitHubトークン（未指定の場合は環境変数を使用）
 * @returns 生のパッチ文字列
 * @throws APIリクエストが失敗した場合にエラーをスロー
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

/**
 * レスポンスデータが文字列（パッチ形式）かどうかをチェックする型ガード関数
 * Octokitの型定義がmediaTypeフォーマットの変更を反映していないため、この関数が必要です
 */
function isPatchString(data: unknown): data is string {
  return typeof data === 'string';
}

// 生のパッチ形式取得
export async function getPullRequestPatch(
  params: GetPullRequestDiffParams,
  token?: string
): Promise<string> {
  try {
    const octokit = getOctokit(token);

    const { owner, repo, pull_number } = params;

    // パラメータの検証
    validateRepository(owner, repo);
    validatePullNumber(pull_number);

    // パッチ形式でリクエスト
    const response = await octokit.rest.pulls.get({
      owner,
      repo,
      pull_number,
      mediaType: {
        format: 'patch',
      },
    });

    // mediaType.formatが'patch'の場合、実行時にはresponse.dataは生のパッチ文字列になります。
    // しかし、OctokitのTypeScript型定義がこれを反映していないため、型アサーションが必要です。
    // 型ガードを使用して、実行時にデータが文字列であることを確認
    // これにより、型安全性を保ちながら、意図を明確にできます
    if (!isPatchString(response.data)) {
      throw new Error('Expected patch string but received unexpected data type');
    }

    return response.data;
  } catch (error) {
    throw handleGitHubError(error, 'Failed to fetch pull request patch');
  }
}

/**
 * プルリクエストから特定のファイルコンテンツを取得
 *
 * @param params - リクエストパラメータ
 * @param filename - 取得する特定のファイル名
 * @param token - オプションのGitHubトークン（未指定の場合は環境変数を使用）
 * @returns パッチを含むファイル情報
 * @throws APIリクエストが失敗した場合、またはファイルが見つからない場合にエラーをスロー
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
  token?: string,
  diff?: GitHubDiff // オプションの引数として差分オブジェクトを追加
): Promise<GitHubPullRequestFile> {
  try {
    if (!filename) {
      throw new Error('Filename is required');
    }

    const diffToUse = diff || (await getPullRequestDiff(params, token));

    const file = diffToUse.files.find((f) => f.filename === filename);

    if (!file) {
      throw new Error(`File '${filename}' not found in pull request changes`);
    }

    return file;
  } catch (error) {
    throw handleGitHubError(error, 'Failed to fetch pull request file');
  }
}

/**
 * ステータスでファイルをフィルタリング
 *
 * @param files - PRファイルの配列
 * @param status - フィルタリングするステータス
 * @returns フィルタリングされたファイルの配列
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
 * 拡張子でファイルをフィルタリング
 *
 * @param files - PRファイルの配列
 * @param extensions - フィルタリングする拡張子の配列（例: ['.ts', '.tsx']）
 * @returns フィルタリングされたファイルの配列
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

