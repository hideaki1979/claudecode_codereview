#!/usr/bin/env node

/**
 * GitHub Actions用: PR分析とラベル自動付与スクリプト
 *
 * 環境変数:
 * - GITHUB_TOKEN: GitHub API認証トークン
 * - PR_NUMBER: プルリクエスト番号
 * - REPO_OWNER: リポジトリオーナー
 * - REPO_NAME: リポジトリ名
 */

const { Octokit } = require('@octokit/rest');
const fs = require('fs');
const path = require('path');

const ANALYSIS_CONFIG = {
  THRESHOLDS: {
    // 複雑度の閾値
    COMPLEXITY_HIGH: 70,
    COMPLEXITY_MEDIUM: 40,
    // リスクレベルの閾値
    RISK_CRITICAL: 85,
    RISK_HIGH: 70,
    RISK_MEDIUM: 50,
    // 変更量の閾値
    LARGE_CHANGES_LINES: 500,
    MANY_FILES: 20,
  },
  WEIGHTS: {
    LINES_CHANGED: 0.1,
    FILES_CHANGED: 5,
    COMPLEXITY_FACTOR: 0.5,
  },
  RISK_ADDITIONS: {
    CRITICAL_FILES: 20,
    LARGE_CHANGES: 15,
    MANY_FILES: 10,
  },
  CRITICAL_PATTERNS_EXACT: [
    'package.json',
    'package-lock.json',
    'tsconfig.json',
  ],
  CRITICAL_PATTERNS_PREFIX: [
    '.env',
    'next.config',
  ],
  CONSTANTS: {
    MAX_SCORE: 100,
    PARSE_INT_RADIX: 10,
    HTTP_STATUS_NOT_FOUND: 404,
    HTTP_STATUS_UNPROCESSABLE_CONTENT: 422,
    JSON_INDENT: 2,
    EXIT_CODE_ERROR: 1,
    PER_PAGE: 100,
  },
};

// 環境変数チェック
const {
  GITHUB_TOKEN,
  PR_NUMBER,
  REPO_OWNER,
  REPO_NAME,
} = process.env;

// PR_NUMBERを数値にパースし、NaNチェック
const PARSED_PR_NUMBER = parseInt(PR_NUMBER, ANALYSIS_CONFIG.CONSTANTS.PARSE_INT_RADIX);

if (!GITHUB_TOKEN || !PR_NUMBER || !REPO_OWNER || !REPO_NAME) {
  console.error('❌ 必要な環境変数が設定されていません');
  process.exit(ANALYSIS_CONFIG.CONSTANTS.EXIT_CODE_ERROR);
}

if (isNaN(PARSED_PR_NUMBER)) {
  console.error(`❌ PR_NUMBER が不正な数値です: ${PR_NUMBER}`);
  process.exit(ANALYSIS_CONFIG.CONSTANTS.EXIT_CODE_ERROR);
}

// Octokitクライアント初期化
const octokit = new Octokit({
  auth: GITHUB_TOKEN,
});

/**
 * ラベル定義
 */
const LABELS = {
  risk: {
    low: { name: 'low-risk', color: '0E8A16', description: '🟢 リスクレベル: 低' },
    medium: { name: 'medium-risk', color: 'FBCA04', description: '🟡 リスクレベル: 中' },
    high: { name: 'high-risk', color: 'D93F0B', description: '🔴 リスクレベル: 高' },
    critical: { name: 'critical-risk', color: 'B60205', description: '🚨 リスクレベル: 緊急' },
  },
  features: {
    largeChanges: { name: 'large-changes', color: '5319E7', description: '📊 大規模な変更' },
    criticalFiles: { name: 'critical-files-modified', color: 'D93F0B', description: '⚠️ クリティカルファイル変更' },
    securityReview: { name: 'security-review-needed', color: 'B60205', description: '🔒 セキュリティレビュー要' },
  },
};

/**
 * リポジトリにラベルを作成（存在しない場合）
 */
async function ensureLabelsExist() {
  console.log('📋 ラベルの確認と作成...');

  const allDefinedLabels = [
    ...Object.values(LABELS.risk),
    ...Object.values(LABELS.features),
  ];

  const { data: existingLabels } = await octokit.rest.issues.listLabelsForRepo({
    owner: REPO_OWNER,
    repo: REPO_NAME,
    per_page: ANALYSIS_CONFIG.CONSTANTS.PER_PAGE,
  });

  const existingLabelNames = new Set(existingLabels.map(l => l.name));

  const labelsToCreate = allDefinedLabels.filter(label => !existingLabelNames.has(label.name));

  allDefinedLabels.forEach(label => {
    if (existingLabelNames.has(label.name)) {
      console.log(`  ✓ ラベル "${label.name}" は既に存在します`);
    }
  });

  if (labelsToCreate.length === 0) {
    return;
  }

  await Promise.all(
    labelsToCreate.map(async (label) => {
      try {
        // ラベルを作成（存在する場合はAPIエラーが返ることを期待）
        await octokit.rest.issues.createLabel({
          owner: REPO_OWNER,
          repo: REPO_NAME,
          name: label.name,
          color: label.color,
          description: label.description,
        });
        console.log(`  ✓ ラベル "${label.name}" を作成しました。`);
      } catch (error) {
        if (error.status === ANALYSIS_CONFIG.CONSTANTS.HTTP_STATUS_UNPROCESSABLE_CONTENT &&
          error.message.includes('already exists')
        ) {
          console.log(`  - ラベル "${label.name}" は既に存在します (競合)`);
        } else {
          console.error(`  ✗ ラベル "${label.name}" の確認中にエラー:`, error.message);
        }
      }
    })
  );
}

