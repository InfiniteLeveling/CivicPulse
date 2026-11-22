import { NextRequest } from "next/server";
import { getCurrentUser } from "@/services/auth.service";
import { getReportById } from "@/services/report-query.service";
import { errorResponse, successResponse } from "@/utils/api-response";
import { AppError } from "@/utils/app-error";
import { logger } from "@/utils/logger";
import { reportIdParamSchema } from "@/validators/report-query.schema";

export const dynamic = "force-dynamic";

/**
 * GET /api/reports/:id
 *
 * Complaint detail retrieval endpoint.
 *
 * Requirements:
 * - Validates report ID as a UUID.
 * - Extracts caller context from session cookies if authenticated.
 * - Enforces role-aware data boundaries:
 *   - Citizen Owner and Admin: Full authorized complaint details including publication, visibility, and images.
 *   - Public Visitor: Safe public projection only if report is marked public & listed.
 *   - Unauthorized / Missing: Returns HTTP 404 NOT_FOUND without disclosing whether a private record exists.
 * - Returns HTTP 200 with standard ApiResponse envelope.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;

    const validationResult = reportIdParamSchema.safeParse(resolvedParams);
    if (!validationResult.success) {
      const message = validationResult.error.issues[0]?.message || "Invalid complaint ID";
      logger.warn("report.validation_failed", { status: 422 });
      throw new AppError("VALIDATION_ERROR", message);
    }

    const { id } = validationResult.data;

    // Optional authentication context: supports anonymous public view as well as authenticated owner/admin view
    const caller = await getCurrentUser();

    const reportDetail = await getReportById(id, caller);

    return successResponse(reportDetail, {
      status: 200,
      message: "Report details retrieved successfully",
    });
  } catch (error) {
    return errorResponse(error);
  }
}
