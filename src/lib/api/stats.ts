import { apiRequest } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";
import type { ComplaintSummary, PaginatedListResponse } from "@/types/domain";
import {
  type AdminStatsResponse,
  validateAdminStats,
} from "@/lib/validation/admin-stats";

export interface AdminOverviewData {
  stats: AdminStatsResponse;
  recentReports: ComplaintSummary[];
  isDemoData: boolean;
  error?: string;
  lastRefreshedAt: string;
}

const emptyAdminStats: AdminStatsResponse = {
  total: 0,
  pending: 0,
  inProgress: 0,
  resolved: 0,
  criticalActive: 0,
  resolutionRate: null,
};

export interface GetAdminStatsOptions {
  empty?: boolean;
  forceError?: boolean;
  signal?: AbortSignal;
}

/**
 * Fetches authoritative municipal complaint statistics from GET /api/stats?scope=admin.
 * Validates the runtime payload against the canonical schema.
 */
export async function getAdminStats(
  options: GetAdminStatsOptions = {}
): Promise<{ stats: AdminStatsResponse; isDemoData: boolean }> {
  if (options.forceError) {
    throw new Error("Unable to load administrative statistics at the moment.");
  }

  if (options.empty) {
    return {
      stats: emptyAdminStats,
      isDemoData: false,
    };
  }

  const rawData = await apiRequest<unknown>(endpoints.adminStats, {
    signal: options.signal,
  });
  const validated = validateAdminStats(rawData);
  return {
    stats: validated,
    isDemoData: false,
  };
}

/**
 * Fetches the small recent reports summary subset for the admin overview.
 * Uses GET /api/reports?scope=admin&pageSize=5&sort=recent.
 */
export async function getAdminRecentReports(
  options: GetAdminStatsOptions = {}
): Promise<{ reports: ComplaintSummary[]; isDemoData: boolean }> {
  if (options.forceError) {
    throw new Error("Unable to load recent complaints at the moment.");
  }

  if (options.empty) {
    return {
      reports: [],
      isDemoData: false,
    };
  }

  const response = await apiRequest<PaginatedListResponse<ComplaintSummary>>(
    endpoints.listReports,
    {
      query: new URLSearchParams({
        scope: "admin",
        pageSize: "5",
        sort: "recent",
      }),
      signal: options.signal,
    }
  );

  return {
    reports: response.items ?? [],
    isDemoData: false,
  };
}

/**
 * Orchestrates complete admin overview data retrieval.
 * Fetches statistics and recent reports concurrently.
 */
export async function getAdminOverviewData(
  options: GetAdminStatsOptions = {}
): Promise<AdminOverviewData> {
  if (options.forceError) {
    throw new Error("Failed to retrieve administrative overview metrics.");
  }

  const [statsResult, reportsResult] = await Promise.all([
    getAdminStats(options),
    getAdminRecentReports(options).catch(() => ({
      reports: [] as ComplaintSummary[],
      isDemoData: false,
    })),
  ]);

  return {
    stats: statsResult.stats,
    recentReports: reportsResult.reports,
    isDemoData: false,
    lastRefreshedAt: new Date().toISOString(),
  };
}
