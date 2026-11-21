import { z } from "zod";

const DRAFT_PATH_REGEX = /^drafts\/[0-9a-fA-F-]{36}\/[0-9a-fA-F-]{36}\.(jpg|jpeg|png|webp)$/;

/**
 * Validates request payload for POST /api/ai/classify.
 * Enforces image draft ownership path structure, explicit AI consent, and prevents
 * client injection of privileged authority fields.
 */
export const aiClassifySchema = z
  .object({
    image_path: z
      .string()
      .trim()
      .min(1, "Image path is required")
      .regex(
        DRAFT_PATH_REGEX,
        "Image path must be a valid draft storage path (e.g. drafts/<user_id>/<image_id>.<ext>)"
      )
      .refine((val) => !val.includes("..") && !val.startsWith("/") && !val.includes("\\"), {
        message: "Path traversal or malformed path detected",
      }),

    description_hint: z
      .string()
      .trim()
      .max(1000, "Description hint cannot exceed 1000 characters")
      .optional()
      .transform((val) => (val && val.length > 0 ? val : undefined)),

    consent_to_ai_processing: z
      .boolean({
        error: "consent_to_ai_processing must be a boolean",
      })
      .refine((val) => val === true, {
        message: "Explicit consent for AI analysis is required (consent_to_ai_processing must be true)",
      }),
  })
  .strict();
