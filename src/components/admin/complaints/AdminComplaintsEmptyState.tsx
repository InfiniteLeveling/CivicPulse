import { ClipboardList, SearchX, AlertOctagon, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AdminComplaintsEmptyStateProps {
  type: "empty_all" | "empty_filtered" | "empty_urgent";
  onClearFilters?: () => void;
}

export function AdminComplaintsEmptyState({
  type,
  onClearFilters,
}: AdminComplaintsEmptyStateProps) {
  if (type === "empty_urgent") {
    return (
      <div className="rounded-xl border border-dashed border-border bg-card/60 p-8 text-center space-y-3">
        <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
          <AlertOctagon className="size-6" aria-hidden="true" />
        </div>
        <div className="space-y-1">
          <h3 className="text-sm font-semibold text-foreground">
            No Urgent Complaints Found
          </h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            There are currently no active unresolved complaints requiring emergency intervention.
          </p>
        </div>
        {onClearFilters && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClearFilters}
            className="text-xs gap-1.5"
          >
            <RotateCcw className="size-3" aria-hidden="true" />
            <span>Reset Urgent Filter</span>
          </Button>
        )}
      </div>
    );
  }

  if (type === "empty_filtered") {
    return (
      <div className="rounded-xl border border-dashed border-border bg-card/60 p-8 text-center space-y-3">
        <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <SearchX className="size-6" aria-hidden="true" />
        </div>
        <div className="space-y-1">
          <h3 className="text-sm font-semibold text-foreground">
            No Complaints Match These Filters
          </h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            Try adjusting your search query, or selecting different category and status filters.
          </p>
        </div>
        {onClearFilters && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClearFilters}
            className="text-xs gap-1.5"
          >
            <RotateCcw className="size-3" aria-hidden="true" />
            <span>Clear Filters</span>
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-dashed border-border bg-card/60 p-12 text-center space-y-3">
      <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
        <ClipboardList className="size-6" aria-hidden="true" />
      </div>
      <div className="space-y-1">
        <h3 className="text-sm font-semibold text-foreground">
          No Complaints Recorded Yet
        </h3>
        <p className="text-xs text-muted-foreground max-w-sm mx-auto">
          Submitted civic issues will appear here once reports are received by the municipal platform.
        </p>
      </div>
    </div>
  );
}
