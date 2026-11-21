import { NextRequest } from "next/server";
import { getCurrentUser } from "@/services/auth.service";
import { getReportEvidence } from "@/services/evidence.service";
import { errorResponse, successResponse } from "@/utils/api-response";
import { AppError } from "@/utils/app-error";
import { logger } from "@/utils/logger";
import {
  evidenceSignedUrlQuerySchema,
  reportIdParamSchema,
} from "@/validators/evidence.schema";

export const dynamic = "force-dynamic";

/**
 * GET /api/reports/:id/evidence
 *
 * Retrieves before and after resolution photographs for a civic complaint report.
 *
 * Requirements:
 * - Validates report ID (UUID v4).
 * - Enforces role-aware visibility:
 *   - Public listed complaints are viewable by any visitor or citizen.
 *   - Private / unlisted complaints require the report owner or an administrator.
 *   - Unauthorized access attempts receive HTTP 404 NOT_FOUND.
 * - Generates short-lived signed URLs for private storage paths.
 * - Categorizes evidence into 'before_images' and 'after_images'.
 * - Returns accurate attribution notice.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;

    const idValidation = reportIdParamSchema.safeParse(resolvedParams.id);
    if (!idValidation.success) {
      const message = idValidation.error.issues[0]?.message || "Invalid report ID format";
      logger.warn("report.validation_failed", { status: 422 });
      throw new AppError("VALIDATION_ERROR", message);
    }

    const { data: reportId } = idValidation;

    // Parse query params for signed URL expiration
    const url = new URL(request.url);
    const queryValidation = evidenceSignedUrlQuerySchema.safeParse(
      Object.fromEntries(url.searchParams.entries())
    );

    const expiresIn = queryValidation.success
      ? queryValidation.data.expires_in
      : undefined;

    // Optional user session (supports anonymous visitors on public reports)
    const currentUser = await getCurrentUser();

    const evidenceData = await getReportEvidence(reportId, currentUser, expiresIn);

    return successResponse(evidenceData, {
      status: 200,
      message: "Report evidence retrieved successfully",
    });
  } catch (error) {
    return errorResponse(error);
  }
}
