"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import type {
  ComplaintSummary,
  GetMyReportsResult,
  IssueCategory,
  MyReportsFilterState,
  ReportSortBy,
  ReportStatus,
} from "@/types/domain";
import { getMyReports } from "@/lib/api/reports";
import { computeReportStats, mockMyReports } from "@/lib/api/reports-mock";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { MyReportsHeader } from "./MyReportsHeader";
import { MyReportsSummary } from "./MyReportsSummary";
import { MyReportsSearch } from "./MyReportsSearch";
import { MyReportsFilters } from "./MyReportsFilters";
import { MyReportsList } from "./MyReportsList";
import { MyReportsPagination } from "./MyReportsPagination";
import { MyReportsEmptyState } from "./MyReportsEmptyState";
import { MyReportsErrorState } from "./MyReportsErrorState";

const PAGE_SIZE = 5;

export function MyReportsView() {
  const searchParams = useSearchParams();

  // Read initial values from URL query parameters
  const paramEmpty = searchParams.get("empty") === "true";
  const paramForceError = searchParams.get("error") === "true";

  const initialStatus = ((): ReportStatus | "all" => {
    const s = searchParams.get("status");
    if (s === "pending" || s === "in_progress" || s === "resolved") return s;
    return "all";
  })();

  const initialCategory = ((): IssueCategory | "all" => {
    const c = searchParams.get("category");
    if (
      c === "pothole" ||
      c === "garbage" ||
      c === "water_leakage" ||
      c === "streetlight" ||
      c === "drainage" ||
      c === "other"
    ) {
      return c;
    }
    return "all";
  })();

  const initialQ = searchParams.get("q") ?? "";

  const initialSort = ((): ReportSortBy => {
    const s = searchParams.get("sort");
    if (s === "newest" || s === "oldest" || s === "support") return s;
    return "newest";
  })();

  const initialPage = ((): number => {
    const p = Number.parseInt(searchParams.get("page") ?? "1", 10);
    return Number.isFinite(p) && p > 0 ? p : 1;
  })();

  const [filterState, setFilterState] = useState<MyReportsFilterState>({
    status: initialStatus,
    category: initialCategory,
    search: initialQ,
    sortBy: initialSort,
    page: initialPage,
  });

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GetMyReportsResult | null>(null);
  const [refreshIndex, setRefreshIndex] = useState<number>(0);

  // Overall account stats computed across the user's full reports
  const allAccountReports: ComplaintSummary[] = useMemo(() => {
    if (paramEmpty) return [];
    return mockMyReports;
  }, [paramEmpty]);

  const summaryStats = useMemo(() => {
    return computeReportStats(allAccountReports);
  }, [allAccountReports]);

  const statusCounts = useMemo(() => {
    return {
      all: summaryStats.total,
      pending: summaryStats.pending,
      in_progress: summaryStats.inProgress,
      resolved: summaryStats.resolved,
    };
  }, [summaryStats]);

  const hasActiveFilters =
    filterState.status !== "all" ||
    filterState.category !== "all" ||
    filterState.search !== "" ||
    filterState.sortBy !== "newest";

  // Fetch reports when filters or refreshIndex change
  useEffect(() => {
    let active = true;
    const controller = new AbortController();

    async function loadReports() {
      try {
        const data = await getMyReports(
          {
            status: filterState.status,
            category: filterState.category,
            q: filterState.search,
            sort: filterState.sortBy,
            page: filterState.page,
            pageSize: PAGE_SIZE,
            empty: paramEmpty,
            forceError: paramForceError,
          },
          { signal: controller.signal }
        );

        if (active) {
          setResult(data);
          setError(null);
          setLoading(false);
        }
      } catch (err: unknown) {
        if (active && !controller.signal.aborted) {
          const msg =
            err instanceof Error ? err.message : "Failed to load complaints.";
          setError(msg);
          setLoading(false);
        }
      }
    }

    void loadReports();

    return () => {
      active = false;
      controller.abort();
    };
  }, [
    filterState.status,
    filterState.category,
    filterState.search,
    filterState.sortBy,
    filterState.page,
    paramEmpty,
    paramForceError,
    refreshIndex,
  ]);

  const handleFilterChange = useCallback(
    <K extends keyof MyReportsFilterState>(
      key: K,
      value: MyReportsFilterState[K]
    ) => {
      setLoading(true);
      setFilterState((prev) => ({
        ...prev,
        [key]: value,
        page: key === "page" ? (value as number) : 1, // Reset page to 1 whenever filters change
      }));
    },
    []
  );

  const handleSearchChange = useCallback((value: string) => {
    setLoading(true);
    setFilterState((prev) => ({
      ...prev,
      search: value,
      page: 1,
    }));
  }, []);

  const handleResetFilters = useCallback(() => {
    setLoading(true);
    setFilterState({
      status: "all",
      category: "all",
      search: "",
      sortBy: "newest",
      page: 1,
    });
  }, []);

  const handlePageChange = useCallback((newPage: number) => {
    setLoading(true);
    setFilterState((prev) => ({
      ...prev,
      page: newPage,
    }));
  }, []);

  const handleRetry = useCallback(() => {
    setLoading(true);
    setRefreshIndex((prev) => prev + 1);
  }, []);

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <MyReportsHeader isDemoData={result?.isDemoData} />

      {/* 4 Stat Overview Cards */}
      <MyReportsSummary stats={summaryStats} />

      {/* Filter & Search Toolbar */}
      <Card className="border-border shadow-xs">
        <CardContent className="p-4 sm:p-5 space-y-4">
          <MyReportsSearch
            value={filterState.search}
            onChange={handleSearchChange}
          />

          <MyReportsFilters
            filterState={filterState}
            onFilterChange={handleFilterChange}
            onResetFilters={handleResetFilters}
            statusCounts={statusCounts}
          />
        </CardContent>
      </Card>

      {/* Complaints List / State Container */}
      <div className="space-y-4">
        {loading ? (
          <div className="space-y-3" aria-busy="true" aria-label="Loading complaints">
            <Skeleton className="h-10 w-full rounded-lg" />
            <Skeleton className="h-16 w-full rounded-xl" />
            <Skeleton className="h-16 w-full rounded-xl" />
            <Skeleton className="h-16 w-full rounded-xl" />
            <Skeleton className="h-16 w-full rounded-xl" />
          </div>
        ) : error ? (
          <MyReportsErrorState message={error} onRetry={handleRetry} />
        ) : !result || result.total === 0 ? (
          hasActiveFilters ? (
            <MyReportsEmptyState
              mode="no-results"
              onClearFilters={handleResetFilters}
            />
          ) : (
            <MyReportsEmptyState mode="account-empty" />
          )
        ) : (
          <div className="space-y-4">
            <MyReportsList reports={result.items} />

            <MyReportsPagination
              page={filterState.page}
              pageSize={result.pageSize}
              total={result.total}
              onPageChange={handlePageChange}
            />
          </div>
        )}
      </div>
    </div>
  );
}
