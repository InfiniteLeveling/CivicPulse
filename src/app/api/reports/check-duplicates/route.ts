import { NextRequest } from "next/server";
import { requireUser } from "@/services/auth.service";
import { checkDuplicateReports } from "@/services/duplicate.service";
import { errorResponse, successResponse } from "@/utils/api-response";
import { AppError } from "@/utils/app-error";
import { logger } from "@/utils/logger";
import { checkDuplicatesSchema } from "@/validators/duplicate.schema";
import { enforceRateLimit } from "@/utils/rate-limit";

export const dynamic = "force-dynamic";

/**
 * POST /api/reports/check-duplicates
 *
 * Geographical Duplicate Complaint Detection Endpoint.
 *
 * Requirements:
 * 1. Authentication: Requires authenticated citizen session via SSR cookies (`requireUser()`).
 * 2. Input Validation: Strictly validates latitude, longitude, and canonical category via Zod.
 * 3. Server-Controlled Radius: Fixed at 100 meters using the mathematical Haversine formula.
 * 4. Advisory Suggestions Only: Returns potential matching complaints for citizen review;
 *    does NOT create, merge, delete, or auto-upvote any reports.
 * 5. Privacy & Data Projection: Returns safe summary fields only (id, title, category, status,
 *    distance_meters, created_at). Never discloses private identities, contact details, or notes.
 * 6. Read-Only Operation: Performs discovery queries without mutating database state.
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Verify authenticated citizen session
    const user = await requireUser();

    // 2. Abuse Prevention: Rate limit proximity scans (max 60 per minute)
    enforceRateLimit(`duplicates:${user.id}`, 60, 60);

    // 3. Parse JSON body
    let rawBody: unknown;
    try {
      rawBody = await request.json();
    } catch {
      throw new AppError("VALIDATION_ERROR", "Malformed JSON request body");
    }

    // 3. Strict schema validation
    const validationResult = checkDuplicatesSchema.safeParse(rawBody);
    if (!validationResult.success) {
      const firstIssue = validationResult.error.issues[0];
      const message = firstIssue?.message || "Invalid duplicate check request parameters";
      logger.warn("duplicate.validation_failed", { status: 422 });
      throw new AppError("VALIDATION_ERROR", message);
    }

    // 4. Execute duplicate detection service
    const duplicateData = await checkDuplicateReports(validationResult.data, user);

    // Map candidates for frontend compatibility
    const candidates = (duplicateData.matches || []).map((m: any) => ({
      id: m.id,
      reference: m.reference ?? m.id.slice(0, 8).toUpperCase(),
      title: m.title,
      category: m.category,
      status: m.status,
      distanceMeters: m.distance_meters,
      supportCount: m.support_count ?? 0,
      imageUrl: m.image_url ?? null,
    }));

    // 5. Return standardized HTTP 200 response envelope with Cache-Control: no-store
    return successResponse({
      ...duplicateData,
      candidates,
      potential_duplicates: duplicateData.matches,
    }, {
      status: 200,
      message: duplicateData.has_potential_duplicates
        ? "Potential nearby complaints found"
        : "No potential nearby duplicates found",
    });
  } catch (error) {
    return errorResponse(error);
  }
}
