import { Maximize2, RefreshCw, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface CivicMapToolbarProps {
  visibleCount: number;
  totalCount: number;
  isDemoData?: boolean;
  isRefreshing: boolean;
  onRefresh: () => void;
  onFitAll: () => void;
}

export function CivicMapToolbar({
  visibleCount,
  totalCount,
  isDemoData = false,
  isRefreshing,
  onRefresh,
  onFitAll,
}: CivicMapToolbarProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2.5 pb-2">
      <div className="flex items-center flex-wrap gap-2">
        <Badge
          variant="secondary"
          className="font-medium text-xs px-2.5 py-1 bg-muted/80 text-foreground border border-border"
        >
          <span>
            {visibleCount} {visibleCount === 1 ? "public issue" : "public issues"} shown
          </span>
          {visibleCount !== totalCount && (
            <span className="text-muted-foreground ml-1">
              (of {totalCount})
            </span>
          )}
        </Badge>

        {isDemoData && (
          <Badge
            variant="outline"
            className="border-primary/30 text-primary text-xs gap-1 bg-primary/5"
          >
            <Sparkles className="size-3" aria-hidden="true" />
            <span>Demo Data</span>
          </Badge>
        )}
      </div>

      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onFitAll}
          disabled={visibleCount === 0}
          className="h-8 text-xs gap-1.5"
          title="Fit map view to all visible issue markers"
        >
          <Maximize2 className="size-3.5" aria-hidden="true" />
          <span className="hidden sm:inline">Fit All</span>
        </Button>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onRefresh}
          disabled={isRefreshing}
          className="h-8 text-xs gap-1.5"
          title="Refresh public civic reports"
        >
          <RefreshCw
            className={`size-3.5 ${isRefreshing ? "animate-spin" : ""}`}
            aria-hidden="true"
          />
          <span>{isRefreshing ? "Refreshing..." : "Refresh"}</span>
        </Button>
      </div>
    </div>
  );
}
