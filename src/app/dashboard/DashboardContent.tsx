/**
 * Dashboard Content Component (Client Component)
 *
 * SWRを使用してPRデータと分析結果を取得し、
 * フィルタリングと表示を行う
 */

'use client';

import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { usePullRequestsSWR } from '@/hooks/usePullRequestsSWR';
import { useRunAnalysis } from '@/hooks/useAnalysis';
import { PRCard } from '@/components/PRCard';
import { AnalysisChart } from '@/components/AnalysisChart';
import { PRFilter } from '@/components/PRFilter';
import { TrendCharts } from '@/components/charts';
import type { PRWithAnalysis, FilterOptions } from '@/types/dashboard';
import type { GitHubPullRequestSimple } from '@/types/github';
import { AlertCircle, Loader2, RefreshCw } from 'lucide-react';

/**
 * DashboardContent Component Props
 */
interface DashboardContentProps {
  /**
   * GitHubリポジトリの所有者
   */
  owner: string;

  /**
   * GitHubリポジトリ名
   */
  repo: string;

  /**
   * ローディング状態の変化を通知するコールバック
   * PR一覧取得中または分析中の場合はtrueを渡す
   */
  onLoadingChange?: (isLoading: boolean) => void;
}

/**
 * DashboardContent Component
 *
 * PRデータの取得、分析、フィルタリング、表示を担当
 */
export function DashboardContent({
  owner,
  repo,
  onLoadingChange,
}: DashboardContentProps): React.JSX.Element | null {
  const [filters, setFilters] = useState<FilterOptions>({});
  const [analyzedData, setAnalyzedData] = useState<PRWithAnalysis[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // SWRでプルリクエスト一覧を取得
  const {
    data: prData,
    // pagination, // 将来のページネーション実装時に使用
    rateLimit,
    cacheHit,
    error: prError,
    isLoading,
    isValidating,
    hasData,
    hasError,
    refetch,
  } = usePullRequestsSWR({
    owner,
    repo,
    state: 'all',
    per_page: 20,
  });

  // SWRMutationで分析実行
  const { runAnalysis, isAnalyzing: isRunningAnalysis } = useRunAnalysis();

  // runAnalysisをrefで保持して安定した参照を維持（無限ループ防止）
  const runAnalysisRef = useRef(runAnalysis);
  useEffect(() => {
    runAnalysisRef.current = runAnalysis;
  }, [runAnalysis]);

  // ローディング状態の変化を親コンポーネントに通知
  // onLoadingChangeをrefで保持し、依存配列から除外してReactの警告を回避
  const onLoadingChangeRef = useRef(onLoadingChange);
  useEffect(() => {
    onLoadingChangeRef.current = onLoadingChange;
  }, [onLoadingChange]);

  useEffect(() => {
    const isCurrentlyLoading = isLoading || isAnalyzing;
    onLoadingChangeRef.current?.(isCurrentlyLoading);
  }, [isLoading, isAnalyzing]);

  // 単一PRを分析する関数（useCallbackでメモ化、refを使用して安定化）
  const analyzeSinglePR = useCallback(
    async (pr: GitHubPullRequestSimple): Promise<PRWithAnalysis | null> => {
      try {
        const apiResult = await runAnalysisRef.current({
          owner,
          repo,
          pull_number: pr.number,
        });

        if (apiResult.success && apiResult.data) {
          return {
            pr,
            analysis: {
              risk: apiResult.data.metrics.risk,
              complexity: apiResult.data.metrics.complexity,
              security: apiResult.data.metrics.security,
              impact: apiResult.data.metrics.impact,
              analyzed_at: apiResult.data.analyzed_at,
            },
          } as PRWithAnalysis;
        }
        return null;
      } catch (error) {
        console.error(`PR #${pr.number} の分析に失敗:`, error);
        return null;
      }
    },
    [owner, repo] // runAnalysisをrefで参照するため依存配列から除外
  );

  // 分析済みのPRデータを追跡（重複分析防止）
  const lastAnalyzedPrDataRef = useRef<GitHubPullRequestSimple[] | null>(null);

  // プルリクエストを取得したら分析を実行
  useEffect(() => {
    // データが取得できていない場合はスキップ
    if (!hasData || !prData || prData.length === 0) {
      setAnalyzedData((prev) => (prev.length > 0 ? [] : prev));
      lastAnalyzedPrDataRef.current = null;
      return;
    }

    // 同じデータに対して既に分析済みの場合はスキップ
    if (lastAnalyzedPrDataRef.current === prData) {
      return;
    }

    let isCancelled = false;

    // 分析処理
    const analyzeAllPRs = async (): Promise<void> => {
      setIsAnalyzing(true);
      lastAnalyzedPrDataRef.current = prData;

      try {
        const results = await Promise.all(
          prData.map((pr) => analyzeSinglePR(pr))
        );

        if (isCancelled) {
          return;
        }

        // null を除外して結果を設定
        const validResults = results.filter(
          (result): result is PRWithAnalysis => result !== null
        );
        setAnalyzedData(validResults);
      } catch (error) {
        console.error('PR分析中にErrorが発生：', error);
        lastAnalyzedPrDataRef.current = null; // エラー時はリセット
      } finally {
        if (!isCancelled) {
          setIsAnalyzing(false);
        }
      }
    };

    void analyzeAllPRs();

    // クリーンアップ関数: レポジトリが変更された際に実行
    return () => {
      isCancelled = true;
      setIsAnalyzing(false);
    };
  }, [hasData, prData, analyzeSinglePR]);

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
  if (hasError && prError) {
    return (
      <div className="rounded-lg border-2 border-red-200 bg-red-50 p-8 text-center">
        <AlertCircle className="mx-auto h-12 w-12 text-red-500" />
        <h3 className="mt-4 text-lg font-semibold text-red-900">
          データの取得に失敗しました
        </h3>
        <p className="mt-2 text-sm text-red-700">{prError.message}</p>
        {prError.details && (
          <details className="mt-4 text-left">
            <summary className="cursor-pointer text-sm text-red-600">
              詳細情報を表示
            </summary>
            <pre className="mt-2 overflow-auto rounded bg-red-100 p-2 text-xs text-red-800">
              {prError.details}
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
  if (isAnalyzing || isRunningAnalysis) {
    const prCount = prData?.length ?? 0;

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

  return (
    <div className="space-y-6">
      {/* ステータス情報 */}
      {hasData && rateLimit && (
        <div className="rounded-lg bg-blue-50 p-4">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-4">
              {cacheHit && (
                <span className="inline-flex items-center gap-1 text-green-600">
                  <span className="h-2 w-2 rounded-full bg-green-500" />
                  キャッシュから取得
                </span>
              )}
              {isValidating && (
                <span className="inline-flex items-center gap-1 text-blue-600">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  バックグラウンド更新中
                </span>
              )}
              <span className="text-gray-600">
                レート制限: {rateLimit.remaining}/{rateLimit.limit}
              </span>
            </div>
            <button
              onClick={handleRefetch}
              disabled={isValidating}
              className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${isValidating ? 'animate-spin' : ''}`} />
              更新
            </button>
          </div>
        </div>
      )}

      {/* Analysis Chart */}
      <AnalysisChart data={filteredData} />

      {/* Trend Charts */}
      <TrendCharts owner={owner} repo={repo} />

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
