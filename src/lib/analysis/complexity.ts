import type { GitHubDiff } from '@/types/github';
import type { ComplexityMetrics } from '@/types/analysis';
import { COMPLEXITY } from './constants';

/**
 * Pull Requestの複雑度メトリクスを計算
 *
 * このアルゴリズムは以下の要素を考慮します：
 * 1. 変更行数の対数スケール（極端な値を避けるため）
 * 2. ファイル数の乗数（多数のファイル変更は複雑度を増加させる）
 * 3. パッチ密度ファクター（ファイルあたりの変更量）
 *
 * スコア計算式：
 * - lineScore: min(log10(lines + 1) * 20, 50) → 最大50点
 * - fileScore: min(files * 2, 30) → 最大30点
 * - densityScore: min(avg_changes / 10, 20) → 最大20点
 * - 合計: 0-100点
 *
 * @param diff - 差分情報
 * @returns 複雑度メトリクス（0-100のスコアを含む）
 *
 * @example
 * ```typescript
 * const diff = await getPullRequestDiff({ owner, repo, pull_number });
 * const complexity = calculateComplexity(diff);
 *
 * console.log(`Complexity: ${complexity.complexity_level}`);
 * console.log(`Score: ${complexity.complexity_score}/100`);
 * ```
 */
export function calculateComplexity(diff: GitHubDiff): ComplexityMetrics {
  // ステップ1: 基本メトリクスの集計
  const lines_changed = diff.total_additions + diff.total_deletions;
  const files_changed = diff.files.length;
  const avg_changes_per_file = files_changed > 0 ? lines_changed / files_changed : 0;

  // ステップ2: 複雑度スコアの計算（0-100）

  // 2.1: 変更行数スコア（対数スケール、最大50点）
  // 対数を使用することで、1000行と10000行の差が線形にならないようにする
  const lineScore = Math.min(
    Math.log10(lines_changed + 1) * COMPLEXITY.SCORE.LINE_LOG_MULTIPLIER,
    COMPLEXITY.SCORE.MAX_LINE_SCORE
  );

  // 2.2: ファイル数スコア（線形スケール、最大30点）
  // ファイル数が多いと複雑度が増加（1ファイル = 2点）
  const fileScore = Math.min(
    files_changed * COMPLEXITY.SCORE.FILE_MULTIPLIER,
    COMPLEXITY.SCORE.MAX_FILE_SCORE
  );

  // 2.3: 密度スコア（ファイルあたりの変更量、最大20点）
  // ファイルあたりの変更が多いと、各ファイルが複雑になる
  const densityScore = Math.min(
    avg_changes_per_file / COMPLEXITY.SCORE.DENSITY_DIVISOR,
    COMPLEXITY.SCORE.MAX_DENSITY_SCORE
  );

  // 2.4: 合計スコア（0-100の範囲で丸める）
  const complexity_score = Math.round(lineScore + fileScore + densityScore);

  // ステップ3: 複雑度レベルの判定
  let complexity_level: 'low' | 'medium' | 'high';
  if (complexity_score <= COMPLEXITY.THRESHOLD.LOW) {
    complexity_level = 'low'; // 0-30点: 低複雑度
  } else if (complexity_score <= COMPLEXITY.THRESHOLD.MEDIUM) {
    complexity_level = 'medium'; // 31-60点: 中複雑度
  } else {
    complexity_level = 'high'; // 61-100点: 高複雑度
  }

  // ステップ4: メトリクスの返却
  return {
    lines_changed,
    files_changed,
    avg_changes_per_file:
      Math.round(avg_changes_per_file * COMPLEXITY.SCORE.DECIMAL_PRECISION) /
      COMPLEXITY.SCORE.DECIMAL_PRECISION, // 小数第1位まで
    complexity_score,
    complexity_level,
  };
}
