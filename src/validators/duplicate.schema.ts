import { z } from "zod";
import { REPORT_CATEGORIES } from "@/types/report";

/**
 * Strict Zod schema for validating citizen duplicate check requests.
 *
 * Constraints:
 * - latitude: finite number in [-90, +90]
 * - longitude: finite number in [-180, +180]
 * - category: canonical CivicPulse category enum
 * - title_hint: optional trimmed string up to 120 chars
 * - description_hint: optional trimmed string up to 1000 chars
 * - .strict() rejects any client-injected parameters (e.g. radius_meters, role, user_id, status)
 */
export const checkDuplicatesSchema = z
  .object({
    latitude: z
      .number()
      .min(-90, "Latitude must be between -90 and 90 degrees")
      .max(90, "Latitude must be between -90 and 90 degrees")
      .refine((val) => !Number.isNaN(val) && Number.isFinite(val), {
        message: "Latitude must be a finite number",
      }),
    longitude: z
      .number()
      .min(-180, "Longitude must be between -180 and 180 degrees")
      .max(180, "Longitude must be between -180 and 180 degrees")
      .refine((val) => !Number.isNaN(val) && Number.isFinite(val), {
        message: "Longitude must be a finite number",
      }),
    category: z.enum(REPORT_CATEGORIES),
    title_hint: z
      .string()
      .trim()
      .max(120, "title_hint cannot exceed 120 characters")
      .optional()
      .transform((val) => (val && val.length > 0 ? val : undefined)),
    description_hint: z
      .string()
      .trim()
      .max(1000, "description_hint cannot exceed 1000 characters")
      .optional()
      .transform((val) => (val && val.length > 0 ? val : undefined)),
  })
  .strict();

export type CheckDuplicatesPayload = z.infer<typeof checkDuplicatesSchema>;
