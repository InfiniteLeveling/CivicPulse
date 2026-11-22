import { NextRequest } from "next/server";
import { getCurrentUser } from "@/services/auth.service";
import { getReportSupportSummary } from "@/services/vote.service";
import { errorResponse, successResponse } from "@/utils/api-response";
import { AppError } from "@/utils/app-error";
import { logger } from "@/utils/logger";
import { reportIdParamSchema } from "@/validators/support.schema";

export const dynamic = "force-dynamic";

/**
 * GET /api/reports/:id/support
 *
 * Dedicated Community Support Summary Endpoint.
 *
 * Requirements:
 * 1. Access: Publicly accessible for listed public complaints; contextual for private complaints.
 * 2. Authenticated Context: If user is signed in, returns their personal current_user_supported state
 *    and advisory can_support flag.
 * 3. Privacy: Completely conceals voter identities, emails, profiles, and timestamps.
 * 4. Cache Policy: Cache-Control: no-store (prevents cross-user cache contamination of personal vote states).
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 1. Resolve optional user session
    const user = await getCurrentUser();

    // 2. Validate URL report ID parameter
    const resolvedParams = await params;
    const idValidation = reportIdParamSchema.safeParse(resolvedParams.id);
    if (!idValidation.success) {
      const message = idValidation.error.issues[0]?.message || "Invalid report ID format";
      logger.warn("vote.failed", { status: 422 });
      throw new AppError("VALIDATION_ERROR", message);
    }

    const reportId = idValidation.data;

    // 3. Retrieve authorized support summary
    const summary = await getReportSupportSummary(reportId, user);

    // 4. Return HTTP 200 with standardized response envelope
    return successResponse(summary, {
      status: 200,
      message: "Support information retrieved successfully",
    });
  } catch (error) {
    return errorResponse(error);
  }
}
