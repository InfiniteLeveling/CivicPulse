"use client";

import { useId } from "react";
import { Search, X, RotateCcw } from "lucide-react";
import type { IssueCategory, PublicReportsFilterState, ReportStatus } from "@/types/domain";
import { CATEGORY_LABELS } from "@/lib/constants";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface CivicMapFiltersProps {
  filters: PublicReportsFilterState;
  onFilterChange: (updates: Partial<PublicReportsFilterState>) => void;
  onReset: () => void;
}

const CATEGORY_OPTIONS: { value: IssueCategory | "all"; label: string }[] = [
  { value: "all", label: "All Categories" },
  { value: "pothole", label: CATEGORY_LABELS.pothole },
  { value: "garbage", label: CATEGORY_LABELS.garbage },
  { value: "water_leakage", label: CATEGORY_LABELS.water_leakage },
  { value: "streetlight", label: CATEGORY_LABELS.streetlight },
  { value: "drainage", label: CATEGORY_LABELS.drainage },
  { value: "other", label: CATEGORY_LABELS.other },
];

const STATUS_OPTIONS: { value: ReportStatus | "all"; label: string }[] = [
  { value: "all", label: "All Statuses" },
  { value: "pending", label: "Pending" },
  { value: "in_progress", label: "In Progress" },
  { value: "resolved", label: "Resolved" },
];

export function CivicMapFilters({
  filters,
  onFilterChange,
  onReset,
}: CivicMapFiltersProps) {
  const searchId = useId();
  const categoryId = useId();
  const statusId = useId();

  const hasActiveFilters =
    filters.category !== "all" ||
    filters.status !== "all" ||
    Boolean(filters.search.trim());

  return (
    <div className="bg-card rounded-xl border border-border p-3 sm:p-4 space-y-3 shadow-xs">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3">
        {/* Search Input */}
        <div className="sm:col-span-2 lg:col-span-5 relative">
          <label htmlFor={searchId} className="sr-only">
            Search public civic issues
          </label>
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none"
            aria-hidden="true"
          />
          <Input
            id={searchId}
            type="search"
            value={filters.search}
            onChange={(e) => onFilterChange({ search: e.target.value })}
            placeholder="Search public civic issues..."
            className="pl-9 pr-8 h-9 text-xs sm:text-sm bg-background"
          />
          {filters.search && (
            <button
              type="button"
              onClick={() => onFilterChange({ search: "" })}
              aria-label="Clear search query"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="size-3.5" aria-hidden="true" />
            </button>
          )}
        </div>

        {/* Category Dropdown */}
        <div className="sm:col-span-1 lg:col-span-3">
          <label htmlFor={categoryId} className="sr-only">
            Filter by category
          </label>
          <select
            id={categoryId}
            value={filters.category}
            onChange={(e) =>
              onFilterChange({ category: e.target.value as IssueCategory | "all" })
            }
            className="w-full h-9 rounded-lg border border-input bg-background px-3 text-xs sm:text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
          >
            {CATEGORY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Status Dropdown */}
        <div className="sm:col-span-1 lg:col-span-3">
          <label htmlFor={statusId} className="sr-only">
            Filter by status
          </label>
          <select
            id={statusId}
            value={filters.status}
            onChange={(e) =>
              onFilterChange({ status: e.target.value as ReportStatus | "all" })
            }
            className="w-full h-9 rounded-lg border border-input bg-background px-3 text-xs sm:text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Clear Filters Button */}
        {hasActiveFilters && (
          <div className="sm:col-span-2 lg:col-span-1 flex items-center justify-end">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onReset}
              className="h-9 px-2 text-xs text-muted-foreground hover:text-foreground gap-1"
              title="Reset all filters"
            >
              <RotateCcw className="size-3.5" aria-hidden="true" />
              <span className="lg:hidden">Reset Filters</span>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
