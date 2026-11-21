import { apiRequest } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";
import type { AIClassifyRequest, AIClassifyResult } from "@/types/domain";
import { aiClassifyResultSchema } from "@/lib/validation/ai";

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

  const rawData = await apiRequest<unknown, AIClassifyRequest>(endpoints.classify, {
    body: { imageId: request.imageId.trim() },
    signal: options.signal,
  });

  const parsed = aiClassifyResultSchema.safeParse(rawData);
  if (!parsed.success) {
    throw new Error("Invalid classification payload received from server.");
  }

  return parsed.data;
}
