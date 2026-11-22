import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { getGeminiClient, getGeminiModelName } from "@/lib/gemini";
import { downloadOwnedDraftImage } from "@/services/storage.service";
import type { AIClassifyInput, AIClassificationData } from "@/types/ai";
import { APPROVED_DEPARTMENTS } from "@/types/ai";
import { aiResponseSchema } from "@/validators/ai-response.schema";
import { CIVIC_CLASSIFICATION_SYSTEM_INSTRUCTION } from "@/config/ai-prompts";
import { AppError } from "@/utils/app-error";
import { logger } from "@/utils/logger";
import type { GoogleGenAI } from "@google/genai";

interface CustomGenAIClient {
  models: {
    generateContent: (params: unknown) => Promise<{ text?: string | null }>;
  };
}

/**
 * Analyzes an authenticated citizen's previously uploaded draft civic evidence image using Google Gemini.
 *
 * Guarantees:
 * 1. Storage Tenant Isolation: Image must be an owned draft of the authenticated caller.
 * 2. Explicit User Consent: Requires consent_to_ai_processing === true.
 * 3. Structured Output: Validated strictly against canonical categories and severities via Zod.
 * 4. Human-In-The-Loop: Suggestions are advisory only; does NOT insert reports or assign departments.
 * 5. Prompt Injection Defense: Treats image text and citizen description hints as untrusted input.
 * 6. Graceful Degradation: If AI is unconfigured or unavailable, returns structured 503 to allow manual submission.
 */
export async function classifyCivicImage(
  userId: string,
  input: AIClassifyInput,
  supabaseClient?: SupabaseClient,
  customGemini?: CustomGenAIClient | GoogleGenAI
): Promise<AIClassificationData> {
  // 1. Enforce affirmative AI processing consent
  if (input.consent_to_ai_processing !== true) {
    logger.warn("ai.consent_missing", { status: 403 });
    throw new AppError("FORBIDDEN", "Explicit consent to AI analysis is required");
  }

  // 2. Download and verify draft image ownership in private storage
  const { buffer, mimeType, sizeBytes } = await downloadOwnedDraftImage(
    userId,
    input.image_path,
    supabaseClient
  );

  // 3. Verify image size constraints (max 5MB)
  if (sizeBytes > 5 * 1024 * 1024) {
    logger.warn("ai.image_oversized", { status: 413 });
    throw new AppError("VALIDATION_ERROR", "Evidence image exceeds 5MB size limit");
  }

  // 4. Verify AI client configuration
  const ai = (customGemini as GoogleGenAI) ?? getGeminiClient();
  if (!ai) {
    logger.warn("ai.not_configured", { status: 503 });
    throw new AppError(
      "SERVICE_UNAVAILABLE",
      "AI suggestions are currently unavailable. You may proceed with manual complaint reporting."
    );
  }

  // 5. Construct multimodal request
  const base64Data = buffer.toString("base64");
  let promptText = "Please analyze this civic infrastructure photograph and provide structured suggestions.";
  if (input.description_hint) {
    promptText += `\nCitizen context hint (untrusted context): "${input.description_hint}"`;
  }

  const model = getGeminiModelName();
  logger.info("ai.classification_started");

  let responseText: string | null = null;

  try {
    // 6. Execute Gemini request with bounded timeout (15 seconds)
    let timer: NodeJS.Timeout | undefined;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        reject(new AppError("SERVICE_UNAVAILABLE", "AI analysis request timed out. Please continue manually."));
      }, 15000);
      timer.unref?.();
    });

    try {
      const callPromise = ai.models.generateContent({
        model,
        contents: [
          {
            role: "user",
            parts: [
              {
                inlineData: {
                  mimeType,
                  data: base64Data,
                },
              },
              {
                text: promptText,
              },
            ],
          },
        ],
        config: {
          systemInstruction: CIVIC_CLASSIFICATION_SYSTEM_INSTRUCTION,
          responseMimeType: "application/json",
        },
      });

      const response = (await Promise.race([callPromise, timeoutPromise])) as { text?: string | null };
      responseText = response.text ?? null;
    } finally {
      if (timer) clearTimeout(timer);
    }
  } catch (err: unknown) {
    if (err instanceof AppError) {
      throw err;
    }

    const errObj = err as { message?: string; status?: number | string; code?: number | string };
    const errMsg = errObj?.message || "";
    const errStatus = String(errObj?.status || errObj?.code || "");

    logger.error("ai.provider_error", { status: 500 });

    // Check for rate limit / quota exhaustion
    if (errStatus === "429" || errMsg.includes("RESOURCE_EXHAUSTED") || errMsg.toLowerCase().includes("quota")) {
      throw new AppError(
        "RATE_LIMITED",
        "AI rate limit reached. Please try again shortly or proceed with manual reporting."
      );
    }

    // Check for permission denied / credentials error
    if (
      errStatus === "403" ||
      errMsg.includes("PERMISSION_DENIED") ||
      errMsg.includes("API_KEY_INVALID") ||
      errMsg.includes("Permission denied")
    ) {
      throw new AppError(
        "SERVICE_UNAVAILABLE",
        "AI service credentials are restricted or invalid. Please proceed with manual reporting."
      );
    }

    // Check for upstream service unavailable
    if (errStatus === "503" || errMsg.includes("UNAVAILABLE") || errMsg.includes("Service Unavailable")) {
      throw new AppError(
        "SERVICE_UNAVAILABLE",
        "AI provider is temporarily unavailable. Please proceed with manual reporting."
      );
    }

    throw new AppError("INTERNAL_SERVER_ERROR", "Failed to generate AI suggestions from evidence image", {
      cause: err,
    });
  }

  if (!responseText) {
    logger.warn("ai.empty_response", { status: 502 });
    throw new AppError("INTERNAL_SERVER_ERROR", "AI provider returned an empty response");
  }

  // 7. Parse structured JSON safely
  let rawJson: unknown;
  try {
    rawJson = JSON.parse(responseText);
  } catch (jsonErr) {
    logger.error("ai.json_parse_failed", { status: 502 });
    throw new AppError("INTERNAL_SERVER_ERROR", "AI provider returned malformed JSON", {
      cause: jsonErr,
    });
  }

  // 8. Validate against strict schema
  const parsed = aiResponseSchema.safeParse(rawJson);
  if (!parsed.success) {
    logger.error("ai.validation_failed", { status: 502 });
    throw new AppError("INTERNAL_SERVER_ERROR", "AI suggestions failed schema validation", {
      cause: parsed.error.issues,
    });
  }

  const validated = parsed.data;

  // 9. Normalize department suggestion to approved municipal directory
  let normalizedDept = validated.department_suggestion;
  if (
    normalizedDept &&
    !APPROVED_DEPARTMENTS.includes(normalizedDept as (typeof APPROVED_DEPARTMENTS)[number])
  ) {
    normalizedDept = null;
  }

  logger.info("ai.classification_success", { status: 200 });

  return {
    category: validated.category,
    severity: validated.severity,
    title_suggestion: validated.title_suggestion,
    description_suggestion: validated.description_suggestion,
    department_suggestion: normalizedDept ?? null,
    evidence_summary: validated.evidence_summary,
    confidence_level: validated.confidence_level,
    needs_manual_review: validated.needs_manual_review,
    uncertainty_reason: validated.uncertainty_reason ?? null,
  };
}
