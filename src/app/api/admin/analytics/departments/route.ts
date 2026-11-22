import { NextRequest } from "next/server";
import { requireAdmin } from "@/services/auth.service";
import { getDepartmentAnalytics } from "@/services/analytics.service";
import { errorResponse, successResponse } from "@/utils/api-response";
import { AppError } from "@/utils/app-error";
import { logger } from "@/utils/logger";

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
 * GET /api/admin/analytics/departments
 *
 * Privileged department workload distribution endpoint.
 *
 * Requirements:
 * - Requires authenticated administrator session (requireAdmin).
 * - Rejects unauthorized injection query parameters.
 * - Groups active complaints ('pending', 'in_progress') across all registered departments.
 * - Surfaces unassigned active complaint backlog.
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
    const data = await getDepartmentAnalytics(caller);
    return successResponse(data);
  } catch (error) {
    return errorResponse(error);
  }
}
