import { Skeleton } from "@/components/ui/skeleton";

export default function ReportDetailsLoading() {
  return (
    <div
      className="space-y-6 max-w-6xl mx-auto w-full py-4 animate-in fade-in-50"
      aria-busy="true"
      aria-label="Loading complaint details"
    >
      {/* Header Skeleton */}
      <div className="space-y-3">
        <Skeleton className="h-6 w-36 rounded" />
        <div className="flex gap-2">
          <Skeleton className="h-5 w-20 rounded" />
          <Skeleton className="h-5 w-24 rounded" />
          <Skeleton className="h-5 w-28 rounded" />
        </div>
        <Skeleton className="h-9 w-3/4 max-w-xl rounded-lg" />
        <Skeleton className="h-4 w-48 rounded" />
      </div>

      {/* Grid Layout Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Main Column */}
        <div className="lg:col-span-8 space-y-6">
          <Skeleton className="h-64 sm:h-80 w-full rounded-xl" />
          <Skeleton className="h-44 w-full rounded-xl" />
          <Skeleton className="h-56 w-full rounded-xl" />
          <Skeleton className="h-48 w-full rounded-xl" />
        </div>

        {/* Sidebar Column */}
        <div className="lg:col-span-4 space-y-5">
          <Skeleton className="h-48 w-full rounded-xl" />
          <Skeleton className="h-32 w-full rounded-xl" />
        </div>
      </div>
    </div>
  );
}
