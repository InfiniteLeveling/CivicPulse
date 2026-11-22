import { Skeleton } from "@/components/ui/skeleton";

export default function AdminAnalyticsLoading() {
  return (
    <div className="space-y-6 max-w-7xl mx-auto w-full pb-16 animate-pulse">
      {/* Header Skeleton */}
      <div className="space-y-3 pb-4 border-b border-border/80">
        <div className="flex items-center justify-between">
          <Skeleton className="h-7 w-48" />
          <div className="flex gap-2">
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-8 w-24" />
          </div>
        </div>
        <Skeleton className="h-4 w-96 max-w-full" />
        <Skeleton className="h-3 w-40" />
      </div>

      {/* Metrics Grid Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border bg-card p-4 space-y-2">
            <div className="flex justify-between">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="size-6 rounded-lg" />
            </div>
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-3 w-28" />
          </div>
        ))}
      </div>

      {/* Filters Skeleton */}
      <div className="rounded-xl border border-border bg-card p-3 h-14" />

      {/* Charts Grid Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-xl border border-border bg-card p-6 h-80 space-y-4">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-60 w-full rounded-xl" />
        </div>
        <div className="rounded-xl border border-border bg-card p-6 h-80 space-y-4">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-60 w-full rounded-xl" />
        </div>
      </div>
    </div>
  );
}
