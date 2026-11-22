"use client";

import { useState, useTransition, useCallback, useMemo } from "react";
import dynamic from "next/dynamic";
import {
  Compass,
  Map as MapIcon,
  List,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import type {
  PublicReportsFilterState,
  ReportSummary,
} from "@/types/domain";
import { filterPublicReports } from "@/lib/validation/public-reports";
import { getPublicReports } from "@/lib/api/reports";
import { Button } from "@/components/ui/button";
import { CivicMapFilters } from "./CivicMapFilters";
import { CivicMapToolbar } from "./CivicMapToolbar";
import { CivicMapLegend } from "./CivicMapLegend";
import { CivicMapReportList } from "./CivicMapReportList";

// Client-only dynamic import of React Leaflet map with loading skeleton
function MapLoadingSkeleton() {
  return (
    <div
      role="status"
      aria-label="Loading interactive map"
      className="w-full h-[380px] sm:h-[480px] lg:h-[calc(100vh-270px)] rounded-xl border border-border bg-muted/30 flex flex-col items-center justify-center gap-3 p-6 text-center animate-pulse"
    >
      <Compass
        className="size-10 text-primary/70 animate-spin motion-reduce:animate-none"
        aria-hidden="true"
      />
      <div className="space-y-1">
        <p className="text-sm font-semibold text-foreground">
          Loading OpenStreetMap tiles...
        </p>
        <p className="text-xs text-muted-foreground max-w-xs">
          Preparing interactive map markers and geographical layers.
        </p>
      </div>
    </div>
  );
}

const CivicMapClient = dynamic(() => import("./CivicMapClient"), {
  ssr: false,
  loading: () => <MapLoadingSkeleton />,
});

interface CivicMapProps {
  initialReports: ReportSummary[];
  initialTotal: number;
  isDemoData?: boolean;
}

export function CivicMap({
  initialReports,
  initialTotal,
  isDemoData = false,
}: CivicMapProps) {
  const [reports, setReports] = useState<ReportSummary[]>(initialReports);
  const [totalCount, setTotalCount] = useState<number>(initialTotal);
  const [demoMode, setDemoMode] = useState<boolean>(isDemoData);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [fitBoundsTrigger, setFitBoundsTrigger] = useState<number>(0);
  const [activeMobileView, setActiveMobileView] = useState<"map" | "list">("map");

  const [filters, setFilters] = useState<PublicReportsFilterState>({
    status: "all",
    category: "all",
    search: "",
  });

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  // Filter reports locally
  const filteredResult = useMemo(
    () => filterPublicReports(reports, {
      status: filters.status,
      category: filters.category,
      q: filters.search,
    }),
    [reports, filters]
  );

  const visibleReports = filteredResult.items;

  // Filter change handler
  const handleFilterChange = useCallback(
    (updates: Partial<PublicReportsFilterState>) => {
      setFilters((prev) => {
        const next = { ...prev, ...updates };
        // If current selected report doesn't match new filters, clear selection
        if (selectedReportId) {
          const stillVisible = filterPublicReports(reports, {
            status: next.status,
            category: next.category,
            q: next.search,
          }).items.some((r) => r.id === selectedReportId);
          if (!stillVisible) {
            setSelectedReportId(null);
          }
        }
        return next;
      });
    },
    [reports, selectedReportId]
  );

  // Reset filters handler
  const handleResetFilters = useCallback(() => {
    setFilters({
      status: "all",
      category: "all",
      search: "",
    });
  }, []);

  // Marker/card select handler
  const handleSelectReport = useCallback(
    (id: string | null) => {
      setSelectedReportId(id);
      // If triggered on mobile from the list, switch to map view to show the pin
      if (id && activeMobileView === "list") {
        setActiveMobileView("map");
      }
    },
    [activeMobileView]
  );

  // Fit all markers trigger
  const handleFitAll = useCallback(() => {
    setFitBoundsTrigger((prev) => prev + 1);
  }, []);

  // Refresh handler
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    setRefreshError(null);

    try {
      const res = await getPublicReports();
      startTransition(() => {
        setReports(res.items);
        setTotalCount(res.total);
        setDemoMode(res.isDemoData ?? false);
        // Clear selection if the report no longer exists
        if (selectedReportId && !res.items.some((r) => r.id === selectedReportId)) {
          setSelectedReportId(null);
        }
      });
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to refresh public reports.";
      setRefreshError(message);
    } finally {
      setIsRefreshing(false);
    }
  }, [selectedReportId]);

  return (
    <div className="space-y-4">
      {/* Page Header */}
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary border border-primary/20">
            <MapIcon className="size-4" aria-hidden="true" />
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            Live Civic Issue Map
          </h1>
        </div>
        <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
          Current public reports retrieved from CivicPulse. Explore nearby civic infrastructure concerns and track their resolution progress.
        </p>
      </div>

      {/* Filter Toolbar */}
      <CivicMapFilters
        filters={filters}
        onFilterChange={handleFilterChange}
        onReset={handleResetFilters}
      />

      {/* Map Toolbar & Legend Row */}
      <div className="space-y-2">
        <CivicMapToolbar
          visibleCount={visibleReports.length}
          totalCount={totalCount}
          isDemoData={demoMode}
          isRefreshing={isRefreshing}
          onRefresh={handleRefresh}
          onFitAll={handleFitAll}
        />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <CivicMapLegend />

          {/* Mobile View Toggle Switch */}
          <div className="flex lg:hidden items-center rounded-lg border border-border p-0.5 bg-muted/50 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setActiveMobileView("map")}
              aria-pressed={activeMobileView === "map"}
              className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                activeMobileView === "map"
                  ? "bg-background text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <MapIcon className="size-3.5" aria-hidden="true" />
              <span>Map View</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveMobileView("list")}
              aria-pressed={activeMobileView === "list"}
              className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                activeMobileView === "list"
                  ? "bg-background text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <List className="size-3.5" aria-hidden="true" />
              <span>List ({visibleReports.length})</span>
            </button>
          </div>
        </div>
      </div>

      {/* Error Alert */}
      {refreshError && (
        <div
          role="alert"
          className="flex items-center justify-between gap-2 p-3 text-xs rounded-lg border border-destructive/30 bg-destructive/10 text-destructive"
        >
          <div className="flex items-center gap-2">
            <AlertCircle className="size-4 shrink-0" aria-hidden="true" />
            <span>{refreshError}</span>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            className="h-7 text-xs text-destructive hover:bg-destructive/20"
          >
            <RefreshCw className="size-3 mr-1" aria-hidden="true" />
            <span>Retry</span>
          </Button>
        </div>
      )}

      {/* Main Dual Area */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* Left Side: Accessible List Panel (always visible on desktop, toggled on mobile) */}
        <div
          className={`lg:col-span-5 xl:col-span-4 ${
            activeMobileView === "list" ? "block" : "hidden lg:block"
          }`}
        >
          <div className="bg-card/50 rounded-xl border border-border p-3.5 space-y-3">
            <div className="flex items-center justify-between border-b border-border/60 pb-2">
              <h2 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                <List className="size-4 text-primary" aria-hidden="true" />
                <span>Public Complaints</span>
              </h2>
              <span className="text-xs text-muted-foreground">
                {visibleReports.length} {visibleReports.length === 1 ? "issue" : "issues"}
              </span>
            </div>

            <CivicMapReportList
              reports={visibleReports}
              totalAvailable={totalCount}
              selectedReportId={selectedReportId}
              onSelect={handleSelectReport}
              onResetFilters={handleResetFilters}
            />
          </div>
        </div>

        {/* Right Side: Interactive Leaflet Map (always visible on desktop, toggled on mobile) */}
        <div
          className={`lg:col-span-7 xl:col-span-8 ${
            activeMobileView === "map" ? "block" : "hidden lg:block"
          }`}
        >
          <CivicMapClient
            reports={visibleReports}
            selectedReportId={selectedReportId}
            onSelect={handleSelectReport}
            fitBoundsTrigger={fitBoundsTrigger}
          />
        </div>
      </div>
    </div>
  );
}
