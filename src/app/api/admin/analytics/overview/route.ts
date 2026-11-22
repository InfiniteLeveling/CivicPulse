import { NextRequest } from "next/server";
import { requireAdmin } from "@/services/auth.service";
import { getOverviewAnalytics } from "@/services/analytics.service";
import { errorResponse, successResponse } from "@/utils/api-response";
import { AppError } from "@/utils/app-error";
import { logger } from "@/utils/logger";
import { analyticsDateRangeSchema } from "@/validators/analytics.schema";

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
 * GET /api/admin/analytics/overview
 *
 * Privileged KPI summary metrics endpoint.
 *
 * Requirements:
 * - Requires authenticated administrator session (requireAdmin).
 * - Rejects unauthorized injection query parameters.
 * - Validates date range parameters (default: last 30 calendar days).
 * - Computes all-time total, period creation/resolution counts, active backlog,
 *   unassigned count, and cohort resolution rate.
 * - Returns HTTP 200 with Cache-Control: no-store.
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    // Security Defense: Disallow client attempts to forge authorization parameters
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

    const validationResult = analyticsDateRangeSchema.safeParse(rawQuery);
    if (!validationResult.success) {
      const message = validationResult.error.issues[0]?.message || "Invalid analytics query parameters";
      logger.warn("analytics.failed", { status: 422 });
      throw new AppError("VALIDATION_ERROR", message);
    }

    const data = await getOverviewAnalytics(validationResult.data, caller);
    return successResponse(data);
  } catch (error) {
    return errorResponse(error);
  }
}
