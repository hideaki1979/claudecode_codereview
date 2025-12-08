/**
 * Pull Request Analysis Constants
 *
 * このファイルは、PR分析アルゴリズムで使用する定数を集約しています。
 * マジックナンバーを排除し、保守性と可読性を向上させます。
 */

/**
 * 複雑度計算の定数
 */
export const COMPLEXITY = {
  /** スコア計算の係数 */
  SCORE: {
    /** 変更行数スコアの対数乗数 */
    LINE_LOG_MULTIPLIER: 20,
    /** 変更行数スコアの最大値 */
    MAX_LINE_SCORE: 50,
    /** ファイルあたりのスコア乗数 */
    FILE_MULTIPLIER: 2,
    /** ファイル数スコアの最大値 */
    MAX_FILE_SCORE: 30,
    /** 密度スコアの除数 */
    DENSITY_DIVISOR: 10,
    /** 密度スコアの最大値 */
    MAX_DENSITY_SCORE: 20,
    /** 小数点丸めの桁数（第1位） */
    DECIMAL_PRECISION: 10,
  },
  /** 複雑度レベルの閾値 */
  THRESHOLD: {
    /** 低複雑度の上限（0-30点） */
    LOW: 30,
    /** 中複雑度の上限（31-60点） */
    MEDIUM: 60,
    /** 高複雑度は61-100点 */
  },
} as const;

/**
 * リスク計算の定数
 */
export const RISK = {
  /** リスクスコアの重み */
  WEIGHT: {
    /** 複雑度の重み（40%） */
    COMPLEXITY: 0.4,
    /** 影響レベルの重み（60%） */
    IMPACT: 0.6,
  },
  /** 影響レベルごとのリスクスコア */
  IMPACT_SCORE: {
    /** 低影響（20点） */
    LOW: 20,
    /** 中影響（50点） */
    MEDIUM: 50,
    /** 高影響（75点） */
    HIGH: 75,
    /** 最重要（100点） */
    CRITICAL: 100,
  },
  /** リスク要因の閾値 */
  FACTOR_THRESHOLD: {
    /** 大規模差分の閾値（500行超） */
    LARGE_DIFF_LINES: 500,
    /** 多数ファイルの閾値（20ファイル超） */
    MANY_FILES_COUNT: 20,
  },
  /** リスク要因のペナルティスコア */
  PENALTY: {
    /** 大規模差分のペナルティ */
    LARGE_DIFF: 5,
    /** 多数ファイルのペナルティ */
    MANY_FILES: 5,
    /** クリティカル変更のペナルティ */
    CRITICAL_CHANGES: 10,
    /** 設定変更のペナルティ */
    CONFIG_CHANGES: 5,
  },
  /** リスクレベルの閾値 */
  THRESHOLD: {
    /** 低リスクの上限（0-30点） */
    LOW: 30,
    /** 中リスクの上限（31-60点） */
    MEDIUM: 60,
    /** 高リスクの上限（61-85点） */
    HIGH: 85,
    /** 最高リスクは86-100点 */
  },
  /** リスクスコアの上限 */
  MAX_SCORE: 100,
} as const;

/**
 * 影響範囲分析の定数
 */
export const IMPACT = {
  /** 影響レベルの閾値 */
  THRESHOLD: {
    /** 高影響のディレクトリ数閾値 */
    HIGH_DIRECTORIES: 10,
    /** 高影響のファイル数閾値 */
    HIGH_FILES: 30,
    /** 中影響のディレクトリ数閾値 */
    MEDIUM_DIRECTORIES: 5,
    /** 中影響のファイル数閾値 */
    MEDIUM_FILES: 15,
  },
} as const;

/**
 * クリティカルファイルのリスト
 *
 * これらのファイルが変更された場合、影響レベルが「critical」に設定されます。
 * プロジェクトのインフラストラクチャや設定に関わる重要なファイルです。
 */
export const CRITICAL_FILES = new Set([
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
