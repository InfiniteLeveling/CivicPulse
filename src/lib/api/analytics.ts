import { getAdminStats } from "./stats";
import { getAdminReports } from "./reports";
import {
  type AdminAnalyticsData,
  aggregateAnalyticsFromReports,
} from "@/lib/validation/admin-analytics";

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
    throw new Error("Unable to load municipal analytics data at the moment.");
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

  // Fetch stats and reports in parallel from real endpoints
  const [statsResult, reportsResult] = await Promise.all([
    getAdminStats({ signal: options.signal }),
    getAdminReports({ pageSize: 100 }, { signal: options.signal }),
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
  analytics.isDemoData = false;
  return analytics;
}
