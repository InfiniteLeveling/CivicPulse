import { NextRequest } from "next/server";
import { requireUser } from "@/services/auth.service";
import { supportReport } from "@/services/vote.service";
import { errorResponse, successResponse } from "@/utils/api-response";
import { AppError } from "@/utils/app-error";
import { logger } from "@/utils/logger";
import { reportIdParamSchema, upvoteBodySchema } from "@/validators/support.schema";
import { enforceRateLimit } from "@/utils/rate-limit";

export const dynamic = "force-dynamic";

/**
 * POST /api/reports/:id/upvote
 *
 * Authenticated Community Support (Upvote) Endpoint.
 *
 * Requirements:
 * 1. Authentication: Requires authenticated citizen session via SSR cookies (`requireUser()`).
 * 2. Role Restriction: Only citizen accounts may support complaints (admins are observers).
 * 3. Self-Voting Policy: Report creators cannot upvote their own complaints (HTTP 403).
 * 4. Report Eligibility: Only 'pending' or 'in_progress' complaints may receive support (HTTP 409).
 * 5. One-User-One-Vote: Backed by PostgreSQL composite unique constraint (report_id, user_id).
 * 6. Idempotent Repeated Requests: Repeat support by same citizen returns HTTP 200 already_supported: true
 *    without duplicating vote rows or incrementing support counts.
 * 7. Security: Strictly rejects client-supplied user_id, role, or vote counts (HTTP 422).
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 1. Verify authenticated user identity
    const user = await requireUser();

    // 2. Abuse Prevention: Rate limit upvoting actions (max 60 per minute)
    enforceRateLimit(`upvote:${user.id}`, 60, 60);

    // 3. Validate URL report ID parameter
    const resolvedParams = await params;
    const idValidation = reportIdParamSchema.safeParse(resolvedParams.id);
    if (!idValidation.success) {
      const message = idValidation.error.issues[0]?.message || "Invalid report ID format";
      logger.warn("vote.failed", { status: 422 });
      throw new AppError("VALIDATION_ERROR", message);
    }

    const reportId = idValidation.data;

    // 3. Inspect optional body: reject any client-injected parameters
    const text = await request.text();
    if (text.trim().length > 0) {
      let rawBody: unknown;
      try {
        rawBody = JSON.parse(text);
      } catch {
        throw new AppError("VALIDATION_ERROR", "Malformed JSON request body");
      }

      const bodyValidation = upvoteBodySchema.safeParse(rawBody);
      if (!bodyValidation.success) {
        logger.warn("vote.failed", { status: 422 });
        throw new AppError(
          "VALIDATION_ERROR",
          "Client-supplied voting parameters or authority overrides are strictly rejected"
        );
      }
    }

    // 4. Execute atomic support operation
    const result = await supportReport(reportId, user);

    // 5. Return HTTP 200 if already supported, HTTP 201 if first successful support
    const httpStatus = result.already_supported ? 200 : 201;
    const message = result.already_supported
      ? "You have already supported this complaint"
      : "Complaint supported successfully";

    return successResponse(result, {
      status: httpStatus,
      message,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
