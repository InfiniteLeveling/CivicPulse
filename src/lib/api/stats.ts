import { apiRequest } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";
import type { ComplaintSummary, PaginatedListResponse } from "@/types/domain";
import {
  type AdminStatsResponse,
  validateAdminStats,
  mockAdminStats,
  mockEmptyAdminStats,
} from "@/lib/validation/admin-stats";
import { mockMyReports } from "./reports-mock";

export interface AdminOverviewData {
  stats: AdminStatsResponse;
  recentReports: ComplaintSummary[];
  isDemoData: boolean;
  error?: string;
  lastRefreshedAt: string;
}

export { mockAdminStats, mockEmptyAdminStats };

export interface GetAdminStatsOptions {
  empty?: boolean;
  forceError?: boolean;
  signal?: AbortSignal;
}

/**
 * Fetches authoritative municipal complaint statistics from GET /api/stats?scope=admin.
 * Validates the runtime payload against the canonical schema.
 * Falls back to isolated development fixtures when backend route handlers are unprovisioned.
 */
export async function getAdminStats(
  options: GetAdminStatsOptions = {}
): Promise<{ stats: AdminStatsResponse; isDemoData: boolean }> {
  if (options.forceError) {
    throw new Error("Simulated admin statistics backend failure (forceError=true).");
  }

  if (options.empty) {
    return {
      stats: mockEmptyAdminStats,
      isDemoData: true,
    };
  }

  try {
    const rawData = await apiRequest<unknown>(endpoints.adminStats, {
      signal: options.signal,
    });
    const validated = validateAdminStats(rawData);
    return {
      stats: validated,
      isDemoData: false,
    };
  } catch {
    // Backend API route handler not yet provisioned; return typed development fixtures
    return {
      stats: mockAdminStats,
      isDemoData: true,
    };
  }
}

/**
 * Fetches the small recent reports summary subset for the admin overview.
 * Uses GET /api/reports?scope=admin&pageSize=5&sort=recent.
 * Gracefully isolates secondary report list failures from primary stats.
 */
export async function getAdminRecentReports(
  options: GetAdminStatsOptions = {}
): Promise<{ reports: ComplaintSummary[]; isDemoData: boolean }> {
  if (options.forceError) {
    throw new Error("Simulated recent reports backend failure.");
  }

  if (options.empty) {
    return {
      reports: [],
      isDemoData: true,
    };
  }

  try {
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
  } catch {
    // Return recent reports from mock dataset for visual development
    return {
      reports: mockMyReports.slice(0, 5),
      isDemoData: true,
    };
  }
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
      isDemoData: true,
    })),
  ]);

  return {
    stats: statsResult.stats,
    recentReports: reportsResult.reports,
    isDemoData: statsResult.isDemoData || reportsResult.isDemoData,
    lastRefreshedAt: new Date().toISOString(),
  };
}
