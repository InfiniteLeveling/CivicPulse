import type { ApiResponse } from "@/types/api";
import type { ReportCategory } from "@/types/report";

/**
 * The execution outcome status of an automatic routing operation.
 */
export type RoutingStatus =
  | "assigned"
  | "skipped_unmapped"
  | "skipped_manual_override"
  | "skipped_resolved"
  | "skipped_already_assigned"
  | "target_department_missing"
  | "failed";

/**
 * Trustworthy source indicator for how a complaint's department was assigned.
 */
export type AssignmentSource = "unassigned" | "automatic" | "manual";

/**
 * Evaluated routing decision before executing database mutations.
 */
export interface RoutingDecision {
  report_id: string;
  category: ReportCategory | string;
  is_eligible: boolean;
  routing_status: RoutingStatus;
  target_department_name: string | null;
  target_department_id: string | null;
  current_department_id: string | null;
  rule_key?: string;
  reason: string;
}

/**
 * Full standardized result returned upon completing or skipping automatic routing.
 */
export interface RoutingResult {
  report_id: string;
  routing_status: RoutingStatus;
  assignment_source: AssignmentSource;
  department: {
    id: string;
    name: string;
  } | null;
  previous_department_id?: string | null;
  rule_key?: string;
  assignment_history_id?: string | null;
  assigned_at?: string;
  message: string;
}

/**
 * Input payload for admin retry of automatic routing (POST /api/admin/route).
 */
export interface AdminRouteReportInput {
  report_id: string;
  expected_department_id?: string | null;
}

/**
 * Standard API response envelope for admin route retries.
 */
export type AdminRouteReportResponse = ApiResponse<RoutingResult>;

/**
 * Summary metrics returned from batch backfill execution.
 */
export interface BackfillResult {
  total_scanned: number;
  assigned: number;
  skipped_unmapped: number;
  skipped_manual_override: number;
  skipped_resolved: number;
  skipped_already_assigned: number;
  target_department_missing: number;
  failed: number;
}
