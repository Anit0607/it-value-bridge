function SkeletonBox({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-slate-100 ${className ?? ''}`} />;
}

export default function AppLoading() {
  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div className="space-y-1.5">
        <SkeletonBox className="h-6 w-72" />
        <SkeletonBox className="h-4 w-96" />
      </div>

      {/* Loading hint */}
      <p className="text-xs text-slate-400">Preparing portfolio intelligence…</p>

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="rounded-xl border border-slate-200 bg-white p-4 shadow-card">
            <SkeletonBox className="mb-3 h-8 w-8" />
            <SkeletonBox className="mb-1.5 h-7 w-16" />
            <SkeletonBox className="h-3 w-24" />
          </div>
        ))}
      </div>

      {/* Table skeleton */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-card">
        <div className="border-b border-slate-100 px-5 py-3">
          <SkeletonBox className="h-4 w-40" />
        </div>
        <div className="divide-y divide-slate-100">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-5 py-3">
              <SkeletonBox className="h-4 w-56" />
              <SkeletonBox className="h-4 w-16" />
              <SkeletonBox className="h-4 w-20" />
              <SkeletonBox className="ml-auto h-4 w-12" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
