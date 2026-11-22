import { NextRequest } from "next/server";
import { getCurrentProfile, getCurrentUser, requireAdmin, requireUser } from "@/services/auth.service";
import { createReport } from "@/services/report.service";
import { listReports } from "@/services/report-query.service";
import { errorResponse, successResponse } from "@/utils/api-response";
import { AppError } from "@/utils/app-error";
import { logger } from "@/utils/logger";
import { createReportSchema } from "@/validators/report.schema";
import { reportQuerySchema } from "@/validators/report-query.schema";

export const dynamic = "force-dynamic";

/**
 * GET /api/reports
 *
 * Complaint retrieval endpoint.
 *
 * Modes:
 * 1. Public Feed (default): Returns approved public & listed reports.
 * 2. Personal History (?mine=true): Requires authenticated citizen session; returns caller's own reports.
 * 3. Administrative Feed (?scope=admin): Requires verified admin role; returns operational reports.
 *
 * Supports pagination (page, limit), filtering (category, status, severity), search, and sorting.
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    // Security Guard: Forbid user_id spoofing via query parameters
    if (searchParams.has("user_id")) {
      logger.warn("report.validation_failed", { status: 422 });
      throw new AppError(
        "VALIDATION_ERROR",
        "Querying by user_id parameter is not permitted. Authentication session determines ownership."
      );
    }

    // Convert URLSearchParams to a plain object
    const rawQuery: Record<string, string> = {};
    for (const [key, value] of searchParams.entries()) {
      rawQuery[key] = value;
    }

    // Validate query parameters
    const queryResult = reportQuerySchema.safeParse(rawQuery);
    if (!queryResult.success) {
      const firstIssue = queryResult.error.issues[0];
      const message = firstIssue?.message || "Invalid query parameters";
      logger.warn("report.validation_failed", { status: 422 });
      throw new AppError("VALIDATION_ERROR", message);
    }

    const filter = queryResult.data;

    // Determine and enforce authentication based on requested scope
    let caller = null;
    if (filter.mine) {
      caller = await requireUser();
    } else if (filter.scope === "admin") {
      caller = await requireAdmin();
    } else {
      // Public feed: caller context is optional
      caller = await getCurrentUser();
    }

    const result = await listReports(filter, caller);

    const formattedResult = {
      ...result,
      reports: result.items,
      total: result.pagination.total,
      page: result.pagination.page,
      pageSize: result.pagination.limit,
      total_pages: result.pagination.total_pages,
    };

    return successResponse(formattedResult, {
      status: 200,
      message: "Reports retrieved successfully",
    });
  } catch (error) {
    return errorResponse(error);
  }
}

/**
 * POST /api/reports
 *
 * Citizen complaint submission endpoint.
 *
 * Requirements:
 * - Requires authenticated citizen session (via SSR cookies).
 * - Accepts JSON payload: title, description, category, latitude, longitude, image_path, optional severity, optional submission_key.
 * - Strictly rejects client attempts to inject user_id, role, status, priority_score, department_id, or resolved_at.
 * - Verifies image_path ownership against the authenticated citizen.
 * - Atomically persists report and associates the before-evidence image.
 * - Emits initial audit timeline and support vote via database triggers.
 * - Returns HTTP 201 Created with standard ApiResponse envelope.
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Verify authenticated user identity
    const user = await requireUser();

    // 2. Verify citizen profile
    const profile = await getCurrentProfile(user.id);
    if (profile.role === "admin") {
      logger.warn("report.forbidden", { status: 403 });
      throw new AppError(
        "FORBIDDEN",
        "Administrative accounts cannot submit citizen reports"
      );
    }

    // 3. Safely parse JSON request body
    let rawBody: unknown;
    try {
      rawBody = await request.json();
    } catch {
      throw new AppError("VALIDATION_ERROR", "Malformed JSON request body");
    }

    // 4. Validate input with strict schema
    const validationResult = createReportSchema.safeParse(rawBody);
    if (!validationResult.success) {
      const firstIssue = validationResult.error.issues[0];
      const message = firstIssue?.message || "Invalid complaint information";
      logger.warn("report.validation_failed", { status: 422 });
      throw new AppError("VALIDATION_ERROR", message);
    }

    const resolvedData = {
      ...validationResult.data,
      image_path: validationResult.data.image_path || (
        validationResult.data.imageId?.startsWith("drafts/")
          ? validationResult.data.imageId
          : `drafts/${user.id}/${validationResult.data.imageId}`
      ),
    };

    // 5. Delegate complaint creation and image association to report service
    const createdReport = await createReport(user.id, resolvedData as any);

    // 6. Return HTTP 201 with standardized response envelope
    return successResponse(
      {
        report: createdReport,
        ...createdReport,
      },
      {
        status: 201,
        message: "Complaint submitted successfully",
      }
    );
  } catch (error) {
    return errorResponse(error);
  }
}
