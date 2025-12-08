import type { GitHubDiff } from '@/types/github';
import type { ImpactMetrics } from '@/types/analysis';

/**
 * クリティカルファイルのリスト
 *
 * これらのファイルが変更された場合、影響レベルが「critical」に設定されます。
 * プロジェクトのインフラストラクチャや設定に関わる重要なファイルです。
 */
const CRITICAL_FILES = new Set([
  'package.json', // npm依存関係
  'package-lock.json', // npm依存関係のロック
  'tsconfig.json', // TypeScript設定
  'next.config.js', // Next.js設定（JavaScript）
  'next.config.ts', // Next.js設定（TypeScript）
  '.env', // 環境変数
  '.env.local', // ローカル環境変数
  'Dockerfile', // Dockerイメージビルド定義
  'docker-compose.yml', // Dockerコンテナオーケストレーション
]);

/**
 * Pull Requestの変更が与える影響範囲を分析
 *
 * 以下の観点から影響を評価します：
 * 1. 変更されたファイルタイプの分類
 * 2. クリティカルなインフラファイルの変更有無
 * 3. 影響を受けるディレクトリの深さと範囲
 *
 * 影響レベルの判定基準：
 * - critical: クリティカルファイルが1つでも変更されている
 * - high: 10ディレクトリ超または30ファイル超の変更
 * - medium: 5ディレクトリ超または15ファイル超の変更
 * - low: 上記以外
 *
 * @param diff - 差分情報
 * @returns 影響範囲メトリクスとレベル
 *
 * @example
 * ```typescript
 * const diff = await getPullRequestDiff({ owner, repo, pull_number });
 * const impact = analyzeImpact(diff);
 *
 * console.log(`Impact level: ${impact.impact_level}`);
 * console.log(`File types affected: ${Object.keys(impact.file_types).join(', ')}`);
 *
 * if (impact.critical_files.length > 0) {
 *   console.warn('Critical files changed:', impact.critical_files);
 * }
 * ```
 */
export function analyzeImpact(diff: GitHubDiff): ImpactMetrics {
  // ステップ1: 初期化
  const file_types: Record<string, number> = {};
  const critical_files: string[] = [];
  const affected_directories = new Set<string>();

  // ステップ2: 各ファイルの分析
  for (const file of diff.files) {
    // 2.1: ファイル拡張子の抽出とカウント
    const lastDotIndex = file.filename.lastIndexOf('.');
    const lastSlashIndex = file.filename.lastIndexOf('/');
    const ext = lastDotIndex > lastSlashIndex ? file.filename.substring(lastDotIndex) : 'no-ext'; // 拡張子なしのファイル（README、Dockerfileなど）
    file_types[ext] = (file_types[ext] || 0) + 1;

    // 2.2: クリティカルファイルのチェック
    const filename = file.filename.split('/').pop() || '';
    if (CRITICAL_FILES.has(filename)) {
      critical_files.push(file.filename);
    }

    // 2.3: 影響を受けるディレクトリの追跡
    const dir = file.filename.includes('/')
      ? file.filename.substring(0, file.filename.lastIndexOf('/'))
      : '.'; // ルートディレクトリのファイル
    affected_directories.add(dir);
  }

  // ステップ3: 影響レベルの判定
  let impact_level: 'low' | 'medium' | 'high' | 'critical';

  if (critical_files.length > 0) {
    // クリティカルファイルが変更されている場合は最高レベル
    impact_level = 'critical';
  } else if (affected_directories.size > 10 || diff.files.length > 30) {
    // 広範囲なディレクトリまたは多数のファイルに影響
    impact_level = 'high';
  } else if (affected_directories.size > 5 || diff.files.length > 15) {
    // 中程度の範囲に影響
    impact_level = 'medium';
  } else {
    // 限定的な範囲の変更
    impact_level = 'low';
  }

  // ステップ4: メトリクスの返却
  return {
    file_types,
    critical_files,
    affected_directories: Array.from(affected_directories).sort(), // ソートして一貫性を保つ
    impact_level,
  };
}
