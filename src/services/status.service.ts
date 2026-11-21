import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { AuthenticatedUser } from "@/types/auth";
import type {
  ReportStatus,
  StatusHistoryItem,
  StatusHistoryResponseData,
  UpdateStatusInput,
  UpdateStatusResponseData,
} from "@/types/status";
import { REPORT_STATUS_TRANSITIONS } from "@/types/status";
import { AppError } from "@/utils/app-error";
import { logger } from "@/utils/logger";
import { assertAdmin } from "@/utils/permissions";
import { emitRealtimeReportEvent } from "@/services/realtime.service";
import { verifyResolutionDraftPath } from "@/services/storage.service";

/**
 * Validates whether a requested status transition is allowed in the state machine.
 * Throws AppError(CONFLICT) for disallowed transitions or same-state requests.
 */
export function assertValidStatusTransition(
  currentStatus: ReportStatus,
  targetStatus: ReportStatus
): void {
  if (currentStatus === targetStatus) {
    throw new AppError(
      "CONFLICT",
      `Report is already in status '${currentStatus}'.`
    );
  }

  const allowedNext = REPORT_STATUS_TRANSITIONS[currentStatus];
  if (!allowedNext || !allowedNext.includes(targetStatus)) {
    throw new AppError(
      "CONFLICT",
      `Invalid status transition from '${currentStatus}' to '${targetStatus}'.`
    );
  }
}

/**
 * Updates a complaint's status with atomic transaction guarantee, optimistic concurrency,
 * state machine enforcement, and immutable audit history persistence.
 * Restricted strictly to authorized administrators.
 */
export async function updateReportStatus(
  reportId: string,
  input: UpdateStatusInput,
  caller: AuthenticatedUser,
  client?: SupabaseClient
): Promise<UpdateStatusResponseData> {
  // 1. Enforce admin role authorization
  assertAdmin(caller);

  // 2. Validate resolution evidence requirement under Phase 17 policy
  if (input.status === "resolved") {
    if (!input.after_image_path || input.after_image_path.trim().length === 0) {
      logger.warn("evidence.required", { status: 422 });
      throw new AppError(
        "VALIDATION_ERROR",
        "Resolution requires an administrator-submitted after-repair image (after_image_path is required)"
      );
    }

    // Verify resolution draft path structure and ownership
    verifyResolutionDraftPath(caller.id, reportId, input.after_image_path);
  }

  const supabase = client ?? (await createSupabaseServerClient());

  // 3. Invoke atomic transition RPC
  const { data, error } = await supabase.rpc("civicpulse_transition_report_status", {
    p_report_id: reportId,
    p_new_status: input.status,
    p_notes: input.notes ?? null,
    p_expected_status: input.expected_status ?? null,
    p_after_image_path: input.after_image_path ?? null,
  });

  if (error) {
    const msg = error.message || "";
    const code = error.code || "";

    if (code === "P0002" || msg.includes("NOT_FOUND")) {
      logger.warn("report.not_found", { status: 404 });
      throw new AppError("NOT_FOUND", "Complaint not found");
    }

    if (
      code === "23514" ||
      msg.includes("STATUS_CONFLICT") ||
      code === "22023" ||
      msg.includes("INVALID_TRANSITION")
    ) {
      logger.warn("report.status_conflict", { status: 409 });
      const cleanMsg = msg.replace(/^.*?(STATUS_CONFLICT|INVALID_TRANSITION):\s*/, "");
      throw new AppError("CONFLICT", cleanMsg || "Status conflict. Complaint status changed.");
    }

    if (msg.includes("RESOLUTION_EVIDENCE_REQUIRED")) {
      logger.warn("evidence.required", { status: 422 });
      throw new AppError(
        "VALIDATION_ERROR",
        "Resolution requires an administrator-submitted after-repair image"
      );
    }

    if (code === "23505" || msg.includes("already been associated")) {
      logger.warn("report.status_conflict", { status: 409 });
      throw new AppError("CONFLICT", "This evidence image has already been associated with a report");
    }

    if (code === "42501" || msg.includes("FORBIDDEN")) {
      logger.warn("auth.forbidden", { status: 403 });
      throw new AppError("FORBIDDEN", "Administrative privileges required");
    }

    if (code === "28000" || msg.includes("UNAUTHORIZED")) {
      logger.warn("auth.unauthorized", { status: 401 });
      throw new AppError("UNAUTHORIZED", "Authentication required");
    }

    logger.error("request.failed", { status: 500 });
    throw new AppError("INTERNAL_SERVER_ERROR", "Failed to update complaint status", {
      cause: error,
    });
  }

  logger.info("report.status_updated", { status: 200 });

  // 4. Emit advisory Realtime broadcast event (non-blocking)
  await emitRealtimeReportEvent(
    {
      event: "report_updated",
      report_id: reportId,
      change_type: input.status === "resolved" ? "resolution_completed" : "status_changed",
      occurred_at: new Date().toISOString(),
    },
    supabase
  );

  return data as UpdateStatusResponseData;
}

