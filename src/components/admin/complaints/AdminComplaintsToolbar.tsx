import { Search, X, AlertOctagon, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CATEGORY_LABELS } from "@/lib/constants";
import type { IssueCategory, IssueSeverity, ReportStatus } from "@/types/domain";

interface AdminComplaintsToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
  status: ReportStatus | "all";
  onStatusChange: (status: ReportStatus | "all") => void;
  category: IssueCategory | "all";
  onCategoryChange: (category: IssueCategory | "all") => void;
  severity: IssueSeverity | "all";
  onSeverityChange: (severity: IssueSeverity | "all") => void;
  urgent: boolean;
  onUrgentToggle: () => void;
  sort: "priority" | "priority_asc" | "recent" | "oldest" | "most_supported";
  onSortChange: (
    sort: "priority" | "priority_asc" | "recent" | "oldest" | "most_supported"
  ) => void;
  onClearFilters: () => void;
  hasActiveFilters: boolean;
}

export function AdminComplaintsToolbar({
  search,
  onSearchChange,
  status,
  onStatusChange,
  category,
  onCategoryChange,
  severity,
  onSeverityChange,
  urgent,
  onUrgentToggle,
  sort,
  onSortChange,
  onClearFilters,
  hasActiveFilters,
}: AdminComplaintsToolbarProps) {
  return (
    <div className="space-y-3">
      {/* Search & Main Controls Row */}
      <div className="flex flex-col md:flex-row gap-3">
        {/* Search Input */}
        <div className="relative flex-1">
          <label htmlFor="admin-complaints-search" className="sr-only">
            Search complaints
          </label>
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none"
            aria-hidden="true"
          />
          <input
            id="admin-complaints-search"
            type="search"
            placeholder="Search complaints by title, reference, or department..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full h-9 rounded-lg border border-input bg-background pl-9 pr-8 text-xs text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          {search && (
            <button
              type="button"
              onClick={() => onSearchChange("")}
              aria-label="Clear search input"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5 rounded"
            >
              <X className="size-3.5" aria-hidden="true" />
            </button>
          )}
        </div>

        {/* Sort Select */}
        <div className="flex items-center gap-2 shrink-0">
          <label htmlFor="admin-sort-select" className="text-xs text-muted-foreground whitespace-nowrap hidden sm:inline">
            Sort by:
          </label>
          <select
            id="admin-sort-select"
            value={sort}
            aria-label="Sort complaints"
            onChange={(e) =>
              onSortChange(
                e.target.value as
                  | "priority"
                  | "priority_asc"
                  | "recent"
                  | "oldest"
                  | "most_supported"
              )
            }
            className="h-9 rounded-lg border border-input bg-background px-2.5 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="priority">Priority: Urgent First</option>
            <option value="priority_asc">Priority: Lowest First</option>
            <option value="recent">Date: Newest First</option>
            <option value="oldest">Date: Oldest First</option>
            <option value="most_supported">Community: Most Supported</option>
          </select>
        </div>
      </div>

      {/* Filter Row */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Status Select */}
        <select
          value={status}
          aria-label="Filter by status"
          onChange={(e) => onStatusChange(e.target.value as ReportStatus | "all")}
          className="h-8 rounded-lg border border-input bg-background px-2.5 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value="all">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="in_progress">In Progress</option>
          <option value="resolved">Resolved</option>
        </select>

        {/* Category Select */}
        <select
          value={category}
          aria-label="Filter by category"
          onChange={(e) => onCategoryChange(e.target.value as IssueCategory | "all")}
          className="h-8 rounded-lg border border-input bg-background px-2.5 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value="all">All Categories</option>
          {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>

        {/* Severity Select */}
        <select
          value={severity}
          aria-label="Filter by severity"
          onChange={(e) => onSeverityChange(e.target.value as IssueSeverity | "all")}
          className="h-8 rounded-lg border border-input bg-background px-2.5 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value="all">All Severities</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>

        {/* Urgent Only Toggle */}
        <Button
          type="button"
          variant={urgent ? "default" : "outline"}
          size="sm"
          onClick={onUrgentToggle}
          aria-pressed={urgent}
          className={`h-8 text-xs gap-1.5 ${
            urgent
              ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
              : "text-foreground"
          }`}
        >
          <AlertOctagon className="size-3.5" aria-hidden="true" />
          <span>Urgent Only</span>
        </Button>

        {/* Clear Filters Button */}
        {hasActiveFilters && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClearFilters}
            className="h-8 text-xs gap-1 text-muted-foreground hover:text-foreground"
          >
            <RotateCcw className="size-3" aria-hidden="true" />
            <span>Clear Filters</span>
          </Button>
        )}
      </div>
    </div>
  );
}
