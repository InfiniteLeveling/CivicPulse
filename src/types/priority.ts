import type { ApiResponse } from "@/types/api";

export type PrioritySeverity = "low" | "medium" | "high" | "critical";

/**
 * Transparent breakdown explaining how a complaint's priority score is calculated.
 */
export interface PriorityBreakdown {
  /** Canonical severity level of the complaint */
  severity: PrioritySeverity;
  /** Points awarded based on severity (low: 15, medium: 30, high: 50, critical: 70) */
  severity_points: number;
  /** Number of valid, distinct community supporters */
  support_count: number;
  /** Points awarded from community votes (3 pts/vote, max 20) */
  support_points: number;
  /** Number of fully elapsed 24-hour periods since creation (or until resolution) */
  days_unresolved: number;
  /** Points awarded from complaint age (2 pts/day, max 10) */
  age_points: number;
  /** Total authoritative priority score (0-100) */
  priority_score: number;
  /** Maximum possible score cap (100) */
  max_score: number;
}

/**
 * Full priority payload returned by the priority breakdown endpoint.
 */
export interface ReportPriorityData {
  report_id: string;
  priority_score: number;
  priority_breakdown: PriorityBreakdown;
  calculated_at: string;
  is_active: boolean;
}

export type ReportPriorityResponse = ApiResponse<ReportPriorityData>;

/**
 * Parameters for pure priority calculation.
 */
export interface CalculatePriorityInput {
  severity: string;
  voteCount: number;
  daysUnresolved: number;
}
