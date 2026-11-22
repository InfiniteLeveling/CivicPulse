import { NextRequest } from "next/server";
import { getCurrentUser } from "@/services/auth.service";
import { getReportStatusHistory } from "@/services/status.service";
import { errorResponse, successResponse } from "@/utils/api-response";
import { AppError } from "@/utils/app-error";
import { logger } from "@/utils/logger";
import { reportIdSchema } from "@/validators/status.schema";

export const dynamic = "force-dynamic";

/**
 * GET /api/reports/:id/history
 *
 * Chronological status audit history retrieval endpoint.
 *
 * Requirements:
 * - Validates report ID format as UUID v4.
 * - Extracts optional caller context from session cookies.
 * - Enforces role-aware data boundaries:
 *   - Public / Citizen: Returns chronological status events and versions. Notes and changed_by are strictly omitted.
 *   - Admin: Full timeline including administrative notes and actor UUIDs.
 *   - Unauthorized / Hidden / Nonexistent: Concealed with HTTP 404 NOT_FOUND.
 */
export async function GET(
  _request: NextRequest,
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

    // Optional caller context (supports public, citizen owner, and admin access)
    const caller = await getCurrentUser();

    const result = await getReportStatusHistory(reportId, caller);

    return successResponse(result, {
      status: 200,
      message: "Status history retrieved successfully",
    });
  } catch (error) {
    return errorResponse(error);
  }
}
