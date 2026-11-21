import { Skeleton } from "@/components/ui/skeleton";

export default function AdminLoading() {
  return (
    <div className="space-y-6 animate-pulse" aria-busy="true" aria-label="Loading admin workspace">
      {/* Page Header Skeleton */}
      <div className="space-y-2 pb-6 border-b border-border/80">
        <div className="flex items-center gap-3">
          <Skeleton className="h-7 w-48 rounded-md" />
          <Skeleton className="h-5 w-28 rounded-full" />
        </div>
        <Skeleton className="h-4 w-96 rounded-md" />
      </div>

      {/* Status Banner Skeleton */}
      <Skeleton className="h-20 w-full rounded-xl" />

      {/* Roadmap Grid Skeleton */}
      <div className="space-y-3 pt-2">
        <Skeleton className="h-5 w-48 rounded-md" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Skeleton className="h-36 rounded-xl" />
          <Skeleton className="h-36 rounded-xl" />
          <Skeleton className="h-36 rounded-xl" />
        </div>
      </div>
    </div>
  );
}
