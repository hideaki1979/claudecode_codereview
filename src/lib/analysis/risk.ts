import type { ComplexityMetrics, ImpactMetrics, RiskAssessment } from '@/types/analysis';
import { RISK } from './constants';

/**
 * 複雑度と影響範囲を組み合わせた総合的なリスクスコアを計算
 *
 * リスク計算式：
 * 1. 基本リスク = 複雑度スコア × 0.4 + 影響レベル重み × 0.6
 * 2. 追加要因による修正:
 *    - 大規模差分（500行超）: +5点
 *    - 多数ファイル（20ファイル超）: +5点
 *    - クリティカル変更: +10点
 *    - 設定変更: +5点
 * 3. 最大100点にキャップ
 *
 * リスクレベルの判定基準：
 * - low (0-30点): 低リスク、通常のレビュープロセス
 * - medium (31-60点): 中リスク、注意深いレビューが必要
 * - high (61-85点): 高リスク、複数レビュアーを推奨
 * - critical (86-100点): 最高リスク、特別な注意が必要
 *
 * @param complexity - 複雑度メトリクス
 * @param impact - 影響範囲メトリクス
 * @returns スコアと推奨事項を含むリスク評価
 *
 * @example
 * ```typescript
 * const complexity = calculateComplexity(diff);
 * const impact = analyzeImpact(diff);
 * const risk = calculateRisk(complexity, impact);
 *
 * console.log(`Risk level: ${risk.risk_level} (${risk.risk_score}/100)`);
 * risk.recommendations.forEach(rec => console.log(`- ${rec}`));
 * ```
 */
export function calculateRisk(
  complexity: ComplexityMetrics,
  impact: ImpactMetrics
): RiskAssessment {
  // ステップ1: 基本リスクの計算

  // 1.1: 複雑度からのリスク（40%の重み）
  const complexityRisk = complexity.complexity_score * RISK.WEIGHT.COMPLEXITY;

  // 1.2: 影響レベルからのリスク（60%の重み）
  // 影響レベルに対応する重み付け
  const impactWeights = {
    low: RISK.IMPACT_SCORE.LOW, // 低影響: 20点
    medium: RISK.IMPACT_SCORE.MEDIUM, // 中影響: 50点
    high: RISK.IMPACT_SCORE.HIGH, // 高影響: 75点
    critical: RISK.IMPACT_SCORE.CRITICAL, // 最重要: 100点
  };
  const impactRisk = impactWeights[impact.impact_level] * RISK.WEIGHT.IMPACT;

  // ステップ2: リスク要因の判定
  const factors = {
    // 大規模な差分（500行超）
    large_diff: complexity.lines_changed > RISK.FACTOR_THRESHOLD.LARGE_DIFF_LINES,
    // 多数のファイル変更（20ファイル超）
    many_files: complexity.files_changed > RISK.FACTOR_THRESHOLD.MANY_FILES_COUNT,
    // クリティカルファイルの変更あり
    critical_changes: impact.critical_files.length > 0,
    // 設定ファイルの変更あり（package.jsonや設定ファイル）
    config_changes: impact.critical_files.some(
      (f) => f.includes('config') || f.includes('package.json')
    ),
  };

  // ステップ3: 追加要因によるスコア修正
  let risk_score = complexityRisk + impactRisk;

  if (factors.large_diff) {
    risk_score += RISK.PENALTY.LARGE_DIFF; // 大規模差分のペナルティ
  }
  if (factors.many_files) {
    risk_score += RISK.PENALTY.MANY_FILES; // 多数ファイルのペナルティ
  }
  if (factors.critical_changes) {
    risk_score += RISK.PENALTY.CRITICAL_CHANGES; // クリティカル変更の大きなペナルティ
  }
  if (factors.config_changes) {
    risk_score += RISK.PENALTY.CONFIG_CHANGES; // 設定変更のペナルティ
  }

  // 3.1: スコアを0-100の範囲に制限し、整数に丸める
  risk_score = Math.min(Math.round(risk_score), RISK.MAX_SCORE);

  // ステップ4: リスクレベルの判定
  let risk_level: 'low' | 'medium' | 'high' | 'critical';
  if (risk_score <= RISK.THRESHOLD.LOW) {
    risk_level = 'low'; // 0-30点: 低リスク
  } else if (risk_score <= RISK.THRESHOLD.MEDIUM) {
    risk_level = 'medium'; // 31-60点: 中リスク
  } else if (risk_score <= RISK.THRESHOLD.HIGH) {
    risk_level = 'high'; // 61-85点: 高リスク
  } else {
    risk_level = 'critical'; // 86-100点: 最高リスク
  }

  // ステップ5: 推奨事項の生成
  const recommendations: string[] = [];

  // 5.1: 要因別の推奨事項
  if (factors.large_diff) {
    recommendations.push('このPRをより小さなチャンクに分割することを検討してください');
  }
  if (factors.many_files) {
    recommendations.push('多数のファイルが変更されています - 徹底的なテストを確認してください');
  }
  if (factors.critical_changes) {
    recommendations.push('クリティカルなファイルが変更されています - 追加のレビュー注意が必要です');
  }

  // 5.2: リスクレベル別の推奨事項
  if (risk_level === 'critical' || risk_level === 'high') {
    recommendations.push('高リスクのPRです - 複数のレビュアーによるレビューを推奨します');
  }

  // ステップ6: リスク評価の返却
  return {
    risk_score,
    risk_level,
    factors,
    recommendations,
  };
}
