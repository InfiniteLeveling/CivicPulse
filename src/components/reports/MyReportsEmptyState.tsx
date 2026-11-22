import Link from "next/link";
import { ClipboardList, SearchX, PlusCircle, RotateCcw } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface MyReportsEmptyStateProps {
  mode: "account-empty" | "no-results";
  onClearFilters?: () => void;
}

export function MyReportsEmptyState({
  mode,
  onClearFilters,
}: MyReportsEmptyStateProps) {
  if (mode === "account-empty") {
    return (
      <Card className="border-border shadow-xs">
        <CardContent className="flex flex-col items-center justify-center py-12 px-4 text-center space-y-4">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary border border-primary/20">
            <ClipboardList className="size-7" aria-hidden="true" />
          </div>

          <div className="space-y-1.5 max-w-md">
            <h3 className="text-lg font-semibold tracking-tight text-foreground">
              You Haven&apos;t Reported Any Issues Yet
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              When you report civic infrastructure problems like potholes, garbage, or broken streetlights, they will appear here so you can track resolution progress.
            </p>
          </div>

          <div className="pt-2">
            <Link
              href="/report"
              className={cn(
                buttonVariants({ variant: "default", size: "default" }),
                "gap-2 shadow-sm font-medium"
              )}
            >
              <PlusCircle className="size-4" aria-hidden="true" />
              <span>Report Your First Issue</span>
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border shadow-xs">
      <CardContent className="flex flex-col items-center justify-center py-10 px-4 text-center space-y-3">
        <div className="flex size-12 items-center justify-center rounded-xl bg-muted text-muted-foreground">
          <SearchX className="size-6" aria-hidden="true" />
        </div>

        <div className="space-y-1 max-w-md">
          <h3 className="text-base font-semibold tracking-tight text-foreground">
            No Complaints Match Your Filters
          </h3>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            Try adjusting your search query, status, or category filters to find what you&apos;re looking for.
          </p>
        </div>

        {onClearFilters && (
          <div className="pt-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClearFilters}
              className="gap-1.5 text-xs h-8"
            >
              <RotateCcw className="size-3.5" aria-hidden="true" />
              <span>Clear Filters</span>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
