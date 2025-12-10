/**
 * Dashboard Content Component (Client Component)
 *
 * GitHub API Route Handler を使用してPRデータを取得し、
 * フィルタリングと表示を行う
 */

'use client';

import { useState, useMemo, useEffect } from 'react';
import { usePullRequests } from '@/hooks/usePullRequests';
import { getPullRequestDiffAPI } from '@/lib/api-client';
import { analyzePullRequest } from '@/lib/analysis';
import { PRCard } from '@/components/PRCard';
import { AnalysisChart } from '@/components/AnalysisChart';
import { PRFilter } from '@/components/PRFilter';
import type { PRWithAnalysis, FilterOptions } from '@/types/dashboard';
import type { GitHubPullRequestSimple } from '@/types/github';
import { AlertCircle, Loader2, RefreshCw } from 'lucide-react';

/**
 * DashboardContent Component
 *
 * PRデータの取得、分析、フィルタリング、表示を担当
 */
export function DashboardContent(): React.JSX.Element | null {
  const [filters, setFilters] = useState<FilterOptions>({});
  const [analyzedData, setAnalyzedData] = useState<PRWithAnalysis[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // GitHub API からプルリクエスト一覧を取得
  const prState = usePullRequests({
    owner: 'hideaki1979',
    repo: 'ud_Laravel12_catcafe',
    state: 'all',
    per_page: 20,
  });

  const { isLoading, hasError, hasData, refetch } = prState;

  // プルリクエストを取得したら分析を実行
  useEffect(() => {
    // データが取得できていない場合はスキップ
    if (!hasData) {
      setAnalyzedData([]);
      return;
    }

    // 型ガード: hasDataがtrueの場合、statusは'success'でdataが存在する
    if (prState.status !== 'success') {
      return; // 型安全性のため
    }

    const pullRequests = prState.data;

    if (pullRequests.length === 0) {
      setAnalyzedData([]);
      return;
    }

    // 分析処理
    const analyzeAllPRs = async (): Promise<void> => {
      setIsAnalyzing(true);

      try {
        const results = await Promise.all(
          pullRequests.map(async (pr: GitHubPullRequestSimple) => {
            try {
              // PR の差分を取得（APIルート経由）
              const diffResponse = await getPullRequestDiffAPI({
                owner: 'hideaki1979',
                repo: 'ud_Laravel12_catcafe',
                pull_number: pr.number,
              });

              // エラーレスポンスの場合はスキップ
              if (!diffResponse.success) {
                console.error(`PR #${pr.number} の差分取得に失敗:`, diffResponse.error);
                return null;
              }

              const diff = diffResponse.data;

              // 差分を分析
              const result = analyzePullRequest(diff);

              // 分析成功時のみ結果を返す
              if (result.status === 'success') {
                return {
                  pr,
                  analysis: result.data,
                } as PRWithAnalysis;
              }

              return null;
            } catch (error) {
              console.error(`PR #${pr.number} の分析に失敗:`, error);
              return null;
            }
          })
        );

        // null を除外して結果を設定
        const validResults = results.filter(
          (result): result is PRWithAnalysis => result !== null
        );
        setAnalyzedData(validResults);
      } catch (error) {
        console.error('PR分析中にエラーが発生:', error);
      } finally {
        setIsAnalyzing(false);
      }
    };

    void analyzeAllPRs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasData]);

  // PR データをフィルタリング
  const filteredData = useMemo(() => {
    let filtered = analyzedData;

    // Filter by status
    if (filters.status) {
      filtered = filtered.filter((item) => {
        if (filters.status === 'merged') {
          return item.pr.merged_at !== null;
        }
        if (filters.status === 'closed') {
          return item.pr.state === 'closed' && item.pr.merged_at === null;
        }
        return item.pr.state === filters.status;
      });
    }

    // Filter by risk level
    if (filters.riskLevel) {
      filtered = filtered.filter(
        (item) => item.analysis.risk.risk_level === filters.riskLevel
      );
    }

    // Filter by search query
    if (filters.search && filters.search.trim() !== '') {
      const searchLower = filters.search.toLowerCase().trim();
      filtered = filtered.filter((item) => {
        const titleMatch = item.pr.title.toLowerCase().includes(searchLower);
        const numberMatch = item.pr.number.toString().includes(searchLower);
        const authorMatch = item.pr.user.login.toLowerCase().includes(searchLower);
        return titleMatch || numberMatch || authorMatch;
      });
    }

    return filtered;
  }, [analyzedData, filters]);

  const handleFilterChange = (newFilters: FilterOptions): void => {
    setFilters(newFilters);
  };

  // 再取得ハンドラー
  const handleRefetch = (): void => {
    void refetch();
  };

  // ローディング状態
  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto h-12 w-12 animate-spin text-blue-500" />
          <p className="mt-4 text-sm text-gray-600">プルリクエストを読み込み中...</p>
        </div>
      </div>
    );
  }

  // エラー状態
  if (hasError) {
    // 型ガード: hasErrorがtrueの場合、statusは'error'でerrorが存在する
    if (prState.status !== 'error') {
      return null; // 型安全性のため
    }

    const errorInfo = prState.error;

    return (
      <div className="rounded-lg border-2 border-red-200 bg-red-50 p-8 text-center">
        <AlertCircle className="mx-auto h-12 w-12 text-red-500" />
        <h3 className="mt-4 text-lg font-semibold text-red-900">
          データの取得に失敗しました
        </h3>
        <p className="mt-2 text-sm text-red-700">{errorInfo.message}</p>
        {errorInfo.details && (
          <details className="mt-4 text-left">
            <summary className="cursor-pointer text-sm text-red-600">
              詳細情報を表示
            </summary>
            <pre className="mt-2 overflow-auto rounded bg-red-100 p-2 text-xs text-red-800">
              {errorInfo.details}
            </pre>
          </details>
        )}
        <button
          onClick={handleRefetch}
          className="mt-6 inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
        >
          <RefreshCw className="h-4 w-4" />
          再試行
        </button>
      </div>
    );
  }

  // 分析中状態
  if (isAnalyzing) {
    // PRカウントを型安全に取得
    let prCount = 0;
    if (prState.status === 'success') {
      prCount = prState.data.length;
    }

    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto h-12 w-12 animate-spin text-blue-500" />
          <p className="mt-4 text-sm text-gray-600">
            プルリクエストを分析中...
          </p>
          <p className="mt-2 text-xs text-gray-500">
            {prCount} 件のPRを処理しています
          </p>
        </div>
      </div>
    );
  }

  // レート制限情報の取得（型安全）
  let rateLimitInfo = null;
  let cacheHitInfo = false;

  if (prState.status === 'success') {
    rateLimitInfo = prState.rateLimit;
    cacheHitInfo = prState.cacheHit;
  }

  return (
    <div className="space-y-6">
      {/* ステータス情報 */}
      {hasData && rateLimitInfo && (
        <div className="rounded-lg bg-blue-50 p-4">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-4">
              {cacheHitInfo && (
                <span className="inline-flex items-center gap-1 text-green-600">
                  <span className="h-2 w-2 rounded-full bg-green-500" />
                  キャッシュから取得
                </span>
              )}
              <span className="text-gray-600">
                レート制限: {rateLimitInfo.remaining}/{rateLimitInfo.limit}
              </span>
            </div>
            <button
              onClick={handleRefetch}
              className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700"
            >
              <RefreshCw className="h-4 w-4" />
              更新
            </button>
          </div>
        </div>
      )}

      {/* Analysis Chart */}
      <AnalysisChart data={filteredData} />

      {/* Grid Layout: Filter + PR List */}
      <div className="grid gap-6 lg:grid-cols-4">
        {/* Sidebar: Filter */}
        <div className="lg:col-span-1">
          <PRFilter onFilterChange={handleFilterChange} defaultValues={filters} />
        </div>

        {/* Main Content: PR List */}
        <div className="lg:col-span-3">
          {/* Results Header */}
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">
              プルリクエスト
              <span className="ml-2 text-sm font-normal text-gray-500">
                ({filteredData.length}件)
              </span>
            </h2>
          </div>

          {/* PR Cards */}
          {filteredData.length > 0 ? (
            <div className="space-y-4">
              {filteredData.map((item) => (
                <PRCard key={item.pr.id} data={item} />
              ))}
            </div>
          ) : (
            <EmptyState hasFilters={Boolean(
              filters.status || filters.riskLevel || (filters.search && filters.search.trim() !== '')
            )} />
          )}
        </div>
      </div>
    </div>
  );
}

interface EmptyStateProps {
  hasFilters: boolean;
}

function EmptyState({ hasFilters }: EmptyStateProps): React.JSX.Element {
  return (
    <div className="rounded-lg border-2 border-dashed border-gray-300 bg-white p-12 text-center">
      <AlertCircle className="mx-auto h-12 w-12 text-gray-400" />
      <h3 className="mt-4 text-lg font-semibold text-gray-900">
        {hasFilters ? '一致するプルリクエストがありません' : 'プルリクエストが見つかりません'}
      </h3>
      <p className="mt-2 text-sm text-gray-500">
        {hasFilters
          ? 'フィルターを調整して、より多くの結果を表示してください。'
          : '表示するプルリクエストがありません。'}
      </p>
    </div>
  );
}
