"use client";

import { useState, useTransition, useEffect, useCallback } from "react";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AdminComplaintsHeader } from "./AdminComplaintsHeader";
import { AdminComplaintsToolbar } from "./AdminComplaintsToolbar";
import { AdminComplaintsTable } from "./AdminComplaintsTable";
import { AdminComplaintCard } from "./AdminComplaintCard";
import { AdminComplaintPreviewDialog } from "./AdminComplaintPreviewDialog";
import { AdminComplaintsPagination } from "./AdminComplaintsPagination";
import { AdminComplaintsEmptyState } from "./AdminComplaintsEmptyState";
import { getAdminReports } from "@/lib/api/reports";
import type {
  ComplaintSummary,
  GetAdminReportsParams,
  GetAdminReportsResult,
  IssueCategory,
  IssueSeverity,
  ReportStatus,
} from "@/types/domain";

interface AdminComplaintsViewProps {
  initialData: GetAdminReportsResult;
  initialParams?: GetAdminReportsParams;
}

export function AdminComplaintsView({
  initialData,
  initialParams,
}: AdminComplaintsViewProps) {
  const [data, setData] = useState<GetAdminReportsResult>(initialData);
  const [search, setSearch] = useState<string>(initialParams?.q ?? "");
  const [status, setStatus] = useState<ReportStatus | "all">(
    initialParams?.status ?? "all"
  );
  const [category, setCategory] = useState<IssueCategory | "all">(
    initialParams?.category ?? "all"
  );
  const [severity, setSeverity] = useState<IssueSeverity | "all">(
    initialParams?.severity ?? "all"
  );
  const [urgent, setUrgent] = useState<boolean>(initialParams?.urgent ?? false);
  const [sort, setSort] = useState<
    "priority" | "priority_asc" | "recent" | "oldest" | "most_supported"
  >(initialParams?.sort ?? "priority");
  const [page, setPage] = useState<number>(initialParams?.page ?? 1);

  const [selectedReport, setSelectedReport] = useState<ComplaintSummary | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const hasActiveFilters = Boolean(
    search ||
      status !== "all" ||
      category !== "all" ||
      severity !== "all" ||
      urgent ||
      sort !== "priority"
  );

  const fetchReports = useCallback(
    (params: GetAdminReportsParams) => {
      setError(null);
      startTransition(async () => {
        try {
          const result = await getAdminReports(params);
          setData(result);
        } catch (err) {
          setError(
            err instanceof Error
              ? err.message
              : "Failed to load administrative complaints queue."
          );
        }
      });
    },
    [startTransition]
  );

  // Debounced search & filter sync
  useEffect(() => {
    const handler = setTimeout(() => {
      fetchReports({
        q: search,
        status,
        category,
        severity,
        urgent,
        sort,
        page,
        pageSize: 10,
      });
    }, 250);

    return () => clearTimeout(handler);
  }, [search, status, category, severity, urgent, sort, page, fetchReports]);

  const handleSearchChange = (val: string) => {
    setSearch(val);
    setPage(1);
  };

  const handleStatusChange = (newStatus: ReportStatus | "all") => {
    setStatus(newStatus);
    setPage(1);
  };

  const handleCategoryChange = (newCat: IssueCategory | "all") => {
    setCategory(newCat);
    setPage(1);
  };

  const handleSeverityChange = (newSev: IssueSeverity | "all") => {
    setSeverity(newSev);
    setPage(1);
  };

  const handleUrgentToggle = () => {
    setUrgent((prev) => !prev);
    setPage(1);
  };

  const handleSortChange = (
    newSort: "priority" | "priority_asc" | "recent" | "oldest" | "most_supported"
  ) => {
    setSort(newSort);
    setPage(1);
  };

  const handleClearFilters = () => {
    setSearch("");
    setStatus("all");
    setCategory("all");
    setSeverity("all");
    setUrgent(false);
    setSort("priority");
    setPage(1);
  };

  const handleRefresh = () => {
    fetchReports({
      q: search,
      status,
      category,
      severity,
      urgent,
      sort,
      page,
      pageSize: 10,
    });
  };

  const emptyType: "empty_all" | "empty_filtered" | "empty_urgent" =
    data.total === 0 && !hasActiveFilters
      ? "empty_all"
      : urgent && data.items.length === 0
      ? "empty_urgent"
      : "empty_filtered";

  return (
    <div className="space-y-6">
      {/* Header */}
      <AdminComplaintsHeader
        total={data.total}
        urgentCount={data.urgentCount}
        isDemoData={data.isDemoData}
        isRefreshing={isPending}
        onRefresh={handleRefresh}
      />

      {/* Toolbar (Search, Filters, Sort) */}
      <AdminComplaintsToolbar
        search={search}
        onSearchChange={handleSearchChange}
        status={status}
        onStatusChange={handleStatusChange}
        category={category}
        onCategoryChange={handleCategoryChange}
        severity={severity}
        onSeverityChange={handleSeverityChange}
        urgent={urgent}
        onUrgentToggle={handleUrgentToggle}
        sort={sort}
        onSortChange={handleSortChange}
        onClearFilters={handleClearFilters}
        hasActiveFilters={hasActiveFilters}
      />

      {/* Error Banner */}
      {error && (
        <div
          role="alert"
          className="rounded-xl border border-destructive/20 bg-destructive/10 p-3.5 text-xs text-destructive flex items-center justify-between gap-3 animate-in fade-in-50"
        >
          <div className="flex items-center gap-2">
            <AlertCircle className="size-4 shrink-0" aria-hidden="true" />
            <span>{error}</span>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            className="text-xs h-7 px-2 text-destructive hover:bg-destructive/20"
          >
            Retry
          </Button>
        </div>
      )}

      {/* Main Content Area */}
      {data.items.length > 0 ? (
        <div className="space-y-4">
          {/* Desktop Table View */}
          <div className="hidden md:block">
            <AdminComplaintsTable
              reports={data.items}
              onInspect={(report) => setSelectedReport(report)}
            />
          </div>

          {/* Mobile Card List View */}
          <div className="md:hidden space-y-3">
            {data.items.map((report) => (
              <AdminComplaintCard
                key={report.id}
                report={report}
                onInspect={(r) => setSelectedReport(r)}
              />
            ))}
          </div>

          {/* Pagination */}
          <AdminComplaintsPagination
            page={data.page}
            pageSize={data.pageSize}
            total={data.total}
            totalPages={data.totalPages}
            onPageChange={(newPage) => setPage(newPage)}
          />
        </div>
      ) : (
        <AdminComplaintsEmptyState
          type={emptyType}
          onClearFilters={hasActiveFilters ? handleClearFilters : undefined}
        />
      )}

      {/* Inspection Modal Dialog */}
      <AdminComplaintPreviewDialog
        report={selectedReport}
        open={Boolean(selectedReport)}
        onClose={() => setSelectedReport(null)}
      />
    </div>
  );
}
