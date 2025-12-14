/**
 * Dashboard Page Wrapper (Client Component)
 *
 * レポジトリ選択の状態管理を行うラッパーコンポーネント
 */

'use client';

import { useState, useCallback } from 'react';
import { RepositorySelector } from '@/components/RepositorySelector';
import { DashboardContent } from './DashboardContent';

interface RepositoryInfo {
  owner: string;
  repo: string;
}

export function DashboardPageWrapper(): React.JSX.Element {
  const [repository, setRepository] = useState<RepositoryInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleRepositorySubmit = (owner: string, repo: string): void => {
    setRepository({ owner, repo });
  };

  const handleLoadingChange = useCallback((loading: boolean): void => {
    setIsLoading(loading);
  }, []);

  return (
    <div className="space-y-6">
      {/* レポジトリ選択 */}
      <RepositorySelector
        onSubmit={handleRepositorySubmit}
        defaultValues={repository || undefined}
        isLoading={isLoading}
      />

      {/* ダッシュボードコンテンツ */}
      {repository ? (
        <DashboardContent
          owner={repository.owner}
          repo={repository.repo}
          onLoadingChange={handleLoadingChange}
        />
      ) : (
        <div className="rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 p-12 text-center">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <h3 className="mt-4 text-lg font-semibold text-gray-900">
            リポジトリを選択してください
          </h3>
          <p className="mt-2 text-sm text-gray-600">
            上記のフォームからオーナー名とリポジトリ名を入力して、
            <br />
            プルリクエストの分析を開始できます。
          </p>
        </div>
      )}
    </div>
  );
}
