import { z } from "zod";
import type { IssueCategory, ReportVisibility } from "@/types/domain";

export const ISSUE_CATEGORIES = [
  "pothole",
  "garbage",
  "water_leakage",
  "streetlight",
  "drainage",
  "other",
] as const satisfies readonly IssueCategory[];

export const REPORT_VISIBILITIES = [
  "public",
  "private",
] as const satisfies readonly ReportVisibility[];

/**
 * Validation schema for Phase 7 complaint details intake.
 * Validates initial problem metadata prior to image upload (Phase 8) and location selection (Phase 10).
 */
export const reportBasicsSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Issue title is required.")
    .min(5, "Issue title must be at least 5 characters.")
    .max(120, "Issue title cannot exceed 120 characters."),
  description: z
    .string()
    .trim()
    .min(1, "Please describe the problem.")
    .min(10, "Description must be at least 10 characters long.")
    .max(1000, "Description cannot exceed 1000 characters."),
  category: z.enum(ISSUE_CATEGORIES, {
    message: "Please select an issue category.",
  }),
  visibility: z.enum(REPORT_VISIBILITIES, {
    message: "Please select report visibility.",
  }),
});

export type ReportBasicsFormValues = z.infer<typeof reportBasicsSchema>;

/**
 * Validation schema for Phase 12 final report submission.
 * Enforces all canonical requirements for POST /api/reports.
 */
export const createReportSchema = z.object({
  title: z
    .string({ message: "Issue title is required." })
    .trim()
    .min(1, "Issue title is required.")
    .min(5, "Issue title must be at least 5 characters.")
    .max(120, "Issue title cannot exceed 120 characters."),
  description: z
    .string({ message: "Please describe the problem." })
    .trim()
    .min(1, "Please describe the problem.")
    .min(10, "Description must be at least 10 characters long.")
    .max(1000, "Description cannot exceed 1000 characters."),
  category: z.enum(ISSUE_CATEGORIES, {
    message: "Please select an issue category.",
  }),
  visibility: z.enum(REPORT_VISIBILITIES, {
    message: "Please select report visibility.",
  }),
  latitude: z
    .number({ message: "Latitude must be a valid number." })
    .refine((n) => Number.isFinite(n), "Latitude must be a finite number.")
    .refine((n) => !Number.isNaN(n), "Latitude cannot be NaN.")
    .min(-90, "Latitude cannot be less than -90 degrees.")
    .max(90, "Latitude cannot exceed 90 degrees."),
  longitude: z
    .number({ message: "Longitude must be a valid number." })
    .refine((n) => Number.isFinite(n), "Longitude must be a finite number.")
    .refine((n) => !Number.isNaN(n), "Longitude cannot be NaN.")
    .min(-180, "Longitude cannot be less than -180 degrees.")
    .max(180, "Longitude cannot exceed 180 degrees."),
  imageId: z
    .string({ message: "A valid uploaded image ID is required." })
    .trim()
    .min(1, "A valid uploaded image ID is required.")
    .refine(
      (id) => !id.startsWith("blob:") && !id.startsWith("data:") && !id.startsWith("http:") && !id.startsWith("https:"),
      {
        message: "Image ID must be a server-returned identifier, not a local URL.",
      }
    ),
  analysisId: z
    .string()
    .trim()
    .min(1)
    .nullish()
    .transform((val) => val ?? null),
  confirmedSeparateFromIds: z
    .array(z.string().trim().min(1))
    .default([])
    .transform((arr) => Array.from(new Set(arr))),
});

export type CreateReportSchema = z.infer<typeof createReportSchema>;

export function validateCreateReport(data: unknown): CreateReportSchema {
  return createReportSchema.parse(data);
}

export function safeValidateCreateReport(data: unknown) {
  return createReportSchema.safeParse(data);
}
