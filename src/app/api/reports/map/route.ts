import { NextRequest } from "next/server";
import { getCurrentUser } from "@/services/auth.service";
import { getMapMarkers } from "@/services/map.service";
import { errorResponse, successResponse } from "@/utils/api-response";
import { AppError } from "@/utils/app-error";
import { logger } from "@/utils/logger";
import { mapQuerySchema } from "@/validators/map-query.schema";

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
 * GET /api/reports/map
 *
 * Geographic viewport complaint marker retrieval endpoint.
 *
 * Requirements:
 * - Accepts mandatory geographic viewport boundaries (south, west, north, east).
 * - Strictly validates coordinates, latitude ordering, and viewport size limits.
 * - Supports International Date Line (antimeridian) crossing viewports (west > east).
 * - Enforces database-side spatial filtering in PostgreSQL.
 * - Protects report privacy: public visitors and citizens only see public, listed reports.
 * - Excludes private user profiles, emails, voter identities, and storage paths.
 * - Supports optional category, status, severity, department, and limit filtering.
 * - Bounded marker count (default 200, max 300) with accurate has_more overflow indicator.
 * - Returns HTTP 200 with Cache-Control: no-store.
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    // Security Defense: Disallow client attempts to forge authorization parameters
    for (const forbidden of FORBIDDEN_QUERY_PARAMS) {
      if (searchParams.has(forbidden)) {
        logger.warn("map.failed", { status: 422 });
        throw new AppError(
          "VALIDATION_ERROR",
          `Unauthorized query parameter '${forbidden}' is not permitted`
        );
      }
    }

    // Convert searchParams to a plain object
    const rawQuery: Record<string, string> = {};
    for (const [key, value] of searchParams.entries()) {
      rawQuery[key] = value;
    }

    const validationResult = mapQuerySchema.safeParse(rawQuery);
    if (!validationResult.success) {
      const firstIssue = validationResult.error.issues[0];
      const message = firstIssue?.message || "Invalid map query parameters";
      logger.warn("map.failed", { status: 422 });
      throw new AppError("VALIDATION_ERROR", message);
    }

    const filter = validationResult.data;

    // Contextual authentication: anonymous visitors, citizens, or admins
    const caller = await getCurrentUser();

    const data = await getMapMarkers(filter, caller);

    const message =
      data.markers.length > 0
        ? "Map reports retrieved successfully"
        : "No reports found in this map area";

    return successResponse(data, {
      status: 200,
      message,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
