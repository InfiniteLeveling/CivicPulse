import { z } from "zod";
import { REPORT_CATEGORIES, REPORT_SEVERITIES } from "@/types/report";
import { isValidReportStoragePath, parseDraftStoragePath } from "@/utils/storage-path";

/**
 * Zod validation schema for POST /api/reports.
 * Strictly checks input constraints, enforces whitespace rules matching database check constraints,
 * rejects privileged field injection, and accepts both backend (image_path) and frontend (imageId, visibility, confirmedSeparateFromIds) inputs.
 */
export const createReportSchema = z
  .object({
    title: z
      .string()
      .min(5, "Title must be at least 5 characters long")
      .max(120, "Title cannot exceed 120 characters")
      .refine((val) => !/^\s|\s$/.test(val), {
        message: "Title cannot have leading or trailing whitespace",
      }),

    description: z
      .string()
      .min(10, "Description must be at least 10 characters long")
      .max(1000, "Description cannot exceed 1000 characters")
      .refine((val) => !/^\s|\s$/.test(val), {
        message: "Description cannot have leading or trailing whitespace",
      }),

    category: z.enum(REPORT_CATEGORIES),

    severity: z.enum(REPORT_SEVERITIES).default("medium").optional(),

    latitude: z
      .number()
      .min(-90, "Latitude must be between -90 and 90")
      .max(90, "Latitude must be between -90 and 90")
      .refine((val) => !Number.isNaN(val) && Number.isFinite(val), {
        message: "Latitude must be a finite number",
      }),

    longitude: z
      .number()
      .min(-180, "Longitude must be between -180 and 180")
      .max(180, "Longitude must be between -180 and 180")
      .refine((val) => !Number.isNaN(val) && Number.isFinite(val), {
        message: "Longitude must be a finite number",
      }),

    image_path: z
      .string()
      .min(1, "image_path cannot be empty")
      .refine((val) => isValidReportStoragePath(val), {
        message: "image_path violates storage path format constraints",
      })
      .refine((val) => parseDraftStoragePath(val).isValid, {
        message: "image_path must follow the draft pattern: drafts/<user_id>/<image_uuid>.<ext>",
      })
      .optional(),

    imageId: z.string().trim().min(1).optional(),
    visibility: z.enum(["public", "private"]).default("public").optional(),
    confirmedSeparateFromIds: z.array(z.string()).default([]).optional(),
    analysisId: z.string().nullish().optional(),
    submission_key: z.string().uuid("submission_key must be a valid UUID").optional(),
  })
  .strict()
  .refine((data) => Boolean(data.image_path || data.imageId), {
    message: "Either image_path or imageId must be provided",
  });

export type CreateReportSchemaInput = z.infer<typeof createReportSchema>;
