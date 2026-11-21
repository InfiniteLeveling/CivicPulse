import { NextRequest } from "next/server";
import { requireAdmin } from "@/services/auth.service";
import { retryAutomaticRouting } from "@/services/routing.service";
import { errorResponse, successResponse } from "@/utils/api-response";
import { AppError } from "@/utils/app-error";
import { logger } from "@/utils/logger";
import { adminRouteReportSchema } from "@/validators/routing.schema";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/route
 *
 * Privileged administrative endpoint to retry or re-evaluate automatic routing for a complaint.
 *
 * Requirements:
 * - Requires authenticated administrator session (requireAdmin).
 * - Validates report_id (UUID v4) and optional expected_department_id (UUID v4 or null).
 * - Strictly rejects forbidden client-controlled fields (department_id, assignment_source, manual_override, role, etc.).
 * - Preserves manual override precedence: cannot overwrite manual administrator assignments.
 * - Idempotent: returns existing assignment if complaint is already routed to target department.
 * - Returns standardized RoutingResult.
 */
export async function POST(request: NextRequest) {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      logger.warn("routing.validation_failed", { status: 422 });
      throw new AppError("VALIDATION_ERROR", "Malformed JSON request body");
    }

    const validation = adminRouteReportSchema.safeParse(body);
    if (!validation.success) {
      const message = validation.error.issues[0]?.message || "Invalid request payload";
      logger.warn("routing.validation_failed", { status: 422 });
      throw new AppError("VALIDATION_ERROR", message);
    }

    // Privileged operation: requires verified administrator session
    const adminUser = await requireAdmin();

    const result = await retryAutomaticRouting(validation.data, adminUser);

    return successResponse(result, {
      status: 200,
      message: result.message,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