interface RawHistoryRow {
  id: string;
  report_id: string;
  version: number;
  previous_status: string | null;
  status: string;
  created_at: string;
  notes?: string | null;
  changed_by?: string | null;
}

/**
 * Retrieves the chronological status timeline for a complaint.
 * Enforces role-aware data projection:
 * - Public/citizen viewers see status timestamps and versions only (notes & changed_by excluded).
 * - Administrators receive operational notes and actor UUIDs.
 * - Unauthorized callers attempting to view private complaints receive 404 NOT_FOUND.
 */
export async function getReportStatusHistory(
  reportId: string,
  caller: AuthenticatedUser | null,
  client?: SupabaseClient
): Promise<StatusHistoryResponseData> {
  const supabase = client ?? (await createSupabaseServerClient());

  // 1. Fetch report visibility and current status
  const { data: report, error: reportError } = await supabase
    .from("reports")
    .select("id, status, publication, visibility, user_id")
    .eq("id", reportId)
    .maybeSingle();

  if (reportError) {
    logger.error("request.failed", { status: 500 });
    throw new AppError("INTERNAL_SERVER_ERROR", "Failed to retrieve complaint details", {
      cause: reportError,
    });
  }

  if (!report) {
    logger.warn("report.not_found", { status: 404 });
    throw new AppError("NOT_FOUND", "Report not found");
  }

  // 2. Authorization check: determine if caller is permitted to view the report
  const isOwner = caller ? report.user_id === caller.id : false;
  const isAdmin = caller ? caller.role === "admin" : false;
  const isPublicListed = report.publication === "public" && report.visibility === "listed";

  if (!isPublicListed && !isOwner && !isAdmin) {
    // Conceal private reports with 404 to avoid disclosure
    logger.warn("report.not_found", { status: 404 });
    throw new AppError("NOT_FOUND", "Report not found");
  }

  // 3. Fetch history based on role projection
  let historyItems: StatusHistoryItem[] = [];

  if (isAdmin) {
    // Admin receives full history including operational notes and actor UUIDs
    const { data: adminHistory, error: historyError } = await supabase.rpc(
      "civicpulse_get_admin_status_history",
      { p_report_id: reportId }
    );

    if (historyError) {
      // Fallback to table select if RPC not available or in direct query mode
      const { data: fallbackHistory, error: fbError } = await supabase
        .from("status_history")
        .select("id, report_id, version, previous_status, status, created_at, changed_by, notes")
        .eq("report_id", reportId)
        .order("created_at", { ascending: true })
        .order("version", { ascending: true });

      if (fbError) {
        logger.error("request.failed", { status: 500 });
        throw new AppError("INTERNAL_SERVER_ERROR", "Failed to retrieve status history", {
          cause: fbError,
        });
      }

      historyItems = (fallbackHistory ?? []).map((row: RawHistoryRow) => ({
        id: row.id,
        report_id: row.report_id,
        version: row.version,
        previous_status: row.previous_status as ReportStatus | null,
        status: row.status as ReportStatus,
        changed_at: row.created_at,
        notes: row.notes ?? undefined,
        changed_by: row.changed_by ?? undefined,
      }));
    } else {
      historyItems = (adminHistory ?? []).map((row: RawHistoryRow) => ({
        id: row.id,
        report_id: row.report_id,
        version: row.version,
        previous_status: row.previous_status as ReportStatus | null,
        status: row.status as ReportStatus,
        changed_at: row.created_at,
        notes: row.notes ?? undefined,
        changed_by: row.changed_by ?? undefined,
      }));
    }
  } else {
    // Public / citizen view: notes and changed_by are strictly omitted
    const { data: publicHistory, error: historyError } = await supabase
      .from("status_history")
      .select("id, report_id, version, previous_status, status, created_at")
      .eq("report_id", reportId)
      .order("created_at", { ascending: true })
      .order("version", { ascending: true });

    if (historyError) {
      logger.error("request.failed", { status: 500 });
      throw new AppError("INTERNAL_SERVER_ERROR", "Failed to retrieve status history", {
        cause: historyError,
      });
    }

    historyItems = (publicHistory ?? []).map((row: RawHistoryRow) => ({
      id: row.id,
      report_id: row.report_id,
      version: row.version,
      previous_status: row.previous_status as ReportStatus | null,
      status: row.status as ReportStatus,
      changed_at: row.created_at,
      // notes and changed_by are strictly omitted
    }));
  }

  logger.info("report.history_retrieved", { status: 200 });

  return {
    report_id: report.id,
    current_status: report.status as ReportStatus,
    history: historyItems,
  };
}