/**
 * PR差分を取得
 */
async function getPullRequestDiff() {
  console.log(`\n🔍 PR #${PR_NUMBER} の差分を取得中...`);

  const { data: files } = await octokit.rest.pulls.listFiles({
    owner: REPO_OWNER,
    repo: REPO_NAME,
    pull_number: PARSED_PR_NUMBER,
    per_page: ANALYSIS_CONFIG.CONSTANTS.PER_PAGE,
  });

  console.log(`  ✓ ${files.length} ファイルの変更を検出`);

  return {
    files: files.map(file => ({
      filename: file.filename,
      status: file.status,
      additions: file.additions,
      deletions: file.deletions,
      changes: file.changes,
      patch: file.patch || '',
    })),
  };
}

/**
 * 簡易版の分析ロジック（本番では src/lib/analysis を使用）
 */
function analyzeSimplified(diff) {
  const totalAdditions = diff.files.reduce((sum, f) => sum + f.additions, 0);
  const totalDeletions = diff.files.reduce((sum, f) => sum + f.deletions, 0);
  const linesChanged = totalAdditions + totalDeletions;
  const filesChanged = diff.files.length;

  // 複雑度計算
  const complexityScore = Math.min(
    ANALYSIS_CONFIG.CONSTANTS.MAX_SCORE,
    Math.floor((linesChanged * ANALYSIS_CONFIG.WEIGHTS.LINES_CHANGED + filesChanged * ANALYSIS_CONFIG.WEIGHTS.FILES_CHANGED) * ANALYSIS_CONFIG.WEIGHTS.COMPLEXITY_FACTOR)
  );

  let complexityLevel = 'low';
  if (complexityScore >= ANALYSIS_CONFIG.THRESHOLDS.COMPLEXITY_HIGH) complexityLevel = 'high';
  else if (complexityScore >= ANALYSIS_CONFIG.THRESHOLDS.COMPLEXITY_MEDIUM) complexityLevel = 'medium';

  // クリティカルファイル検出
  const criticalFiles = diff.files.filter(f => {
    const base = path.basename(f.filename);
    const isExactMatch = ANALYSIS_CONFIG.CRITICAL_PATTERNS_EXACT.includes(base);
    const isPrefixMatch = ANALYSIS_CONFIG.CRITICAL_PATTERNS_PREFIX.some(p => base.startsWith(p));
    return isExactMatch || isPrefixMatch;
  }
  ).map(f => f.filename);

  // リスク評価
  let riskScore = complexityScore;
  let riskLevel = 'low';

  if (criticalFiles.length > 0) riskScore += ANALYSIS_CONFIG.RISK_ADDITIONS.CRITICAL_FILES;
  if (linesChanged > ANALYSIS_CONFIG.THRESHOLDS.LARGE_CHANGES_LINES) riskScore += ANALYSIS_CONFIG.RISK_ADDITIONS.LARGE_CHANGES;
  if (filesChanged > ANALYSIS_CONFIG.THRESHOLDS.MANY_FILES) riskScore += ANALYSIS_CONFIG.RISK_ADDITIONS.MANY_FILES;

  riskScore = Math.min(ANALYSIS_CONFIG.CONSTANTS.MAX_SCORE, riskScore);
  if (riskScore >= ANALYSIS_CONFIG.THRESHOLDS.RISK_CRITICAL) riskLevel = 'critical';
  else if (riskScore >= ANALYSIS_CONFIG.THRESHOLDS.RISK_HIGH) riskLevel = 'high';
  else if (riskScore >= ANALYSIS_CONFIG.THRESHOLDS.RISK_MEDIUM) riskLevel = 'medium';

  // 推奨事項
  const recommendations = [];
  if (linesChanged > ANALYSIS_CONFIG.THRESHOLDS.LARGE_CHANGES_LINES) {
    recommendations.push('大規模な変更が含まれています。可能であればPRを分割してください。');
  }
  if (criticalFiles.length > 0) {
    recommendations.push(`クリティカルファイルが変更されています: ${criticalFiles.join(', ')}`);
  }
  if (filesChanged > ANALYSIS_CONFIG.THRESHOLDS.MANY_FILES) {
    recommendations.push('多数のファイルが変更されています。慎重にレビューしてください。');
  }

  return {
    complexity: {
      lines_changed: linesChanged,
      files_changed: filesChanged,
      complexity_score: complexityScore,
      complexity_level: complexityLevel,
    },
    impact: {
      critical_files: criticalFiles,
      affected_directories: [...new Set(diff.files.map(f => path.dirname(f.filename)))],
    },
    risk: {
      risk_score: riskScore,
      risk_level: riskLevel,
      recommendations,
    },
  };
}

