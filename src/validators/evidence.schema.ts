import { z } from "zod";
import { EVIDENCE_CONFIG } from "@/config/evidence";

/**
 * Validates report ID in URL path parameters.
 */
export const reportIdParamSchema = z
  .string()
  .uuid("Invalid report ID format. Must be a valid UUID v4.");

/**
 * Validates resolution draft storage path.
 */
export const resolutionDraftPathSchema = z
  .string()
  .trim()
  .min(1, "Resolution draft path is required")
  .max(512, "Resolution draft path cannot exceed 512 characters")
  .refine(
    (val) => /^resolution-drafts\/[0-9a-fA-F-]{36}\/[0-9a-fA-F-]{36}\/[0-9a-fA-F-]{36}\.(jpg|jpeg|png|webp)$/.test(val),
    {
      message: "Invalid resolution draft path format",
    }
  );

export const evidenceSignedUrlQuerySchema = z
  .object({
    expires_in: z.coerce
      .number()
      .int("expires_in must be an integer")
      .min(60, "expires_in must be at least 60 seconds")
      .max(
        EVIDENCE_CONFIG.MAX_SIGNED_URL_EXPIRY_SECONDS,
        `expires_in cannot exceed ${EVIDENCE_CONFIG.MAX_SIGNED_URL_EXPIRY_SECONDS} seconds`
      )
      .default(EVIDENCE_CONFIG.DEFAULT_SIGNED_URL_EXPIRY_SECONDS),
  })
  .strict();
