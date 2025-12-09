/**
 * Dashboard Content Component (Client Component)
 *
 * Handles client-side filtering and display of PR data
 */

'use client';

import { useState, useMemo } from 'react';
import { PRCard } from '@/components/PRCard';
import { AnalysisChart } from '@/components/AnalysisChart';
import { PRFilter } from '@/components/PRFilter';
import type { PRWithAnalysis, FilterOptions } from '@/types/dashboard';
import { AlertCircle } from 'lucide-react';

interface DashboardContentProps {
  initialData: PRWithAnalysis[];
}

export function DashboardContent({ initialData }: DashboardContentProps): React.JSX.Element {
  const [filters, setFilters] = useState<FilterOptions>({});

  // Filter PRs based on active filters
  const filteredData = useMemo(() => {
    let filtered = initialData;

    // Filter by status
    if (filters.status) {
      filtered = filtered.filter((item) => {
        if (filters.status === 'merged') {
          return item.pr.merged_at !== null;
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
  }, [initialData, filters]);

  const handleFilterChange = (newFilters: FilterOptions): void => {
    setFilters(newFilters);
  };

  return (
    <div className="space-y-6">
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
            <EmptyState hasFilters={Object.keys(filters).length > 0} />
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
