import { apiRequest } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";
import type { AIClassifyRequest, AIClassifyResult } from "@/types/domain";
import { aiClassifyResultSchema } from "@/lib/validation/ai";

interface BackendAIClassifyPayload {
  image_path: string;
  consent_to_ai_processing: boolean;
  description_hint?: string;
}

interface RawAIClassifyResponse {
  analysisId?: string;
  category?: string;
  severity?: string;
  description?: string;
  description_suggestion?: string;
  isCivicIssue?: boolean;
  needs_manual_review?: boolean;
}

/**
 * Sends a server-returned image ID to POST /api/ai/classify for structured Gemini analysis.
 * The browser never contacts Gemini directly or passes API keys.
 */
export async function classifyIssueImage(
  request: AIClassifyRequest,
  options: { signal?: AbortSignal } = {}
): Promise<AIClassifyResult> {
  if (!request.imageId || !request.imageId.trim()) {
    throw new TypeError("An image identifier is required to analyze an image.");
  }

  const trimmedHint = request.descriptionHint?.trim();
  const payload: BackendAIClassifyPayload = {
    image_path: request.imageId.trim(),
    consent_to_ai_processing: request.consent ?? true,
    ...(trimmedHint ? { description_hint: trimmedHint.slice(0, 1000) } : {}),
  };

  const rawData = await apiRequest<RawAIClassifyResponse, BackendAIClassifyPayload>(
    endpoints.classify,
    {
      body: payload,
      signal: options.signal,
    }
  );

  const normalizedCategory =
    rawData?.category === "damaged_infrastructure" ? "other" : rawData?.category;

  const normalized = {
    analysisId: rawData?.analysisId || crypto.randomUUID(),
    category: normalizedCategory,
    severity: rawData?.severity,
    description: rawData?.description ?? rawData?.description_suggestion,
    isCivicIssue:
      typeof rawData?.isCivicIssue === "boolean"
        ? rawData.isCivicIssue
        : !rawData?.needs_manual_review || normalizedCategory !== "other",
  };

  const parsed = aiClassifyResultSchema.safeParse(normalized);
  if (!parsed.success) {
    throw new Error("Invalid classification payload received from server.");
  }

  return parsed.data;
}
