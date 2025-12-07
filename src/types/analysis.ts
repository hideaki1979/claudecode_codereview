/**
 * Pull Request Analysis Types
 *
 * このファイルは、GitHub Pull Requestの分析結果を表す型定義を提供します。
 * 複雑度、影響範囲、リスク評価の3つの主要な分析軸に基づいています。
 */

/**
 * 複雑度メトリクス
 *
 * PRの複雑度を測定する指標の集合です。
 * 変更行数、変更ファイル数、ファイルあたりの平均変更量に基づいて算出されます。
 */
export interface ComplexityMetrics {
  /** 変更された行数の合計（追加 + 削除） */
  lines_changed: number;
  /** 変更されたファイル数 */
  files_changed: number;
  /** ファイルあたりの平均変更行数（小数点第1位まで） */
  avg_changes_per_file: number;
  /** 複雑度スコア（0-100の範囲） */
  complexity_score: number;
  /** 複雑度レベル */
  complexity_level: 'low' | 'medium' | 'high';
}

/**
 * 影響範囲メトリクス
 *
 * PRがプロジェクトに与える影響の範囲を評価します。
 * ファイルタイプ、クリティカルファイル、影響を受けるディレクトリを分析します。
 */
export interface ImpactMetrics {
  /** ファイルタイプごとの変更数 (例: { '.ts': 5, '.tsx': 3 }) */
  file_types: Record<string, number>;
  /** 変更されたクリティカルファイルのリスト（package.json、設定ファイルなど） */
  critical_files: string[];
  /** 影響を受けるディレクトリのリスト */
  affected_directories: string[];
  /** 影響レベル */
  impact_level: 'low' | 'medium' | 'high' | 'critical';
}

/**
 * リスク要因
 *
 * PRのリスクを高める具体的な要因を示すフラグの集合です。
 */
export interface RiskFactors {
  /** 大規模な差分（500行超）が含まれているか */
  large_diff: boolean;
  /** 多数のファイル（20ファイル超）が変更されているか */
  many_files: boolean;
  /** クリティカルなファイルが変更されているか */
  critical_changes: boolean;
  /** 設定ファイルが変更されているか */
  config_changes: boolean;
}

/**
 * リスク評価
 *
 * PRの総合的なリスクレベルと具体的な推奨事項を含みます。
 * 複雑度と影響範囲を組み合わせて算出されます。
 */
export interface RiskAssessment {
  /** リスクスコア（0-100の範囲） */
  risk_score: number;
  /** リスクレベル */
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  /** リスク要因の詳細 */
  factors: RiskFactors;
  /** レビュー時の推奨事項 */
  recommendations: string[];
}

/**
 * 分析データ
 *
 * すべての分析結果を統合したデータ構造です。
 */
export interface AnalysisData {
  /** 複雑度メトリクス */
  complexity: ComplexityMetrics;
  /** 影響範囲メトリクス */
  impact: ImpactMetrics;
  /** リスク評価 */
  risk: RiskAssessment;
  /** 分析実行日時（ISO 8601形式） */
  analyzed_at: string;
}

/**
 * 分析結果（Discriminated Union パターン）
 *
 * 成功時と失敗時で異なる構造を持つ型安全な結果型です。
 * TypeScriptの型ガードを活用して、結果の状態に応じた適切な処理を可能にします。
 *
 * @example
 * ```typescript
 * const result = analyzePullRequest(pr, diff);
 *
 * if (result.status === 'success') {
 *   // result.data が利用可能（TypeScriptが型を推論）
 *   console.log(result.data.risk.risk_level);
 * } else {
 *   // result.error が利用可能
 *   console.error(result.error);
 * }
 * ```
 */
export type AnalysisResult =
  | {
      /** 分析成功を示すステータス */
      status: 'success';
      /** 分析データ */
      data: AnalysisData;
    }
  | {
      /** 分析失敗を示すステータス */
      status: 'error';
      /** エラーメッセージ */
      error: string;
      /** エラーコード（オプション） */
      code?: 'INVALID_INPUT' | 'ANALYSIS_FAILED';
    };
