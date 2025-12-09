/**
 * Dashboard Page (Server Component)
 *
 * Main dashboard for displaying PR analysis results
 */

import { Suspense } from 'react';
import { getPullRequestDiff, listPullRequests } from '@/lib/github';
import { analyzePullRequest } from '@/lib/analysis';
import { DashboardContent } from './DashboardContent';
import type { PRWithAnalysis } from '@/types/dashboard';
import type { GitHubPullRequest } from '@/types/github';

/**
 * Fetch and analyze PRs from GitHub
 */
async function fetchPRsWithAnalysis(): Promise<PRWithAnalysis[]> {
  try {
    // Fetch PRs from the repository
    // Replace with your actual repository details or make it dynamic
    const { data: prs } = await listPullRequests({
      owner: 'hideaki1979',
      repo: 'ud_Laravel12_catcafe',
      state: 'all',
      per_page: 20,
    });

    // Analyze each PR
    const analysisPromises = prs.map(async (pr) => {
      try {
        // Fetch PR diff
        const diff = await getPullRequestDiff({
          owner: 'hideaki1979',
          repo: 'ud_Laravel12_catcafe',
          pull_number: pr.number,
        });

        // Analyze the diff
        const result = analyzePullRequest(diff);

        // Return PR with analysis if successful
        if (result.status === 'success') {
          return {
            pr: pr as GitHubPullRequest,
            analysis: result.data,
          };
        }

        // Return null for failed analysis
        return null;
      } catch (error) {
        console.error(`Failed to analyze PR #${pr.number}:`, error);
        return null;
      }
    });

    // Wait for all analyses to complete
    const results = await Promise.all(analysisPromises);

    // Filter out null results
    return results.filter((result): result is PRWithAnalysis => result !== null);
  } catch (error) {
    console.error('Failed to fetch PRs:', error);
    return [];
  }
}

/**
 * Dashboard Page Component
 */
export default async function DashboardPage(): Promise<React.JSX.Element> {
  const data = await fetchPRsWithAnalysis();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                コードレビューダッシュボード
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                自動PR分析と品質メトリクス
              </p>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <div className="h-2 w-2 rounded-full bg-green-500" />
              <span>稼働中</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <Suspense fallback={<DashboardSkeleton />}>
          <DashboardContent initialData={data} />
        </Suspense>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white mt-12">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <p className="text-center text-sm text-gray-500">
            GitHub API と Next.js 16 で動作しています
          </p>
        </div>
      </footer>
    </div>
  );
}

/**
 * Loading Skeleton
 */
function DashboardSkeleton(): React.JSX.Element {
  return (
    <div className="space-y-6">
      {/* Chart Skeleton */}
      <div className="h-64 animate-pulse rounded-lg bg-gray-200" />

      {/* Grid Skeleton */}
      <div className="grid gap-6 lg:grid-cols-4">
        <div className="lg:col-span-1">
          <div className="h-96 animate-pulse rounded-lg bg-gray-200" />
        </div>
        <div className="lg:col-span-3 space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-48 animate-pulse rounded-lg bg-gray-200" />
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Metadata for the page
 */
export const metadata = {
  title: 'ダッシュボード - コードレビュー',
  description: 'プルリクエストの品質メトリクスを表示・分析',
};
