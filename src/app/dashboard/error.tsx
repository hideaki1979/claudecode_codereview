/**
 * Dashboard Error State
 *
 * Displayed when an error occurs while loading the dashboard
 */

'use client';

import { useEffect } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface DashboardErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function DashboardError({
  error,
  reset,
}: DashboardErrorProps): React.JSX.Element {
  useEffect(() => {
    // Log error to error reporting service
    console.error('Dashboard error:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold text-gray-900">コードレビューダッシュボード</h1>
          <p className="mt-1 text-sm text-gray-500">
            自動PR分析と品質メトリクス
          </p>
        </div>
      </header>

      {/* Error Content */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="rounded-lg border-2 border-red-200 bg-red-50 p-12 text-center">
          <AlertCircle className="mx-auto h-16 w-16 text-red-600" />
          <h2 className="mt-4 text-2xl font-bold text-gray-900">
            エラーが発生しました
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            {error.message || 'ダッシュボードの読み込み中に予期しないエラーが発生しました。'}
          </p>
          {error.digest && (
            <p className="mt-2 text-xs text-gray-500">エラーID: {error.digest}</p>
          )}
          <div className="mt-6">
            <button
              onClick={reset}
              className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
            >
              <RefreshCw className="h-4 w-4" />
              再試行
            </button>
          </div>
          <div className="mt-6 rounded-lg bg-white border border-red-200 p-4 text-left">
            <h3 className="text-sm font-semibold text-gray-900 mb-2">
              トラブルシューティング:
            </h3>
            <ul className="space-y-1 text-sm text-gray-600">
              <li>• インターネット接続を確認してください</li>
              <li>• GitHubトークンが有効であることを確認してください</li>
              <li>• リポジトリが存在し、アクセス可能であることを確認してください</li>
              <li>• ページを更新してみてください</li>
            </ul>
          </div>
        </div>
      </main>
    </div>
  );
}
