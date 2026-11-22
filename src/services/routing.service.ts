import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  getRuleKey,
  getTargetDepartmentName,
} from "@/config/routing";
import type { AuthenticatedUser } from "@/types/auth";
import type {
  AdminRouteReportInput,
  AssignmentSource,
  BackfillResult,
  RoutingDecision,
  RoutingResult,
} from "@/types/routing";
import { AppError } from "@/utils/app-error";
import { logger } from "@/utils/logger";
import { assertAdmin } from "@/utils/permissions";
import { emitRealtimeReportEvent } from "@/services/realtime.service";

interface ReportRoutingState {
  id: string;
  category: string;
  status: string;
  department_id: string | null;
  manual_override: boolean;
  assignment_source: AssignmentSource;
}

/**
 * Resolves the operational department entity for a given complaint category from the database.
 * Returns null if the category is unmapped (such as 'other') or if the target department is not found in the DB.
 */
export async function resolveDepartmentForCategory(
  category: string,
  client?: SupabaseClient
): Promise<{ id: string; name: string } | null> {
  const targetDeptName = getTargetDepartmentName(category);
  if (!targetDeptName) {
    return null;
  }

  const supabase = client ?? (await createSupabaseServerClient());
  const { data, error } = await supabase
    .from("departments")
    .select("id, name")
    .eq("name", targetDeptName)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return { id: data.id, name: data.name };
}

/**
 * Evaluates the deterministic routing decision for a report based on persisted state.
 * Enforces manual override precedence, status freeze, and category mappings.
 */
export async function getRoutingDecision(
  reportId: string,
  client?: SupabaseClient
): Promise<RoutingDecision> {
  const supabase = client ?? (await createSupabaseServerClient());

  const { data: report, error } = await supabase
    .from("reports")
    .select("id, category, status, department_id, manual_override, assignment_source")
    .eq("id", reportId)
    .maybeSingle();

  if (error) {
    logger.error("routing.decision_failed", { status: 500 });
    throw new AppError("INTERNAL_SERVER_ERROR", "Failed to retrieve complaint routing state", {
      cause: error,
    });
  }

  if (!report) {
    logger.warn("routing.report_not_found", { status: 404 });
    throw new AppError("NOT_FOUND", "Report not found");
  }

  const typedReport = report as unknown as ReportRoutingState;

  // 1. Lifecycle restriction: resolved complaints cannot be auto-routed
  if (typedReport.status === "resolved") {
    return {
      report_id: reportId,
      category: typedReport.category,
      is_eligible: false,
      routing_status: "skipped_resolved",
      target_department_name: null,
      target_department_id: null,
      current_department_id: typedReport.department_id,
      reason: "Complaint is resolved and cannot be automatically routed",
    };
  }

  // 2. Manual Admin Override Precedence: Administrator decisions are permanent
  if (typedReport.manual_override === true || typedReport.assignment_source === "manual") {
    return {
      report_id: reportId,
      category: typedReport.category,
      is_eligible: false,
      routing_status: "skipped_manual_override",
      target_department_name: null,
      target_department_id: null,
      current_department_id: typedReport.department_id,
      reason: "Complaint is protected by administrator manual override",
    };
  }

  // 3. Category Mapping Check
  const targetDeptName = getTargetDepartmentName(typedReport.category);
  if (!targetDeptName) {
    return {
      report_id: reportId,
      category: typedReport.category,
      is_eligible: false,
      routing_status: "skipped_unmapped",
      target_department_name: null,
      target_department_id: null,
      current_department_id: typedReport.department_id,
      reason: "Category requires manual administrator review",
    };
  }

  // 4. Resolve Target Department in Database
  const targetDept = await resolveDepartmentForCategory(typedReport.category, supabase);
  if (!targetDept) {
    return {
      report_id: reportId,
      category: typedReport.category,
      is_eligible: false,
      routing_status: "target_department_missing",
      target_department_name: targetDeptName,
      target_department_id: null,
      current_department_id: typedReport.department_id,
      reason: `Target department '${targetDeptName}' does not exist in database directory`,
    };
  }

  const ruleKey = getRuleKey(typedReport.category, targetDept.name);

  // 5. Idempotency Check: already assigned to target department
  if (typedReport.department_id === targetDept.id) {
    return {
      report_id: reportId,
      category: typedReport.category,
      is_eligible: false,
      routing_status: "skipped_already_assigned",
      target_department_name: targetDept.name,
      target_department_id: targetDept.id,
      current_department_id: typedReport.department_id,
      rule_key: ruleKey,
      reason: "Complaint is already assigned to the target department",
    };
  }

  // 6. Report is eligible for automatic assignment
  return {
    report_id: reportId,
    category: typedReport.category,
    is_eligible: true,
    routing_status: "assigned",
    target_department_name: targetDept.name,
    target_department_id: targetDept.id,
    current_department_id: typedReport.department_id,
    rule_key: ruleKey,
    reason: `Eligible for automatic assignment to ${targetDept.name}`,
  };
}

