import { NextRequest } from "next/server";
import { requireAdmin } from "@/services/auth.service";
import { updateReportStatus } from "@/services/status.service";
import { errorResponse, successResponse } from "@/utils/api-response";
import { AppError } from "@/utils/app-error";
import { logger } from "@/utils/logger";
import { reportIdSchema, updateStatusSchema } from "@/validators/status.schema";

export const dynamic = "force-dynamic";

/**
 * PATCH /api/reports/:id/status
 *
 * Privileged complaint status update endpoint.
 *
 * Requirements:
 * - Requires authenticated administrator (assertAdmin / requireAdmin).
 * - Validates report ID format as UUID v4.
 * - Validates request body (status enum, optional notes <= 1000 chars, optional expected_status).
 * - Strictly rejects forbidden client-controlled fields (changed_by, user_id, role, resolved_at).
 * - Enforces state transitions (pending -> in_progress -> resolved).
 * - Detects optimistic concurrency conflicts via expected_status (HTTP 409).
 * - Atomically persists status update, manages resolved_at, and creates immutable audit record.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;

    const idValidation = reportIdSchema.safeParse(resolvedParams.id);
    if (!idValidation.success) {
      const message = idValidation.error.issues[0]?.message || "Invalid report ID format";
      logger.warn("report.validation_failed", { status: 422 });
      throw new AppError("VALIDATION_ERROR", message);
    }

    const { data: reportId } = idValidation;

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      logger.warn("report.validation_failed", { status: 422 });
      throw new AppError("VALIDATION_ERROR", "Malformed JSON request body");
    }

    const bodyValidation = updateStatusSchema.safeParse(body);
    if (!bodyValidation.success) {
      const message = bodyValidation.error.issues[0]?.message || "Invalid request body";
      logger.warn("report.validation_failed", { status: 422 });
      throw new AppError("VALIDATION_ERROR", message);
    }

    // Privileged operation: requires verified administrator session
    const adminUser = await requireAdmin();

    const result = await updateReportStatus(reportId, bodyValidation.data, adminUser);

    return successResponse(result, {
      status: 200,
      message: "Complaint status updated successfully",
    });
  } catch (error) {
    return errorResponse(error);
  }
}
