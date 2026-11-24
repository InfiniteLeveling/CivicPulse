import Link from "next/link";
import { PlusCircle } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function MyReportsHeader() {
  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="space-y-1">
        <div className="flex flex-wrap items-center gap-2.5">
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            My Complaints
          </h1>
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
