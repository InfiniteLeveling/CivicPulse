import { z } from "zod";
import { REPORT_STATUSES } from "@/types/report";

/**
 * Validates request payload for PATCH /api/reports/:id/status.
 * Strictly forbids client-controlled actor identity, timestamps, roles, or unauthorized fields.
 */
export const updateStatusSchema = z
  .object({
    status: z.enum(REPORT_STATUSES),
    notes: z
      .string()
      .trim()
      .max(1000, "Notes cannot exceed 1000 characters.")
      .optional()
      .transform((val) => (val && val.length > 0 ? val : undefined)),
    expected_status: z.enum(REPORT_STATUSES).optional(),
    after_image_path: z
      .string()
      .trim()
      .max(512, "after_image_path cannot exceed 512 characters.")
      .optional()
      .transform((val) => (val && val.length > 0 ? val : undefined)),
  })
  .strict();

/**
 * Validates report ID parameter in URL path.
 */
export const reportIdSchema = z
  .string()
  .uuid("Invalid report ID format. Must be a valid UUID v4.");

export type UpdateStatusInputParsed = z.infer<typeof updateStatusSchema>;
