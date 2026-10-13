function SkeletonBlock({ className = "" }) {
  return <span aria-hidden="true" className={`skeleton-shimmer block rounded-lg bg-navy/[0.08] ${className}`} />;
}

export function TableSkeleton({ rows = 5, columns = 4 }) {
  return (
    <div role="status" aria-label="Loading content" className="space-y-3 px-4 py-4">
      {Array.from({ length: rows }, (_, row) => (
        <div key={row} className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
          {Array.from({ length: columns }, (_, column) => (
            <SkeletonBlock key={column} className={`h-4 ${column === 0 ? "w-4/5" : "w-3/5"}`} />
          ))}
        </div>
      ))}
      <span className="sr-only">Loading</span>
    </div>
  );
}

export function CardGridSkeleton({ count = 6, image = false }) {
  return (
    <div role="status" aria-label="Loading content" className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="rounded-2xl border border-navy/8 bg-white p-4 shadow-soft space-y-3">
          {image && <SkeletonBlock className="h-36 w-full" />}
          <SkeletonBlock className="h-4 w-2/3" />
          <SkeletonBlock className="h-3 w-full" />
          <SkeletonBlock className="h-3 w-4/5" />
        </div>
      ))}
      <span className="sr-only">Loading</span>
    </div>
  );
}

export function ContentSkeleton({ rows = 4 }) {
  return (
    <div role="status" aria-label="Loading content" className="space-y-4 py-3">
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="rounded-2xl border border-navy/8 bg-white p-5 space-y-3">
          <SkeletonBlock className="h-4 w-1/3" />
          <SkeletonBlock className="h-3 w-full" />
          <SkeletonBlock className="h-3 w-4/5" />
        </div>
      ))}
      <span className="sr-only">Loading</span>
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div role="status" aria-label="Loading dashboard" className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {Array.from({ length: 5 }, (_, index) => <div key={index} className="rounded-2xl bg-white border border-navy/8 p-5 space-y-3"><SkeletonBlock className="h-3 w-1/2" /><SkeletonBlock className="h-8 w-1/3" /></div>)}
      </div>
      <div className="grid lg:grid-cols-3 gap-5"><div className="lg:col-span-2 rounded-2xl bg-white border border-navy/8 p-5 space-y-4"><SkeletonBlock className="h-5 w-1/3" /><div className="grid grid-cols-2 sm:grid-cols-3 gap-3">{Array.from({ length: 6 }, (_, index) => <SkeletonBlock key={index} className="h-20" />)}</div></div><div className="rounded-2xl bg-white border border-navy/8 p-5 space-y-4"><SkeletonBlock className="h-5 w-1/2" /><SkeletonBlock className="h-12 w-full" /><SkeletonBlock className="h-12 w-full" /></div></div>
      <span className="sr-only">Loading</span>
    </div>
  );
}
