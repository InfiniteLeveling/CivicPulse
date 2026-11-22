import { NextRequest } from "next/server";
import { getCurrentUser } from "@/services/auth.service";
import { getReportPriority } from "@/services/priority.service";
import { priorityReportIdParamSchema } from "@/validators/priority.schema";
import { errorResponse, successResponse } from "@/utils/api-response";
import { AppError } from "@/utils/app-error";
import { logger } from "@/utils/logger";

export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/reports/:id/priority
 *
 * Retrieves the authoritative, explainable priority score breakdown for a complaint.
 * Public/contextual:
 * - Public listed complaints are viewable by any citizen or anonymous visitor.
 * - Private/unlisted complaints are viewable only by their owner or an administrator.
 * - Inaccessible complaints return HTTP 404 NOT_FOUND (preventing existence probing).
 */
export async function GET(
  _request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;

    const parsedParams = priorityReportIdParamSchema.safeParse({ id });
    if (!parsedParams.success) {
      const message = parsedParams.error.issues[0]?.message || "Invalid report ID parameter";
      logger.warn("priority.failed", { status: 422 });
      throw new AppError("VALIDATION_ERROR", message);
    }

    const user = await getCurrentUser();
    const priorityData = await getReportPriority(parsedParams.data.id, user);

    return successResponse(priorityData, {
      message: "Priority breakdown retrieved successfully",
    });
  } catch (error) {
    return errorResponse(error);
  }
}
