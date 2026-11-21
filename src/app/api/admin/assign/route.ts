import { NextRequest } from "next/server";
import { requireAdmin } from "@/services/auth.service";
import { assignDepartment } from "@/services/department.service";
import { errorResponse, successResponse } from "@/utils/api-response";
import { AppError } from "@/utils/app-error";
import { logger } from "@/utils/logger";
import { assignDepartmentSchema } from "@/validators/assignment.schema";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/assign
 *
 * Privileged complaint department assignment and reassignment endpoint.
 *
 * Requirements:
 * - Requires authenticated administrator session (requireAdmin).
 * - Validates report_id and department_id as valid UUIDs.
 * - Supports optional expected_department_id for optimistic concurrency protection.
 * - Strictly rejects forbidden client-controlled fields (assigned_by, user_id, role, status, etc.).
 * - Atomically persists department assignment and immutable assignment history record.
 */
export async function POST(request: NextRequest) {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      logger.warn("report.validation_failed", { status: 422 });
      throw new AppError("VALIDATION_ERROR", "Malformed JSON request body");
    }

    const validation = assignDepartmentSchema.safeParse(body);
    if (!validation.success) {
      const message = validation.error.issues[0]?.message || "Invalid request payload";
      logger.warn("report.validation_failed", { status: 422 });
      throw new AppError("VALIDATION_ERROR", message);
    }

    // Privileged operation: requires verified administrator session
    const adminUser = await requireAdmin();

    const result = await assignDepartment(validation.data, adminUser);

    return successResponse(result, {
      status: 200,
      message: "Department assigned successfully",
    });
  } catch (error) {
    return errorResponse(error);
  }
}
