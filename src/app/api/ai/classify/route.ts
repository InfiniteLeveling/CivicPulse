import { NextRequest } from "next/server";
import { requireUser } from "@/services/auth.service";
import { classifyCivicImage } from "@/services/ai.service";
import { errorResponse, successResponse } from "@/utils/api-response";
import { AppError } from "@/utils/app-error";
import { logger } from "@/utils/logger";
import { aiClassifySchema } from "@/validators/ai.schema";
import { enforceRateLimit } from "@/utils/rate-limit";

export const dynamic = "force-dynamic";

/**
 * POST /api/ai/classify
 *
 * AI Multimodal Image Classification & Smart Complaint Suggestion Endpoint.
 *
 * Requirements:
 * 1. Authentication: Requires authenticated citizen session via SSR cookies (`requireUser()`).
 * 2. Privacy & Consent: Requires explicit affirmative consent (`consent_to_ai_processing === true`).
 * 3. Tenant Isolation: Validates that `image_path` belongs to the authenticated user's drafts.
 * 4. Advisory Only: Returns editable suggestions (category, severity, title, description, department).
 *    Does NOT create reports, update database state, or assign departments.
 * 5. Prompt Injection Defense: Treats image and description hint as untrusted input.
 * 6. Graceful Degradation: If AI is unconfigured or unavailable, returns structured 503 so
 *    the citizen can proceed with manual complaint reporting.
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Verify authenticated user identity
    const user = await requireUser();

    // 2. Abuse Prevention: Rate limit expensive AI multimodal classifications (max 30 per minute)
    enforceRateLimit(`ai:${user.id}`, 30, 60);

    // 3. Parse JSON body
    let rawBody: unknown;
    try {
      rawBody = await request.json();
    } catch {
      throw new AppError("VALIDATION_ERROR", "Malformed JSON request body");
    }

    // 3. Validate input with strict schema
    const validationResult = aiClassifySchema.safeParse(rawBody);
    if (!validationResult.success) {
      const firstIssue = validationResult.error.issues[0];
      const message = firstIssue?.message || "Invalid AI classification request parameters";
      logger.warn("ai.validation_failed", { status: 422 });
      throw new AppError("VALIDATION_ERROR", message);
    }

    // 4. Delegate to AI service for verified download and multimodal analysis
    const suggestions = await classifyCivicImage(user.id, validationResult.data);

    const analysisId = crypto.randomUUID();
    const isCivicIssue = !(
      suggestions.category === "other" &&
      suggestions.needs_manual_review &&
      /no civic|not a civic|unrelated|selfie|document|indoor/i.test(
        `${suggestions.uncertainty_reason ?? ""} ${suggestions.evidence_summary ?? ""}`
      )
    );

    // 5. Return HTTP 200 with standardized response envelope including frontend contract fields
    return successResponse(
      {
        ...suggestions,
        analysisId,
        description: suggestions.description_suggestion,
        isCivicIssue,
      },
      {
        status: 200,
        message: "AI suggestions generated successfully",
      }
    );
  } catch (error) {
    return errorResponse(error);
  }
}
