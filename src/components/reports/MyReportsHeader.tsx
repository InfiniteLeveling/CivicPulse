import Link from "next/link";
import { PlusCircle, Info } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface MyReportsHeaderProps {
  isDemoData?: boolean;
}

export function MyReportsHeader({ isDemoData }: MyReportsHeaderProps) {
  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="space-y-1">
        <div className="flex flex-wrap items-center gap-2.5">
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            My Complaints
          </h1>
          {isDemoData && (
            <Badge
              variant="outline"
              className="border-primary/30 bg-primary/5 text-primary text-xs font-normal gap-1"
              title="Live backend REST routes are unprovisioned; showing fixture reports."
            >
              <Info className="size-3" aria-hidden="true" />
              <span>Demo Mode (Live Backend Pending)</span>
            </Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground max-w-2xl">
          Track, filter, and review the resolution status of all your submitted infrastructure reports.
        </p>
      </div>

      <div className="shrink-0">
        <Link
          href="/report"
          className={cn(
            buttonVariants({ variant: "default", size: "default" }),
            "gap-2 shadow-sm font-medium w-full sm:w-auto"
          )}
        >
          <PlusCircle className="size-4" aria-hidden="true" />
          <span>Report New Issue</span>
        </Link>
      </div>
    </header>
  );
}
