"use client";

import { useState, useTransition } from "react";
import { RefreshCw, AlertCircle, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AdminStatsGrid } from "./AdminStatsGrid";
import { AdminUrgentIssuesCard } from "./AdminUrgentIssuesCard";
import { AdminResolutionProgressCard } from "./AdminResolutionProgressCard";
import { ComplaintStatusDistribution } from "./ComplaintStatusDistribution";
import { AdminRecentComplaints } from "./AdminRecentComplaints";
import { AdminQuickActions } from "./AdminQuickActions";
import { AdminDataFreshness } from "./AdminDataFreshness";
import {
  type AdminOverviewData,
  getAdminOverviewData,
} from "@/lib/api/stats";

interface AdminDashboardProps {
  initialData: AdminOverviewData;
}

export function AdminDashboard({ initialData }: AdminDashboardProps) {
  const [data, setData] = useState<AdminOverviewData>(initialData);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const [isRefreshing, startTransition] = useTransition();

  const handleRefresh = () => {
    if (isRefreshing) return;
    setRefreshError(null);

    startTransition(async () => {
      try {
        const refreshed = await getAdminOverviewData();
        setData(refreshed);
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "Failed to refresh administrative dashboard metrics.";
        setRefreshError(message);
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-border/80">
        <div className="space-y-1 min-w-0">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground truncate">
              Admin Overview
            </h1>
            <Badge
              variant="outline"
              className="text-xs border-primary/30 text-primary bg-primary/5 gap-1"
            >
              <ShieldCheck className="size-3" aria-hidden="true" />
              <span>Operations Console</span>
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed max-w-3xl">
            Monitor civic complaints, track resolution progress and identify issues that need attention.
          </p>
        </div>

        {/* Refresh & Freshness Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 shrink-0">
          <AdminDataFreshness
            lastRefreshedAt={data.lastRefreshedAt}
            isDemoData={data.isDemoData}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            aria-label="Refresh administrative dashboard"
            className="text-xs gap-1.5 h-8 w-fit"
          >
            <RefreshCw
              className={`size-3.5 ${isRefreshing ? "animate-spin" : ""}`}
              aria-hidden="true"
            />
            <span>{isRefreshing ? "Refreshing..." : "Refresh"}</span>
          </Button>
        </div>
      </div>

      {/* Refresh Error Alert */}
      {refreshError && (
        <div
          role="alert"
          className="rounded-xl border border-destructive/20 bg-destructive/10 p-3.5 text-xs text-destructive flex items-center justify-between gap-3 animate-in fade-in-50"
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
            className="text-xs h-7 px-2 text-destructive hover:bg-destructive/20"
          >
            Retry
          </Button>
        </div>
      )}

      {/* Section 1: Main Statistics Grid */}
      <AdminStatsGrid stats={data.stats} />

      {/* Section 2: Operational Attention (Urgent Issues + Resolution Progress) */}
      <section aria-label="Operational Attention" className="space-y-3">
        <h2 className="text-sm font-semibold tracking-tight text-foreground">
          Operational Attention
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <AdminUrgentIssuesCard urgentCount={data.stats.criticalActive} />
          <AdminResolutionProgressCard
            resolutionRate={data.stats.resolutionRate}
            total={data.stats.total}
            resolved={data.stats.resolved}
          />
        </div>
      </section>

      {/* Section 3: Status Distribution */}
      <section aria-label="Complaint Status Distribution">
        <ComplaintStatusDistribution stats={data.stats} />
      </section>

      {/* Section 4: Recent Complaints */}
      <section aria-label="Recent Municipal Complaints">
        <AdminRecentComplaints reports={data.recentReports} />
      </section>

      {/* Section 5: Quick Actions & Roadmap Destinations */}
      <section aria-label="Administrative Actions">
        <AdminQuickActions />
      </section>
    </div>
  );
}
