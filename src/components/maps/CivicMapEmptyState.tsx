import { MapPinOff, FilterX, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CivicMapEmptyStateProps {
  type: "no_data" | "no_matches";
  onResetFilters?: () => void;
}

export function CivicMapEmptyState({
  type,
  onResetFilters,
}: CivicMapEmptyStateProps) {
  if (type === "no_data") {
    return (
      <div
        role="status"
        aria-label="No public issues available"
        className="flex flex-col items-center justify-center p-8 text-center bg-card rounded-xl border border-dashed border-border space-y-3"
      >
        <div className="flex size-12 items-center justify-center rounded-xl bg-muted text-muted-foreground">
          <MapPinOff className="size-6" aria-hidden="true" />
        </div>
        <div className="space-y-1">
          <h3 className="font-semibold text-sm text-foreground">
            No Public Issues to Display
          </h3>
          <p className="text-xs text-muted-foreground max-w-xs leading-relaxed">
            There are no public civic reports available in the current dataset.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      role="status"
      aria-label="No issues match current filters"
      className="flex flex-col items-center justify-center p-8 text-center bg-card rounded-xl border border-dashed border-border space-y-3"
    >
      <div className="flex size-12 items-center justify-center rounded-xl bg-muted text-muted-foreground">
        <FilterX className="size-6" aria-hidden="true" />
      </div>
      <div className="space-y-1">
        <h3 className="font-semibold text-sm text-foreground">
          No Issues Match These Filters
        </h3>
        <p className="text-xs text-muted-foreground max-w-xs leading-relaxed">
          Try selecting another category or status, or clear your search term.
        </p>
      </div>

      {onResetFilters && (
        <div className="pt-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onResetFilters}
            className="text-xs gap-1.5"
          >
            <RotateCcw className="size-3.5" aria-hidden="true" />
            <span>Clear Filters</span>
          </Button>
        </div>
      )}
    </div>
  );
}
