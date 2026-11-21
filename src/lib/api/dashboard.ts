import { apiRequest } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";
import type { ComplaintStats, ComplaintSummary, PaginatedListResponse } from "@/types/domain";
import { mockCitizenReports, mockCitizenStats, mockEmptyStats } from "./dashboard-mock";

export interface CitizenDashboardData {
  stats: ComplaintStats;
  reports: ComplaintSummary[];
  isDemoData: boolean;
  error?: string;
}

/**
 * Fetches citizen dashboard statistics and recent reports.
 * Falls back gracefully to typed development fixtures if backend routes are not yet available.
 */
export async function getCitizenDashboardData(empty = false): Promise<CitizenDashboardData> {
  if (empty) {
    return {
      stats: mockEmptyStats,
      reports: [],
      isDemoData: true,
    };
  }

  try {
    // Attempt live backend fetch via existing API client
    const statsPromise = apiRequest<ComplaintStats>(endpoints.myStats);
    const reportsPromise = apiRequest<PaginatedListResponse<ComplaintSummary>>(
      endpoints.listReports,
      {
        query: new URLSearchParams({ scope: "mine", pageSize: "5" }),
      }
    );

    const [statsResult, reportsResult] = await Promise.all([
      statsPromise,
      reportsPromise,
    ]);

    return {
      stats: statsResult,
      reports: reportsResult.items ?? [],
      isDemoData: false,
    };
  } catch {
    // Backend API is not yet provisioned; fall back to development fixtures
    return {
      stats: mockCitizenStats,
      reports: mockCitizenReports,
      isDemoData: true,
    };
  }
}
