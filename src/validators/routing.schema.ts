import { z } from "zod";

/**
 * Strict schema for administrative routing retry requests (POST /api/admin/route).
 * Prevents injection of client-supplied department IDs, assignment sources, or roles.
 */
export const adminRouteReportSchema = z
  .object({
    report_id: z.string().uuid("Invalid report UUID"),
    expected_department_id: z
      .string()
      .uuid("Invalid expected department UUID")
      .nullable()
      .optional(),
  })
  .strict();

export type AdminRouteReportSchema = z.infer<typeof adminRouteReportSchema>;

/**
 * Validates that untrusted client inputs do not attempt to forge protected routing fields.
 */
export const routingForbiddenFieldsSchema = z
  .object({
    assignment_source: z.never({
      message: "assignment_source is server-controlled and cannot be set by client",
    }),
    manual_override: z.never({
      message: "manual_override is server-controlled and cannot be set by client",
    }),
    department_id: z.never({
      message: "department_id cannot be directly assigned during complaint submission",
    }),
  })
  .partial();
