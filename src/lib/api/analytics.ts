import { getAdminStats } from "./stats";
import { getAdminReports } from "./reports";
import {
  type AdminAnalyticsData,
  aggregateAnalyticsFromReports,
} from "@/lib/validation/admin-analytics";
import { mockMyReports } from "./reports-mock";

export interface GetAdminAnalyticsOptions {
  timeRange?: "all" | "30d" | "7d";
  category?: string;
  status?: string;
  empty?: boolean;
  forceError?: boolean;
  signal?: AbortSignal;
}

/**
 * Fetches authoritative municipal complaint analytics data.
 * Merges authoritative totals from GET /api/stats?scope=admin with
 * report dataset aggregations for categories, severities, workloads, and trends.
 */
export async function getAdminAnalytics(
  options: GetAdminAnalyticsOptions = {}
): Promise<AdminAnalyticsData> {
  if (options.forceError) {
    throw new Error("Simulated analytics service failure (forceError=true).");
  }

  if (options.empty) {
    return aggregateAnalyticsFromReports([], {
      total: 0,
      pending: 0,
      inProgress: 0,
      resolved: 0,
      criticalActive: 0,
      resolutionRate: null,
    });
  }

  // Fetch stats and reports in parallel
  const [statsResult, reportsResult] = await Promise.all([
    getAdminStats({ signal: options.signal }).catch(() => ({
      stats: {
        total: mockMyReports.length,
        pending: mockMyReports.filter((r) => r.status === "pending").length,
        inProgress: mockMyReports.filter((r) => r.status === "in_progress").length,
        resolved: mockMyReports.filter((r) => r.status === "resolved").length,
        criticalActive: mockMyReports.filter(
          (r) => (r.priority?.urgent || r.severity === "critical") && r.status !== "resolved"
        ).length,
        resolutionRate: 25.0,
      },
      isDemoData: true,
    })),
    getAdminReports({ pageSize: 100 }, { signal: options.signal }).catch(() => ({
      items: mockMyReports,
      total: mockMyReports.length,
      page: 1,
      pageSize: 100,
      totalPages: 1,
      urgentCount: 2,
      isDemoData: true,
    })),
  ]);

  let reports = reportsResult.items;

  // Apply optional client-side filters if requested
  if (options.category && options.category !== "all") {
    reports = reports.filter((r) => r.category === options.category);
  }

  if (options.status && options.status !== "all") {
    reports = reports.filter((r) => r.status === options.status);
  }

  if (options.timeRange && options.timeRange !== "all") {
    const now = Date.now();
    const daysLimit = options.timeRange === "7d" ? 7 : 30;
    const cutoff = now - daysLimit * 24 * 60 * 60 * 1000;
    reports = reports.filter((r) => {
      try {
        return new Date(r.createdAt).getTime() >= cutoff;
      } catch {
        return true;
      }
    });
  }

  const analytics = aggregateAnalyticsFromReports(reports, statsResult.stats);
  analytics.isDemoData = statsResult.isDemoData || reportsResult.isDemoData;
  return analytics;
}
