import { apiRequest } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";
import type { ComplaintStats, ComplaintSummary, PaginatedListResponse } from "@/types/domain";

export interface CitizenDashboardData {
  stats: ComplaintStats;
  reports: ComplaintSummary[];
  isDemoData: boolean;
  error?: string;
}

const emptyStats: ComplaintStats = {
  total: 0,
  pending: 0,
  inProgress: 0,
  resolved: 0,
  resolutionRate: null,
};

/**
 * Fetches citizen dashboard statistics and recent reports from live endpoints.
 */
export async function getCitizenDashboardData(empty = false): Promise<CitizenDashboardData> {
  if (empty) {
    return {
      stats: emptyStats,
      reports: [],
      isDemoData: false,
    };
  }

  const [statsResult, reportsResult] = await Promise.all([
    apiRequest<ComplaintStats>(endpoints.myStats),
    apiRequest<PaginatedListResponse<ComplaintSummary>>(endpoints.listReports, {
      query: new URLSearchParams({ scope: "mine", pageSize: "5" }),
    }),
  ]);

  return {
    stats: statsResult,
    reports: reportsResult.items ?? [],
    isDemoData: false,
  };
}
