import { Skeleton } from "@/components/ui/skeleton";

export default function AdminComplaintsLoading() {
  return (
    <div
      className="space-y-6 animate-pulse"
      aria-busy="true"
      aria-label="Loading complaints queue"
    >
      {/* Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-border/80">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <Skeleton className="h-7 w-56 rounded-md" />
            <Skeleton className="h-5 w-24 rounded-full" />
            <Skeleton className="h-5 w-20 rounded-full" />
          </div>
          <Skeleton className="h-4 w-96 rounded-md" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-6 w-20 rounded-full" />
          <Skeleton className="h-8 w-20 rounded-md" />
        </div>
      </div>

      {/* Toolbar Skeleton */}
      <div className="space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          <Skeleton className="h-9 flex-1 rounded-lg" />
          <Skeleton className="h-9 w-48 rounded-lg" />
        </div>
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-8 w-28 rounded-lg" />
          <Skeleton className="h-8 w-32 rounded-lg" />
          <Skeleton className="h-8 w-28 rounded-lg" />
          <Skeleton className="h-8 w-24 rounded-lg" />
        </div>
      </div>

      {/* Table Skeleton */}
      <div className="rounded-xl border border-border p-4 space-y-3">
        <div className="flex items-center justify-between border-b border-border/60 pb-3">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-16" />
        </div>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between py-2.5">
            <div className="space-y-1">
              <Skeleton className="h-3.5 w-20" />
              <Skeleton className="h-4 w-48" />
            </div>
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-5 w-20 rounded-full" />
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-7 w-16 rounded-md" />
          </div>
        ))}
      </div>
    </div>
  );
}
