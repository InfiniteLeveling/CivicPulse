import { NextRequest } from "next/server";
import { requireAdmin } from "@/services/auth.service";
import { getPriorityInsights } from "@/services/analytics.service";
import { errorResponse, successResponse } from "@/utils/api-response";
import { AppError } from "@/utils/app-error";
import { logger } from "@/utils/logger";
import { analyticsPrioritiesQuerySchema } from "@/validators/analytics.schema";

export const dynamic = "force-dynamic";

const FORBIDDEN_QUERY_PARAMS = [
  "user_id",
  "role",
  "is_admin",
  "bypass_rls",
  "include_private",
  "raw_sql",
] as const;

/**
 * GET /api/admin/analytics/priorities
 *
 * Privileged operational priority rankings endpoint.
 *
 * Requirements:
 * - Requires authenticated administrator session (requireAdmin).
 * - Rejects unauthorized injection query parameters.
 * - Validates limit parameter (1 <= limit <= 20, default 5).
 * - Returns top active complaints ranked by priority_score DESC, created_at ASC.
 * - Computes average active priority and max active priority across active backlog.
 * - Returns HTTP 200 with Cache-Control: no-store.
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    for (const forbidden of FORBIDDEN_QUERY_PARAMS) {
      if (searchParams.has(forbidden)) {
        logger.warn("analytics.failed", { status: 422 });
        throw new AppError(
          "VALIDATION_ERROR",
          `Unauthorized query parameter '${forbidden}' is not permitted`
        );
      }
    }

    const caller = await requireAdmin();

    const rawQuery: Record<string, string> = {};
    for (const [key, value] of searchParams.entries()) {
      rawQuery[key] = value;
    }

    const validationResult = analyticsPrioritiesQuerySchema.safeParse(rawQuery);
    if (!validationResult.success) {
      const message = validationResult.error.issues[0]?.message || "Invalid priority analytics query parameters";
      logger.warn("analytics.failed", { status: 422 });
      throw new AppError("VALIDATION_ERROR", message);
    }

    const data = await getPriorityInsights(validationResult.data, caller);
    return successResponse(data);
  } catch (error) {
    return errorResponse(error);
  }
}
