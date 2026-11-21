import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { AuthenticatedUser } from "@/types/auth";
import type {
  AssignDepartmentInput,
  AssignDepartmentResponseData,
  DepartmentItem,
  DepartmentListResponseData,
} from "@/types/department";
import { AppError } from "@/utils/app-error";
import { logger } from "@/utils/logger";
import { assertAdmin } from "@/utils/permissions";
import { emitRealtimeReportEvent } from "@/services/realtime.service";

interface RawDepartmentRow {
  id: string;
  name: string;
  description?: string | null;
}

/**
 * Retrieves the department directory for frontend selection controls.
 * Deterministically sorted by name in ascending alphabetical order.
 */
export async function listDepartments(
  client?: SupabaseClient
): Promise<DepartmentListResponseData> {
  const supabase = client ?? (await createSupabaseServerClient());

  const { data, error } = await supabase
    .from("departments")
    .select("id, name, description")
    .order("name", { ascending: true });

  if (error) {
    logger.error("request.failed", { status: 500 });
    throw new AppError("INTERNAL_SERVER_ERROR", "Failed to retrieve departments directory", {
      cause: error,
    });
  }

  const departments: DepartmentItem[] = (data ?? []).map((row: RawDepartmentRow) => ({
    id: row.id,
    name: row.name,
    description: row.description ?? null,
  }));

  logger.info("department.listed", { status: 200 });

  return { departments };
}

/**
 * Retrieves a single department by its UUID.
 */
export async function getDepartmentById(
  id: string,
  client?: SupabaseClient
): Promise<DepartmentItem | null> {
  const supabase = client ?? (await createSupabaseServerClient());

  const { data, error } = await supabase
    .from("departments")
    .select("id, name, description")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    logger.error("request.failed", { status: 500 });
    throw new AppError("INTERNAL_SERVER_ERROR", "Failed to retrieve department record", {
      cause: error,
    });
  }

  if (!data) return null;

  return {
    id: data.id,
    name: data.name,
    description: data.description ?? null,
  };
}

/**
 * Assigns or reassigns a complaint to an operational department.
 * Enforces admin authorization, target report existence, target department validation,
 * optimistic concurrency control via expected_department_id, duplicate no-op protection,
 * and atomic department_assignment_history persistence.
 */
export async function assignDepartment(
  input: AssignDepartmentInput,
  caller: AuthenticatedUser,
  client?: SupabaseClient
): Promise<AssignDepartmentResponseData> {
  // 1. Enforce admin role authorization
  assertAdmin(caller);

  const supabase = client ?? (await createSupabaseServerClient());

  // Determine whether optimistic locking was requested
  const checkExpected = input.expected_department_id !== undefined;

  // 2. Invoke atomic assignment RPC
  const { data, error } = await supabase.rpc("civicpulse_assign_department", {
    p_report_id: input.report_id,
    p_department_id: input.department_id,
    p_expected_department_id: input.expected_department_id ?? null,
    p_check_expected: checkExpected,
    p_reason: input.reason ?? null,
  });

  if (error) {
    const msg = error.message || "";
    const code = error.code || "";

    if (code === "P0002" || msg.includes("NOT_FOUND")) {
      if (msg.includes("Department")) {
        logger.warn("department.not_found", { status: 404 });
        throw new AppError("NOT_FOUND", "Department not found");
      }
      logger.warn("report.not_found", { status: 404 });
      throw new AppError("NOT_FOUND", "Report not found");
    }

    if (code === "23514" || msg.includes("ASSIGNMENT_CONFLICT")) {
      logger.warn("department.assignment_conflict", { status: 409 });
      const cleanMsg = msg.replace(/^.*?ASSIGNMENT_CONFLICT:\s*/, "");
      throw new AppError("CONFLICT", cleanMsg || "Department assignment conflict");
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
    throw new AppError("INTERNAL_SERVER_ERROR", "Failed to assign complaint to department", {
      cause: error,
    });
  }

  logger.info("department.assigned", { status: 200 });

  await emitRealtimeReportEvent(
    {
      event: "report_updated",
      report_id: input.report_id,
      change_type: "department_changed",
      occurred_at: new Date().toISOString(),
    },
    supabase
  );

  return data as AssignDepartmentResponseData;
}
