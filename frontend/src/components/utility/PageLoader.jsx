import { DashboardSkeleton } from "../ui/Skeleton";

export default function PageLoader() {
  return (
    <div className="container-page py-8 min-h-[60svh]">
      <div role="status" aria-label="Loading page" className="mb-6 space-y-3">
        <span aria-hidden="true" className="block h-7 w-1/3 animate-pulse rounded-lg bg-navy/[0.08]" />
        <span aria-hidden="true" className="block h-4 w-1/2 animate-pulse rounded-lg bg-navy/[0.08]" />
        <span className="sr-only">Loading</span>
      </div>
      <DashboardSkeleton />
    </div>
  );
}
