"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { LayoutDashboard, ClipboardList, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AnalyticsPageHeader } from "./AnalyticsPageHeader";
import { AnalyticsMetricsGrid } from "./AnalyticsMetricsGrid";
import { AnalyticsFilters } from "./AnalyticsFilters";
import { ComplaintStatusChart } from "./ComplaintStatusChart";
import { ComplaintCategoryChart } from "./ComplaintCategoryChart";
import { ComplaintSeverityChart } from "./ComplaintSeverityChart";
import { ComplaintTrendChart } from "./ComplaintTrendChart";
import { DepartmentWorkloadChart } from "./DepartmentWorkloadChart";
import { ResolutionPerformanceCard } from "./ResolutionPerformanceCard";
import { AnalyticsDataTable } from "./AnalyticsDataTable";
import { AnalyticsEmptyState } from "./AnalyticsEmptyState";
import { AnalyticsErrorState } from "./AnalyticsErrorState";
import { getAdminAnalytics } from "@/lib/api/analytics";
import type { AdminAnalyticsData } from "@/lib/validation/admin-analytics";

interface AdminAnalyticsDashboardProps {
  initialData: AdminAnalyticsData;
}

export function AdminAnalyticsDashboard({ initialData }: AdminAnalyticsDashboardProps) {
  const [data, setData] = useState<AdminAnalyticsData>(initialData);
  const [viewMode, setViewMode] = useState<"charts" | "tables">("charts");
  const [timeRange, setTimeRange] = useState<"all" | "30d" | "7d">("all");
  const [category, setCategory] = useState("all");
  const [status, setStatus] = useState("all");
  const [isRefreshing, startRefresh] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  function executeFetch(
    opts: {
      timeRange?: "all" | "30d" | "7d";
      category?: string;
      status?: string;
    } = {},
    showToast = true
  ) {
    const tr = opts.timeRange ?? timeRange;
    const cat = opts.category ?? category;
    const st = opts.status ?? status;

    startRefresh(async () => {
      try {
        setErrorMessage(null);
        const result = await getAdminAnalytics({
          timeRange: tr,
          category: cat,
          status: st,
        });
        setData(result);
        if (showToast) {
          toast.info("Analytics data refreshed.");
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Failed to refresh analytics data.";
        setErrorMessage(msg);
        toast.error("Analytics refresh failed", { description: msg });
      }
    });
  }

  function handleClearFilters() {
    setTimeRange("all");
    setCategory("all");
    setStatus("all");
    executeFetch({ timeRange: "all", category: "all", status: "all" }, false);
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto w-full pb-16">
      {/* 1. Header */}
      <AnalyticsPageHeader
        lastRefreshedAt={data.lastRefreshedAt}
        isRefreshing={isRefreshing}
        onRefresh={() => executeFetch({}, true)}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        isDemoData={data.isDemoData}
      />

      {/* Error State */}
      {errorMessage && (
        <AnalyticsErrorState
          error={errorMessage}
          onRetry={() => executeFetch({}, true)}
        />
      )}

      {/* 2. Key Metrics Grid */}
      <AnalyticsMetricsGrid data={data} />

      {/* 3. Filters Component */}
      <AnalyticsFilters
        timeRange={timeRange}
        onTimeRangeChange={(tr) => {
          setTimeRange(tr);
          executeFetch({ timeRange: tr });
        }}
        category={category}
        onCategoryChange={(cat) => {
          setCategory(cat);
          executeFetch({ category: cat });
        }}
        status={status}
        onStatusChange={(st) => {
          setStatus(st);
          executeFetch({ status: st });
        }}
        onClear={handleClearFilters}
      />

      {/* 4. Main Body: Empty State vs Tables vs Charts */}
      {data.total === 0 ? (
        <AnalyticsEmptyState onRefresh={() => executeFetch({}, true)} />
      ) : viewMode === "tables" ? (
        <AnalyticsDataTable data={data} />
      ) : (
        <div className="space-y-6">
          {/* Charts Row 1: Status Donut & Category Bar */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            <ComplaintStatusChart data={data.statusBreakdown} total={data.total} />
            <ComplaintCategoryChart data={data.categoryBreakdown} />
          </div>

          {/* Charts Row 2: Severity Bar & Department Workload */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            <ComplaintSeverityChart data={data.severityBreakdown} />
            <DepartmentWorkloadChart data={data.departmentWorkload} />
          </div>

          {/* Historical Trends & Performance Card */}
          <div className="space-y-6">
            <ComplaintTrendChart data={data.trends} />
            <ResolutionPerformanceCard
              metrics={data.resolutionPerformance}
              total={data.total}
            />
          </div>
        </div>
      )}

      {/* 5. Quick Navigation Footer */}
      <div className="pt-4 border-t border-border/80 flex flex-col sm:flex-row items-center justify-between gap-3">
        <Link href="/admin">
          <Button variant="ghost" size="sm" className="text-xs gap-1.5 text-muted-foreground hover:text-foreground">
            <LayoutDashboard className="size-3.5" aria-hidden="true" />
            <span>Return to Admin Overview</span>
          </Button>
        </Link>

        <Link href="/admin/complaints">
          <Button variant="outline" size="sm" className="text-xs gap-1.5">
            <ClipboardList className="size-3.5 text-primary" aria-hidden="true" />
            <span>Open Complaints Queue</span>
            <ArrowRight className="size-3.5" aria-hidden="true" />
          </Button>
        </Link>
      </div>
    </div>
  );
}
