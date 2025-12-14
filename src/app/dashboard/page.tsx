/**
 * Dashboard Page (Server Component)
 *
 * シンプルなServer Component - データ取得はClient Componentで実施
 */

import { DashboardContent } from './DashboardContent';

/**
 * Dashboard Page Component
 *
 * Client Component にデータ取得とレンダリングを委譲
 */
export default function DashboardPage(): React.JSX.Element {

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
        <DashboardContent owner="hideaki1979" repo="ud_Laravel12_catcafe" />
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
 * Metadata for the page
 */
export const metadata = {
  title: 'ダッシュボード - コードレビュー',
  description: 'プルリクエストの品質メトリクスを表示・分析',
};
