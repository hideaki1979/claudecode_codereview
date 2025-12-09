/**
 * Dashboard Loading State
 *
 * Displayed while the dashboard page is loading
 */

export default function DashboardLoading(): React.JSX.Element {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Skeleton */}
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <div className="h-8 w-64 animate-pulse rounded bg-gray-200" />
              <div className="mt-2 h-4 w-48 animate-pulse rounded bg-gray-200" />
            </div>
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 animate-pulse rounded-full bg-gray-200" />
              <div className="h-4 w-16 animate-pulse rounded bg-gray-200" />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Skeleton */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="space-y-6">
          {/* Chart Skeleton */}
          <div className="rounded-lg border border-gray-200 bg-white p-6">
            <div className="mb-6 h-6 w-48 animate-pulse rounded bg-gray-200" />
            <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="h-24 animate-pulse rounded-lg bg-gray-200" />
              ))}
            </div>
            <div className="space-y-4">
              <div className="h-8 animate-pulse rounded-lg bg-gray-200" />
              <div className="h-8 animate-pulse rounded-lg bg-gray-200" />
            </div>
          </div>

          {/* Grid Layout Skeleton */}
          <div className="grid gap-6 lg:grid-cols-4">
            {/* Filter Skeleton */}
            <div className="lg:col-span-1">
              <div className="rounded-lg border border-gray-200 bg-white p-6">
                <div className="mb-4 h-6 w-24 animate-pulse rounded bg-gray-200" />
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i}>
                      <div className="mb-2 h-4 w-20 animate-pulse rounded bg-gray-200" />
                      <div className="h-10 animate-pulse rounded-lg bg-gray-200" />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* PR Cards Skeleton */}
            <div className="lg:col-span-3 space-y-4">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="rounded-lg border border-gray-200 bg-white p-6"
                >
                  <div className="mb-4 flex items-start justify-between">
                    <div className="flex-1 space-y-2">
                      <div className="h-5 w-32 animate-pulse rounded bg-gray-200" />
                      <div className="h-6 w-full animate-pulse rounded bg-gray-200" />
                    </div>
                    <div className="ml-4 h-10 w-32 animate-pulse rounded-full bg-gray-200" />
                  </div>
                  <div className="mb-4 flex gap-4">
                    <div className="h-4 w-24 animate-pulse rounded bg-gray-200" />
                    <div className="h-4 w-32 animate-pulse rounded bg-gray-200" />
                  </div>
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                    {[1, 2, 3, 4].map((j) => (
                      <div key={j} className="h-16 animate-pulse rounded-md bg-gray-200" />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
