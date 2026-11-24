import "server-only";

import { GoogleGenAI } from "@google/genai";
import { logger } from "@/utils/logger";

let cachedClient: GoogleGenAI | null = null;

export function getGeminiApiKey(): string | null {
  const key = process.env.GEMINI_API_KEY;
  if (!key || key.trim().length === 0) {
    return null;
  }
  return key.trim();
}

export function getGeminiModelName(): string {
  const model = process.env.GEMINI_MODEL;
  if (model && model.trim().length > 0) {
    return model.trim();
  }
  return "gemini-3-flash-preview";
}

/**
 * Returns an initialized GoogleGenAI instance or null if unconfigured.
 * Server-only. Credentials are never leaked to client or logs.
 */
export function getGeminiClient(): GoogleGenAI | null {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    logger.warn("gemini.unconfigured");
    return null;
  }

  if (!cachedClient) {
    cachedClient = new GoogleGenAI({
      apiKey,
      httpOptions: { apiVersion: "v1beta" },
    });
  }

  return cachedClient;
}