/**
 * Executes automatic department routing for a complaint.
 * Uses atomic PostgreSQL RPC civicpulse_auto_route_report with resilient service fallback.
 */
export async function autoRouteReport(
  reportId: string,
  client?: SupabaseClient
): Promise<RoutingResult> {
  const supabase = client ?? (await createSupabaseServerClient());

  // 1. Attempt atomic RPC invocation
  const { data: rpcData, error: rpcError } = await supabase.rpc(
    "civicpulse_auto_route_report",
    {
      p_report_id: reportId,
    }
  );

  if (!rpcError && rpcData) {
    logger.info("routing.completed", { status: 200 });
    const res = rpcData as RoutingResult;
    if (res.routing_status === "assigned") {
      await emitRealtimeReportEvent(
        {
          event: "report_updated",
          report_id: reportId,
          change_type: "department_changed",
          occurred_at: new Date().toISOString(),
        },
        supabase
      );
    }
    return res;
  }

  // If RPC failed due to not existing, fallback to service-level execution
  const msg = rpcError?.message ?? "";
  const isMissingRpc =
    rpcError?.code === "PGRST202" ||
    rpcError?.code === "42883" ||
    msg.includes("function public.civicpulse_auto_route_report") ||
    msg.includes("Could not find the function");

  if (rpcError && !isMissingRpc) {
    if (rpcError.code === "P0002" || msg.includes("NOT_FOUND")) {
      logger.warn("routing.report_not_found", { status: 404 });
      throw new AppError("NOT_FOUND", "Report not found");
    }
    if (rpcError.code === "42501" || msg.includes("FORBIDDEN")) {
      logger.warn("routing.forbidden", { status: 403 });
      throw new AppError("FORBIDDEN", "Administrative or service privileges required");
    }
    logger.error("routing.rpc_failed", { status: 500 });
    throw new AppError("INTERNAL_SERVER_ERROR", "Failed to execute automatic routing RPC", {
      cause: rpcError,
    });
  }

  // 2. Fallback Service Implementation
  const decision = await getRoutingDecision(reportId, supabase);

  // If ineligible or skipped, return clean non-mutating result
  if (!decision.is_eligible || !decision.target_department_id) {
    let currentDeptObj: { id: string; name: string } | null = null;
    if (decision.current_department_id) {
      const { data: currDept } = await supabase
        .from("departments")
        .select("id, name")
        .eq("id", decision.current_department_id)
        .maybeSingle();
      if (currDept) {
        currentDeptObj = { id: currDept.id, name: currDept.name };
      }
    }

    logger.info("routing.skipped", { status: 200 });

    return {
      report_id: reportId,
      routing_status: decision.routing_status,
      assignment_source: decision.routing_status === "skipped_manual_override" ? "manual" : "unassigned",
      department: currentDeptObj,
      previous_department_id: decision.current_department_id,
      rule_key: decision.rule_key,
      message: decision.reason,
    };
  }

  // Execute database mutations
  const nowIso = new Date().toISOString();

  // Step 2a: Update public.reports
  const { error: updateError } = await supabase
    .from("reports")
    .update({
      department_id: decision.target_department_id,
      assignment_source: "automatic",
      updated_at: nowIso,
    })
    .eq("id", reportId);

  if (updateError) {
    logger.error("routing.update_failed", { status: 500 });
    throw new AppError("INTERNAL_SERVER_ERROR", "Failed to update complaint department assignment", {
      cause: updateError,
    });
  }

  // Step 2b: Persist audit event in public.department_assignment_history
  const { data: historyRow, error: historyError } = await supabase
    .from("department_assignment_history")
    .insert({
      report_id: reportId,
      previous_department_id: decision.current_department_id,
      new_department_id: decision.target_department_id,
      assigned_by: null, // System action - no fabricated user UUID
      assignment_source: "automatic",
      rule_key: decision.rule_key ?? null,
      reason: `Automated routing based on complaint category: ${decision.category}`,
      created_at: nowIso,
    })
    .select("id")
    .maybeSingle();

  if (historyError) {
    logger.error("routing.audit_failed", { status: 500 });
    // Compensation: revert report assignment to avoid unaudited mutation
    await supabase
      .from("reports")
      .update({
        department_id: decision.current_department_id,
        assignment_source: "unassigned",
      })
      .eq("id", reportId);

    throw new AppError("INTERNAL_SERVER_ERROR", "Failed to record department assignment audit history", {
      cause: historyError,
    });
  }

  logger.info("routing.assigned", { status: 200 });

  return {
    report_id: reportId,
    routing_status: "assigned",
    assignment_source: "automatic",
    department: {
      id: decision.target_department_id,
      name: decision.target_department_name!,
    },
    previous_department_id: decision.current_department_id,
    rule_key: decision.rule_key,
    assignment_history_id: historyRow?.id ?? null,
    assigned_at: nowIso,
    message: "Complaint routed successfully",
  };
}

