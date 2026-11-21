import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import type {
  IssueCategory,
  MyReportsFilterState,
  ReportSortBy,
  ReportStatus,
} from "@/types/domain";
import { CATEGORY_LABELS } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface MyReportsFiltersProps {
  filterState: MyReportsFilterState;
  onFilterChange: <K extends keyof MyReportsFilterState>(
    key: K,
    value: MyReportsFilterState[K]
  ) => void;
  onResetFilters: () => void;
  statusCounts?: {
    all: number;
    pending: number;
    in_progress: number;
    resolved: number;
  };
}

const statusOptions: { id: ReportStatus | "all"; label: string }[] = [
  { id: "all", label: "All Complaints" },
  { id: "pending", label: "Pending" },
  { id: "in_progress", label: "In Progress" },
  { id: "resolved", label: "Resolved" },
];

export function MyReportsFilters({
  filterState,
  onFilterChange,
  onResetFilters,
  statusCounts,
}: MyReportsFiltersProps) {
  const hasActiveFilters =
    filterState.status !== "all" ||
    filterState.category !== "all" ||
    filterState.search !== "" ||
    filterState.sortBy !== "newest";

  return (
    <div className="flex flex-col gap-3">
      {/* Status Segmented Buttons / Tabs */}
      <div className="flex flex-wrap items-center gap-1.5 p-1 bg-muted/60 rounded-xl border border-border/60 w-fit">
        {statusOptions.map((opt) => {
          const isActive = filterState.status === opt.id;
          const count = statusCounts ? statusCounts[opt.id] : undefined;

          return (
            <button
              key={opt.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => onFilterChange("status", opt.id)}
              className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg transition-all",
                isActive
                  ? "bg-background text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground hover:bg-background/50"
              )}
            >
              <span>{opt.label}</span>
              {count !== undefined && (
                <span
                  className={cn(
                    "text-[10px] font-bold px-1.5 py-0.2 rounded-full",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Dropdowns & Reset Row */}
      <div className="flex flex-wrap items-center gap-2.5">
        {/* Category Selector */}
        <div className="flex items-center gap-1.5">
          <label htmlFor="category-filter" className="text-xs text-muted-foreground whitespace-nowrap">
            Category:
          </label>
          <NativeSelect
            id="category-filter"
            aria-label="Filter by issue category"
            value={filterState.category}
            onChange={(e) =>
              onFilterChange(
                "category",
                e.target.value as IssueCategory | "all"
              )
            }
            className="w-40 sm:w-44"
          >
            <NativeSelectOption value="all">All Categories</NativeSelectOption>
            {(Object.keys(CATEGORY_LABELS) as IssueCategory[]).map((cat) => (
              <NativeSelectOption key={cat} value={cat}>
                {CATEGORY_LABELS[cat]}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </div>

        {/* Sort Selector */}
        <div className="flex items-center gap-1.5">
          <label htmlFor="sort-filter" className="text-xs text-muted-foreground whitespace-nowrap">
            Sort by:
          </label>
          <NativeSelect
            id="sort-filter"
            aria-label="Sort complaints list"
            value={filterState.sortBy}
            onChange={(e) =>
              onFilterChange("sortBy", e.target.value as ReportSortBy)
            }
            className="w-36 sm:w-40"
          >
            <NativeSelectOption value="newest">Newest First</NativeSelectOption>
            <NativeSelectOption value="oldest">Oldest First</NativeSelectOption>
            <NativeSelectOption value="support">Most Supported</NativeSelectOption>
          </NativeSelect>
        </div>

        {/* Reset Filters Button */}
        {hasActiveFilters && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onResetFilters}
            className="text-xs text-muted-foreground hover:text-foreground h-8 gap-1 px-2.5 ml-auto sm:ml-0"
          >
            <RotateCcw className="size-3.5" aria-hidden="true" />
            <span>Reset Filters</span>
          </Button>
        )}
      </div>
    </div>
  );
}
