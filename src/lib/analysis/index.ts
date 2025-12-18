import type { GitHubDiff } from '@/types/github';
import type { AnalysisData, AnalysisResult } from '@/types/analysis';
import { calculateComplexity } from './complexity';
import { analyzeImpact } from './impact';
import { calculateRisk } from './risk';
import { analyzeSecurity, createEmptySecurityMetrics } from './security';

/**
 * Pull Requestの差分を包括的に分析
 *
 * このメイン関数は、PR分析のエントリーポイントです。
 * 複雑度計算、影響範囲分析、リスク評価を統合的に実行します。
 *
 * 分析プロセス：
 * 1. 入力の検証（差分情報の妥当性チェック）
 * 2. 複雑度の計算（変更量、ファイル数、密度の評価）
 * 3. 影響範囲の分析（ファイルタイプ、クリティカルファイル、ディレクトリ）
 * 4. リスクの評価（複雑度と影響範囲を組み合わせた総合評価）
 * 5. 結果の返却（成功/失敗を明示的に示すDiscriminated Union）
 *
 * エラーハンドリング：
 * - 入力が不正な場合: INVALID_INPUT エラーコード
 * - 分析中に例外が発生した場合: ANALYSIS_FAILED エラーコード
 * - 空の差分（変更なし）: 成功として扱い、すべてのメトリクスを0/lowに設定
 *
 * @param diff - GitHub APIから取得した差分情報（ファイル変更の詳細）
 * @returns 成功/失敗を示すステータス付きの分析結果
 *
 * @example
 * ```typescript
 * // 基本的な使用例
 * import { analyzePullRequest } from '@/lib/analysis';
 * import { getPullRequestDiff } from '@/lib/github';
 *
 * const diff = await getPullRequestDiff({
 *   owner: 'facebook',
 *   repo: 'react',
 *   pull_number: 12345
 * });
 *
 * const result = analyzePullRequest(diff);
 *
 * // 型安全なパターンマッチング
 * if (result.status === 'success') {
 *   console.log(`Risk level: ${result.data.risk.risk_level}`);
 *   console.log(`Complexity: ${result.data.complexity.complexity_level}`);
 *   console.log(`Impact: ${result.data.impact.impact_level}`);
 *
 *   // 推奨事項の表示
 *   result.data.risk.recommendations.forEach(rec => {
 *     console.log(`Recommendation: ${rec}`);
 *   });
 * } else {
 *   console.error(`Analysis failed: ${result.error}`);
 *   console.error(`Error code: ${result.code}`);
 * }
 * ```
 *
 * @example
 * ```typescript
 * // API Route内での使用例
 * import { NextResponse } from 'next/server';
 *
 * export async function GET(request: Request) {
 *   const diff = await getPullRequestDiff({ owner, repo, pull_number });
 *
 *   const result = analyzePullRequest(diff);
 *
 *   if (result.status === 'success') {
 *     return NextResponse.json(result.data);
 *   } else {
 *     return NextResponse.json(
 *       { error: result.error, code: result.code },
 *       { status: 400 }
 *     );
 *   }
 * }
 * ```
 */

function createEmptyAnalysisData(): AnalysisData {
  return {
    complexity: {
      lines_changed: 0,
      files_changed: 0,
      avg_changes_per_file: 0,
      complexity_score: 0,
      complexity_level: 'low',
    },
    impact: {
      file_types: {},
      critical_files: [],
      affected_directories: [],
      impact_level: 'low',
    },
    risk: {
      risk_score: 0,
      risk_level: 'low',
      factors: {
        large_diff: false,
        many_files: false,
        critical_changes: false,
        config_changes: false,
      },
      recommendations: [],
    },
    security: createEmptySecurityMetrics(),
    analyzed_at: new Date().toISOString(),
  }
}

export function analyzePullRequest(diff: GitHubDiff): AnalysisResult {
  try {
    // ステップ1: 入力の検証
    if (!diff) {
      return {
        status: 'error',
        error: 'Invalid input: diff is required',
        code: 'INVALID_INPUT',
      };
    }

    // ステップ2: 空のPRの処理（変更がない場合）
    if (!diff.files || diff.files.length === 0) {
      // 変更のないPRは成功として扱い、最小限の分析結果を返す
      return {
        status: 'success',
        data: createEmptyAnalysisData()
      };
    }
    // ステップ3: 分析の実行

    // 3.1: 複雑度の計算
    const complexity = calculateComplexity(diff);

    // 3.2: 影響範囲の分析
    const impact = analyzeImpact(diff);

    // 3.3: リスクの評価（複雑度と影響範囲を組み合わせる）
    const risk = calculateRisk(complexity, impact);

    // 3.4: セキュリティスキャン
    const security = analyzeSecurity(diff);

    // ステップ4: 成功結果の返却
    return {
      status: 'success',
      data: {
        complexity,
        impact,
        risk,
        security,
        analyzed_at: new Date().toISOString(),
      },
    };
  } catch (error) {
    // ステップ5: エラーハンドリング
    return {
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown analysis error',
      code: 'ANALYSIS_FAILED',
    };
  }
}

// 個別の分析関数を再エクスポート（テスト用）
export { calculateComplexity } from './complexity';
export { analyzeImpact } from './impact';
export { calculateRisk } from './risk';
export { analyzeSecurity, createEmptySecurityMetrics } from './security';
export type { SecurityMetrics, SecurityIssue, SecuritySeverity } from './security';
