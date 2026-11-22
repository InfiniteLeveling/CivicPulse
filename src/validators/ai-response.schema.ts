import { z } from "zod";
import { REPORT_CATEGORIES, REPORT_SEVERITIES } from "@/types/report";
import { AI_CONFIDENCE_LEVELS } from "@/types/ai";

/**
 * Validates structured JSON returned by Google Gemini.
 * Protects application against malformed output, unsupported categories,
 * invalid severities, or prompt injection alterations.
 */
export const aiResponseSchema = z
  .object({
    category: z.enum(REPORT_CATEGORIES),
    severity: z.enum(REPORT_SEVERITIES),
    title_suggestion: z
      .string()
      .trim()
      .min(5, "Title must be at least 5 characters")
      .max(120, "Title cannot exceed 120 characters"),
    description_suggestion: z
      .string()
      .trim()
      .min(10, "Description must be at least 10 characters")
      .max(2000, "Description cannot exceed 2000 characters"),
    department_suggestion: z.string().trim().nullable().optional(),
    evidence_summary: z
      .string()
      .trim()
      .min(5, "Evidence summary must be at least 5 characters")
      .max(500, "Evidence summary cannot exceed 500 characters"),
    confidence_level: z.enum(AI_CONFIDENCE_LEVELS),
    needs_manual_review: z.boolean(),
    uncertainty_reason: z.string().trim().max(500).nullable().optional(),
  })
  .strict();