/**
 * PRにラベルを付与
 */
async function applyLabels(analysis) {
  console.log('\n🏷️  ラベルを適用中...');

  // 1. この実行で適用すべきラベルを決定
  const newLabels = new Set();

  // リスクレベルラベル
  const riskLabel = LABELS.risk[analysis.risk.risk_level];
  if (riskLabel) {
    newLabels.push(riskLabel.name);
    console.log(`  ✓ リスクレベル: ${riskLabel.description}`);
  }

  // 大規模変更ラベル
  if (analysis.complexity.lines_changed > ANALYSIS_CONFIG.THRESHOLDS.LARGE_CHANGES_LINES) {
    newLabels.push(LABELS.features.largeChanges.name);
    console.log(`  ✓ ${LABELS.features.largeChanges.description}`);
  }

  // クリティカルファイル変更ラベル
  if (analysis.impact.critical_files.length > 0) {
    newLabels.push(LABELS.features.criticalFiles.name);
    console.log(`  ✓ ${LABELS.features.criticalFiles.description}`);
  }

  // 2. 現在PRに付与されているラベルを取得
  const { data: currentLabels } = await octokit.rest.issues.listLabelsOnIssue({
    owner: REPO_OWNER,
    repo: REPO_NAME,
    issue_number: PARSED_PR_NUMBER,
  });

  // 3. このアクションが管理するすべてのラベル名を定義
  const managedLabelNames = new Set([
    ...Object.values(LABELS.risk).map(l => l.name),
    ...Object.values(LABELS.features).map(l => l.name),
  ]);

  // 4. 手動で付与されたラベルを維持するため、管理外のラベルをフィルタリング
  const finalLabels = currentLabels
    .map(l => l.name)
    .filter(name => !managedLabelNames.has(name));

  // 5. 今回適用すべき新しいラベルを追加
  newLabels.forEach(label => finalLabels.push(label));

  // 6. `setLabels` を使ってラベルを一度に更新
  await octokit.rest.issues.addLabels({
    owner: REPO_OWNER,
    repo: REPO_NAME,
    issue_number: PARSED_PR_NUMBER,
    labels: [...new Set(finalLabels)],
  });

  console.log(`\n✅ ${finalLabels.length} 個のラベルを適用しました： ${finalLabels.join(', ')}`);
}

/**
 * メイン処理
 */
async function main() {
  try {
    console.log('🚀 PR分析・ラベル付与を開始します\n');
    console.log(`リポジトリ: ${REPO_OWNER}/${REPO_NAME}`);
    console.log(`PR番号: #${PR_NUMBER}\n`);

    // ステップ1: ラベルの確認と作成
    await ensureLabelsExist();

    // ステップ2: PR差分取得
    const diff = await getPullRequestDiff();

    // ステップ3: 分析実行
    console.log('\n📊 PR分析を実行中...');
    const analysis = analyzeSimplified(diff);

    console.log('\n分析結果:');
    console.log(`  - 複雑度: ${analysis.complexity.complexity_score}/100 (${analysis.complexity.complexity_level})`);
    console.log(`  - リスク: ${analysis.risk.risk_score}/100 (${analysis.risk.risk_level})`);
    console.log(`  - 変更行数: ${analysis.complexity.lines_changed}`);
    console.log(`  - 変更ファイル数: ${analysis.complexity.files_changed}`);

    // ステップ4: ラベル付与
    await applyLabels(analysis);

    // ステップ5: 結果をファイルに保存（コメント用）
    const resultPath = path.join(process.cwd(), '.github', 'analysis-result.json');
    fs.writeFileSync(resultPath, JSON.stringify(analysis, null, ANALYSIS_CONFIG.CONSTANTS.JSON_INDENT));
    console.log(`\n💾 分析結果を保存: ${resultPath}`);

    console.log('\n🎉 完了しました！');
  } catch (error) {
    console.error('\n❌ エラーが発生しました:', error.message);
    if (error.response) {
      console.error('レスポンス:', error.response.data);
    }
    process.exit(ANALYSIS_CONFIG.CONSTANTS.EXIT_CODE_ERROR);
  }
}

// 実行
main();