/**
 * Administrative retry endpoint for re-evaluating automatic routing on an existing complaint.
 * Strictly verifies admin role and validates optimistic concurrency via expected_department_id.
 */
export async function retryAutomaticRouting(
  input: AdminRouteReportInput,
  caller: AuthenticatedUser,
  client?: SupabaseClient
): Promise<RoutingResult> {
  // 1. Strict admin role verification
  assertAdmin(caller);

  const supabase = client ?? (await createSupabaseServerClient());

  // 2. Optimistic concurrency check (if expected_department_id provided)
  if (input.expected_department_id !== undefined) {
    const { data: report, error } = await supabase
      .from("reports")
      .select("department_id")
      .eq("id", input.report_id)
      .maybeSingle();

    if (error) {
      logger.error("routing.retry_failed", { status: 500 });
      throw new AppError("INTERNAL_SERVER_ERROR", "Failed to check complaint state", { cause: error });
    }

    if (!report) {
      logger.warn("routing.retry_not_found", { status: 404 });
      throw new AppError("NOT_FOUND", "Report not found");
    }

    if (report.department_id !== input.expected_department_id) {
      logger.warn("routing.retry_conflict", { status: 409 });
      throw new AppError(
        "CONFLICT",
        `Complaint department state conflict. Expected ${input.expected_department_id ?? "unassigned"} but found ${report.department_id ?? "unassigned"}`
      );
    }
  }

  // 3. Delegate to autoRouteReport
  return autoRouteReport(input.report_id, supabase);
}

/**
 * Safe, idempotent backfill utility to auto-route unassigned legacy complaints.
 * Skips resolved, manually handled, and unmapped reports.
 */
export async function backfillUnassignedReports(
  client?: SupabaseClient
): Promise<BackfillResult> {
  const supabase = client ?? (await createSupabaseServerClient());

  const { data: candidates, error } = await supabase
    .from("reports")
    .select("id, category, status, manual_override")
    .is("department_id", null)
    .eq("manual_override", false)
    .neq("status", "resolved");

  if (error) {
    logger.error("routing.backfill_query_failed", { status: 500 });
    throw new AppError("INTERNAL_SERVER_ERROR", "Failed to query unassigned complaints for backfill", {
      cause: error,
    });
  }

  const result: BackfillResult = {
    total_scanned: candidates?.length ?? 0,
    assigned: 0,
    skipped_unmapped: 0,
    skipped_manual_override: 0,
    skipped_resolved: 0,
    skipped_already_assigned: 0,
    target_department_missing: 0,
    failed: 0,
  };

  for (const report of candidates ?? []) {
    try {
      const outcome = await autoRouteReport(report.id, supabase);
      switch (outcome.routing_status) {
        case "assigned":
          result.assigned++;
          break;
        case "skipped_unmapped":
          result.skipped_unmapped++;
          break;
        case "skipped_manual_override":
          result.skipped_manual_override++;
          break;
        case "skipped_resolved":
          result.skipped_resolved++;
          break;
        case "skipped_already_assigned":
          result.skipped_already_assigned++;
          break;
        case "target_department_missing":
          result.target_department_missing++;
          break;
        default:
          result.failed++;
          break;
      }
    } catch {
      logger.error("routing.backfill_item_failed", { status: 500 });
      result.failed++;
    }
  }

  logger.info("routing.backfill_completed", { status: 200 });
  return result;
}
