import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { AuthenticatedUser } from "@/types/auth";
import type { PriorityBreakdown, ReportPriorityData } from "@/types/priority";
import { calculateDaysPending, calculatePriority } from "@/utils/priority";
import { AppError } from "@/utils/app-error";
import { logger } from "@/utils/logger";

interface RawReportRecord {
  id: string;
  user_id: string;
  severity: string;
  status: string;
  created_at: string;
  resolved_at?: string | null;
  publication?: string;
  visibility?: string;
  priority_score: number;
}

/**
 * Retrieves the authoritative, explainable priority score and component breakdown for a complaint.
 *
 * Guarantees:
 * 1. Strict Visibility: Unlisted/private complaints belonging to other citizens return 404 NOT_FOUND.
 * 2. Complete Explainability: Returns exact points for severity, community support, and unresolved duration.
 * 3. Voter Privacy: Never discloses individual voter UUIDs or personal data.
 * 4. Deterministic Freshness: Calculates age dynamically against current time (or resolved_at).
 */
export async function getReportPriority(
  reportId: string,
  caller?: AuthenticatedUser | null,
  asOf?: Date,
  client?: SupabaseClient
): Promise<ReportPriorityData> {
  const supabase = client ?? (await createSupabaseServerClient());
  const calculationTime = asOf ?? new Date();

  // 1. Attempt database RPC function if available
  if (typeof supabase.rpc === "function") {
    const { data: rpcData, error: rpcError } = await supabase.rpc(
      "civicpulse_get_priority_breakdown",
      {
        p_report_id: reportId,
        p_as_of: calculationTime.toISOString(),
      }
    );

    if (!rpcError && rpcData) {
      const data = rpcData as ReportPriorityData;
      logger.info("priority.breakdown_retrieved", { status: 200 });
      return data;
    }
  }

  // 2. Fetch report to check existence and visibility
  const { data: reportData, error: reportError } = await supabase
    .from("reports")
    .select("id, user_id, severity, status, created_at, resolved_at, publication, visibility, priority_score")
    .eq("id", reportId)
    .maybeSingle();

  if (reportError) {
    logger.error("priority.failed", { status: 500 });
    throw new AppError("INTERNAL_SERVER_ERROR", "Failed to retrieve complaint record", {
      cause: reportError,
    });
  }

  if (!reportData) {
    logger.warn("priority.failed", { status: 404 });
    throw new AppError("NOT_FOUND", "Complaint not found");
  }

  const report = reportData as RawReportRecord;

  // 3. Visibility authorization check
  const isOwner = caller?.id ? report.user_id === caller.id : false;
  const isAdmin = caller?.role === "admin";
  const isPublicListed =
    (!report.publication || report.publication === "public") &&
    (!report.visibility || report.visibility === "listed");

  if (!isPublicListed && !isOwner && !isAdmin) {
    logger.warn("priority.failed", { status: 404 });
    throw new AppError("NOT_FOUND", "Complaint not found");
  }

  // 4. Fetch authoritative distinct vote count
  const { count: voteCount, error: voteError } = await supabase
    .from("report_votes")
    .select("*", { count: "exact", head: true })
    .eq("report_id", reportId);

  if (voteError) {
    logger.error("priority.failed", { status: 500 });
    throw new AppError("INTERNAL_SERVER_ERROR", "Failed to calculate community support count", {
      cause: voteError,
    });
  }

  // 5. Compute days unresolved and full breakdown
  const daysUnresolved = calculateDaysPending(
    report.created_at,
    report.resolved_at,
    calculationTime
  );

  const breakdown: PriorityBreakdown = calculatePriority({
    severity: report.severity,
    voteCount: voteCount ?? 0,
    daysUnresolved,
  });

  const isActive = report.status === "pending" || report.status === "in_progress";

  logger.info("priority.breakdown_retrieved", { status: 200 });

  return {
    report_id: report.id,
    priority_score: breakdown.priority_score,
    priority_breakdown: breakdown,
    calculated_at: calculationTime.toISOString(),
    is_active: isActive,
  };
}

/**
 * Recalculates and updates the stored reports.priority_score column for a specific complaint.
 * Triggered after state-mutating events (new community vote, status resolution).
 */
export async function recalculateReportPriority(
  reportId: string,
  client?: SupabaseClient,
  asOf?: Date
): Promise<number> {
  const supabase = client ?? (await createSupabaseServerClient());
  const calculationTime = asOf ?? new Date();

  // 1. Fetch current authoritative complaint fields
  const { data: report, error: reportError } = await supabase
    .from("reports")
    .select("id, severity, created_at, resolved_at")
    .eq("id", reportId)
    .single();

  if (reportError || !report) {
    throw new AppError("NOT_FOUND", "Complaint not found for priority recalculation", {
      cause: reportError,
    });
  }

  // 2. Fetch authoritative vote count
  const { count, error: voteError } = await supabase
    .from("report_votes")
    .select("*", { count: "exact", head: true })
    .eq("report_id", reportId);

  if (voteError) {
    throw new AppError("INTERNAL_SERVER_ERROR", "Failed to retrieve votes for priority update", {
      cause: voteError,
    });
  }

  // 3. Compute score
  const daysUnresolved = calculateDaysPending(
    report.created_at,
    report.resolved_at,
    calculationTime
  );

  const breakdown = calculatePriority({
    severity: report.severity,
    voteCount: count ?? 0,
    daysUnresolved,
  });

  // 4. Update stored snapshot
  const { error: updateError } = await supabase
    .from("reports")
    .update({ priority_score: breakdown.priority_score })
    .eq("id", reportId);

  if (updateError) {
    logger.error("priority.failed", { status: 500 });
    throw new AppError("INTERNAL_SERVER_ERROR", "Failed to persist updated priority score", {
      cause: updateError,
    });
  }

  logger.info("priority.recalculated", { status: 200 });
  return breakdown.priority_score;
}

/**
 * Batch recalculates priority scores for all active ('pending', 'in_progress') complaints.
 * Can be run on-demand or as a scheduled operational task to refresh age points.
 */
export async function recalculateAllActiveReportPriorities(
  client?: SupabaseClient,
  asOf?: Date
): Promise<{ updatedCount: number }> {
  const supabase = client ?? (await createSupabaseServerClient());
  const calculationTime = asOf ?? new Date();

  const { data: activeReports, error: fetchError } = await supabase
    .from("reports")
    .select("id, severity, created_at, resolved_at")
    .in("status", ["pending", "in_progress"]);

  if (fetchError) {
    throw new AppError("INTERNAL_SERVER_ERROR", "Failed to fetch active reports for batch priority update", {
      cause: fetchError,
    });
  }

  const reports = activeReports ?? [];
  let updatedCount = 0;

  for (const report of reports) {
    const { count } = await supabase
      .from("report_votes")
      .select("*", { count: "exact", head: true })
      .eq("report_id", report.id);

    const daysUnresolved = calculateDaysPending(
      report.created_at,
      report.resolved_at,
      calculationTime
    );

    const breakdown = calculatePriority({
      severity: report.severity,
      voteCount: count ?? 0,
      daysUnresolved,
    });

    const { error: updateErr } = await supabase
      .from("reports")
      .update({ priority_score: breakdown.priority_score })
      .eq("id", report.id);

    if (!updateErr) {
      updatedCount++;
    }
  }

  logger.info("priority.recalculated", { status: 200 });
  return { updatedCount };
}
