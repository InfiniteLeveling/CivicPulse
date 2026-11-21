import type { ApiResponse } from "@/types/api";

/**
 * Standardized data payload returned upon successful or idempotent support of a report.
 */
export interface SupportReportResponseData {
  report_id: string;
  supported: boolean;
  already_supported: boolean;
  support_count: number;
}

/**
 * Detailed community support summary for a civic complaint.
 * Excludes individual voter identities, emails, profiles, and timestamps.
 */
export interface ReportSupportSummary {
  report_id: string;
  support_count: number;
  current_user_supported: boolean;
  can_support: boolean;
}

/**
 * Full API response envelope for POST /api/reports/:id/upvote.
 */
export type SupportReportResponse = ApiResponse<SupportReportResponseData>;

/**
 * Full API response envelope for GET /api/reports/:id/support.
 */
export type ReportSupportSummaryResponse = ApiResponse<ReportSupportSummary>;
