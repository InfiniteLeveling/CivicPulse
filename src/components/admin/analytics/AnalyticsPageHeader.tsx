import { RefreshCw, BarChart3, Table, Database } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatReportDateTime } from "@/lib/reports/formatting";

interface AnalyticsPageHeaderProps {
  lastRefreshedAt: string;
  isRefreshing: boolean;
  onRefresh: () => void;
  viewMode: "charts" | "tables";
  onViewModeChange: (mode: "charts" | "tables") => void;
  isDemoData?: boolean;
}

export function AnalyticsPageHeader({
  lastRefreshedAt,
  isRefreshing,
  onRefresh,
  viewMode,
  onViewModeChange,
  isDemoData = false,
}: AnalyticsPageHeaderProps) {
  return (
    <div className="space-y-3 pb-4 border-b border-border/80">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">
              City Analytics
            </h1>
            {isDemoData && (
              <Badge variant="outline" className="text-[11px] bg-amber-50 text-amber-700 border-amber-200">
                <Database className="size-3 mr-1" aria-hidden="true" />
                <span>Demo Fixture Aggregates</span>
              </Badge>
            )}
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Explore complaint trends, issue distribution, and resolution performance across municipal infrastructure operations.
          </p>
        </div>

        {/* View Mode Switch & Refresh */}
        <div className="flex items-center gap-2 self-start sm:self-auto shrink-0 flex-wrap">
          <div className="flex items-center rounded-lg border border-border bg-muted/30 p-0.5 text-xs">
            <Button
              type="button"
              variant={viewMode === "charts" ? "default" : "ghost"}
              size="sm"
              onClick={() => onViewModeChange("charts")}
              className="h-7 px-2.5 text-xs gap-1"
            >
              <BarChart3 className="size-3.5" aria-hidden="true" />
              <span>Charts</span>
            </Button>
            <Button
              type="button"
              variant={viewMode === "tables" ? "default" : "ghost"}
              size="sm"
              onClick={() => onViewModeChange("tables")}
              className="h-7 px-2.5 text-xs gap-1"
            >
              <Table className="size-3.5" aria-hidden="true" />
              <span>Data Tables</span>
            </Button>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={isRefreshing}
            aria-label="Refresh analytics dashboard"
            className="h-8 px-2.5 text-xs gap-1.5"
          >
            <RefreshCw
              className={`size-3.5 ${isRefreshing ? "animate-spin text-primary" : "text-muted-foreground"}`}
              aria-hidden="true"
            />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
        </div>
      </div>

      <div className="text-[11px] text-muted-foreground">
        <span>Last refreshed: </span>
        <span className="font-medium text-foreground">{formatReportDateTime(lastRefreshedAt)}</span>
      </div>
    </div>
  );
}
