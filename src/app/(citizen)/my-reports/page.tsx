import { Suspense } from "react";
import { MyReportsView } from "@/components/reports/MyReportsView";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata = {
  title: "My Complaints | CivicPulse",
  description: "Review, filter, and track all your submitted civic infrastructure reports and resolution progress.",
};

export default function MyReportsPage() {
  return (
    <div className="max-w-6xl mx-auto w-full px-2 sm:px-4 py-2 sm:py-4">
      <Suspense
        fallback={
          <div className="space-y-6" aria-busy="true" aria-label="Loading my complaints">
            <div className="space-y-2">
              <Skeleton className="h-9 w-56 rounded-lg" />
              <Skeleton className="h-4 w-96 max-w-full rounded" />
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <Skeleton className="h-24 rounded-xl" />
              <Skeleton className="h-24 rounded-xl" />
              <Skeleton className="h-24 rounded-xl" />
              <Skeleton className="h-24 rounded-xl" />
            </div>
            <Skeleton className="h-28 w-full rounded-xl" />
            <Skeleton className="h-64 w-full rounded-xl" />
          </div>
        }
      >
        <MyReportsView />
      </Suspense>
    </div>
  );
}
