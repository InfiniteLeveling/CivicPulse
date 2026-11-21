import { Skeleton } from "@/components/ui/skeleton";

export default function AdminLoading() {
  return (
    <div
      className="space-y-6 animate-pulse"
      aria-busy="true"
      aria-label="Loading admin operations dashboard"
    >
      {/* Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-border/80">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <Skeleton className="h-7 w-48 rounded-md" />
            <Skeleton className="h-5 w-32 rounded-full" />
          </div>
          <Skeleton className="h-4 w-96 rounded-md" />
        </div>
        <div className="flex items-center gap-3">
          <Skeleton className="h-5 w-36 rounded-md" />
          <Skeleton className="h-8 w-20 rounded-md" />
        </div>
      </div>

      {/* Main Stats Grid Skeleton (4 cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Skeleton className="h-28 rounded-xl" />
        <Skeleton className="h-28 rounded-xl" />
        <Skeleton className="h-28 rounded-xl" />
        <Skeleton className="h-28 rounded-xl" />
      </div>

      {/* Operational Attention Skeleton (2 cards) */}
      <div className="space-y-2">
        <Skeleton className="h-4 w-40 rounded-md" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton className="h-44 rounded-xl" />
          <Skeleton className="h-44 rounded-xl" />
        </div>
      </div>

      {/* Status Distribution Skeleton */}
      <Skeleton className="h-48 rounded-xl" />

      {/* Recent Complaints Skeleton */}
      <Skeleton className="h-64 rounded-xl" />

      {/* Quick Actions Skeleton */}
      <Skeleton className="h-32 rounded-xl" />
    </div>
  );
}
