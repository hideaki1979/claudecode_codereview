/**
 * Pull Request Analysis Engine - Usage Examples
 *
 * このファイルは、分析エンジンの使用方法を示すサンプルコードです。
 * 実際のプロジェクトでは、これらのパターンをAPI RouteやServer Componentで使用します。
 */

import { analyzePullRequest } from './index';
import { getPullRequestDiff } from '@/lib/github';
import type { GetPullRequestParams } from '@/types/github';

/**
 * Example 1: 基本的な分析の実行
 *
 * Pull Requestを取得して分析結果を表示する最もシンプルな例です。
 */
export async function basicAnalysisExample(): Promise<void> {
  const params: GetPullRequestParams = {
    owner: 'facebook',
    repo: 'react',
    pull_number: 12345,
  };

  try {
    // ステップ1: 差分を取得
    const { data: diff } = await getPullRequestDiff(params);

    // ステップ2: 分析を実行
    const result = analyzePullRequest(diff);

    // ステップ3: 結果の処理（型安全なパターンマッチング）
    if (result.status === 'success') {
      console.log('=== Analysis Results ===');
      console.log(`Risk Level: ${result.data.risk.risk_level}`);
      console.log(`Risk Score: ${result.data.risk.risk_score}/100`);
      console.log(`Complexity: ${result.data.complexity.complexity_level}`);
      console.log(`Impact: ${result.data.impact.impact_level}`);
      console.log(`\nRecommendations:`);
      result.data.risk.recommendations.forEach((rec) => {
        console.log(`  - ${rec}`);
      });
    } else {
      console.error(`Analysis failed: ${result.error}`);
      if (result.code) {
        console.error(`Error code: ${result.code}`);
      }
    }
  } catch (error) {
    console.error('Failed to fetch PR data:', error);
  }
}

/**
 * Example 2: 詳細な分析結果の表示
 *
 * すべてのメトリクスを詳しく表示する例です。
 */
export async function detailedAnalysisExample(
  params: GetPullRequestParams
): Promise<void> {
  try {
    const { data: diff } = await getPullRequestDiff(params);

    const result = analyzePullRequest(diff);

    if (result.status === 'success') {
      const { complexity, impact, risk } = result.data;

      console.log('=== Complexity Metrics ===');
      console.log(`Lines changed: ${complexity.lines_changed}`);
      console.log(`Files changed: ${complexity.files_changed}`);
      console.log(`Avg changes per file: ${complexity.avg_changes_per_file}`);
      console.log(`Complexity score: ${complexity.complexity_score}/100`);
      console.log(`Complexity level: ${complexity.complexity_level}`);

      console.log('\n=== Impact Metrics ===');
      console.log(`Impact level: ${impact.impact_level}`);
      console.log(`File types changed:`);
      Object.entries(impact.file_types).forEach(([ext, count]) => {
        console.log(`  ${ext}: ${count} files`);
      });
      if (impact.critical_files.length > 0) {
        console.log(`\nCritical files changed:`);
        impact.critical_files.forEach((file) => {
          console.log(`  - ${file}`);
        });
      }
      console.log(`\nAffected directories: ${impact.affected_directories.length}`);

      console.log('\n=== Risk Assessment ===');
      console.log(`Risk level: ${risk.risk_level}`);
      console.log(`Risk score: ${risk.risk_score}/100`);
      console.log(`Risk factors:`);
      console.log(`  Large diff: ${risk.factors.large_diff}`);
      console.log(`  Many files: ${risk.factors.many_files}`);
      console.log(`  Critical changes: ${risk.factors.critical_changes}`);
      console.log(`  Config changes: ${risk.factors.config_changes}`);
      if (risk.recommendations.length > 0) {
        console.log(`\nRecommendations:`);
        risk.recommendations.forEach((rec) => {
          console.log(`  - ${rec}`);
        });
      }

      console.log(`\nAnalyzed at: ${result.data.analyzed_at}`);
    } else {
      console.error(`Analysis failed: ${result.error}`);
      if (result.code) {
        console.error(`Error code: ${result.code}`);
      }
    }
  } catch (error) {
    console.error('Failed to fetch PR data:', error);
  }
}

/**
 * Example 3: API Route内での使用
 *
 * Next.js App RouterのAPI Routeで使用する例です。
 * ファイルパス: app/api/analyze/[owner]/[repo]/[pull_number]/route.ts
 */
export async function apiRouteExample(
  owner: string,
  repo: string,
  pull_number: number
): Promise<Response> {
  try {
    // 差分を取得
    const { data: diff } = await getPullRequestDiff({ owner, repo, pull_number });

    // 分析を実行
    const result = analyzePullRequest(diff);

    // 結果に応じてレスポンスを返す
    if (result.status === 'success') {
      return new Response(JSON.stringify(result.data), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    } else {
      return new Response(
        JSON.stringify({
          error: result.error,
          code: result.code,
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Internal server error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

/**
 * Example 4: リスクレベルに応じた処理
 *
 * リスクレベルに基づいて異なるアクションを実行する例です。
 */
export async function riskBasedActionsExample(
  params: GetPullRequestParams
): Promise<void> {
  try {
    const { data: diff } = await getPullRequestDiff(params);

    const result = analyzePullRequest(diff);

    if (result.status === 'success') {
      const { risk_level, risk_score, recommendations } = result.data.risk;

      // リスクレベルに応じた処理
      switch (risk_level) {
        case 'low':
          console.log('✅ Low risk PR - standard review process');
          break;

        case 'medium':
          console.log('⚠️ Medium risk PR - careful review recommended');
          console.log(`Risk score: ${risk_score}/100`);
          break;

        case 'high':
          console.log('🚨 High risk PR - multiple reviewers recommended');
          console.log(`Risk score: ${risk_score}/100`);
          console.log('Action items:');
          recommendations.forEach((rec) => console.log(`  - ${rec}`));
          // 例: 自動的にシニアレビュアーをアサインする
          // await assignSeniorReviewer(params);
          break;

        case 'critical':
          console.log('🔴 CRITICAL RISK PR - special attention required');
          console.log(`Risk score: ${risk_score}/100`);
          console.log('Mandatory actions:');
          recommendations.forEach((rec) => console.log(`  - ${rec}`));
          // 例: リードエンジニアに通知を送る
          // await notifyLeadEngineer(params, result.data);
          break;
      }
    } else {
      console.error(`Analysis failed: ${result.error}`);
      if (result.code) {
        console.error(`Error code: ${result.code}`);
      }
    }
  } catch (error) {
    console.error('Failed to fetch PR data:', error);
  }
}

/**
 * Example 5: バッチ分析
 *
 * 複数のPRを一括で分析する例です。
 */
export async function batchAnalysisExample(
  owner: string,
  repo: string,
  pullNumbers: number[]
): Promise<void> {
  console.log(`Analyzing ${pullNumbers.length} pull requests...`);

  for (const pull_number of pullNumbers) {
    try {
      const { data: diff } = await getPullRequestDiff({ owner, repo, pull_number });

      const result = analyzePullRequest(diff);

      if (result.status === 'success') {
        const { risk_level, risk_score } = result.data.risk;
        console.log(
          `PR #${pull_number}: ${risk_level.toUpperCase()} risk (${risk_score}/100)`
        );
      } else {
        console.error(`PR #${pull_number}: Analysis failed - ${result.error}`);
      }
    } catch (error) {
      console.error(`PR #${pull_number}: Failed to fetch data`, error);
    }
  }
}
