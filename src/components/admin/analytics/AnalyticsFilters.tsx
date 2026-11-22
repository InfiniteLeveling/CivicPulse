import { Filter, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CATEGORY_LABELS } from "@/lib/constants";

interface AnalyticsFiltersProps {
  timeRange: "all" | "30d" | "7d";
  onTimeRangeChange: (range: "all" | "30d" | "7d") => void;
  category: string;
  onCategoryChange: (cat: string) => void;
  status: string;
  onStatusChange: (status: string) => void;
  onClear: () => void;
}

export function AnalyticsFilters({
  timeRange,
  onTimeRangeChange,
  category,
  onCategoryChange,
  status,
  onStatusChange,
  onClear,
}: AnalyticsFiltersProps) {
  const isFiltered = timeRange !== "all" || category !== "all" || status !== "all";

  return (
    <div className="rounded-xl border border-border bg-card p-3 shadow-2xs space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Filter className="size-4 text-primary shrink-0" aria-hidden="true" />
          <span className="text-xs font-semibold text-foreground">Analytical Filters</span>
          <span className="text-[11px] text-muted-foreground hidden sm:inline">
            (Applies to breakdowns & workload metrics)
          </span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Time Range */}
          <select
            value={timeRange}
            onChange={(e) => onTimeRangeChange(e.target.value as "all" | "30d" | "7d")}
            aria-label="Filter by time range"
            className="text-xs rounded-lg border border-border bg-background px-2.5 py-1.5 text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/40"
          >
            <option value="all">Time Period: All Time</option>
            <option value="30d">Time Period: Last 30 Days</option>
            <option value="7d">Time Period: Last 7 Days</option>
          </select>

          {/* Category */}
          <select
            value={category}
            onChange={(e) => onCategoryChange(e.target.value)}
            aria-label="Filter by issue category"
            className="text-xs rounded-lg border border-border bg-background px-2.5 py-1.5 text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/40"
          >
            <option value="all">Category: All Categories</option>
            {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>

          {/* Status */}
          <select
            value={status}
            onChange={(e) => onStatusChange(e.target.value)}
            aria-label="Filter by complaint status"
            className="text-xs rounded-lg border border-border bg-background px-2.5 py-1.5 text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/40"
          >
            <option value="all">Status: All Statuses</option>
            <option value="pending">Pending Intake</option>
            <option value="in_progress">In Progress</option>
            <option value="resolved">Resolved</option>
          </select>

          {/* Clear Filters */}
          {isFiltered && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClear}
              className="text-xs h-8 px-2 gap-1 text-muted-foreground hover:text-foreground"
            >
              <X className="size-3" aria-hidden="true" />
              <span>Reset</span>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
