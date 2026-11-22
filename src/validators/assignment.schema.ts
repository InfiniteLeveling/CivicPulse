import { z } from "zod";

/**
 * Validates request payload for POST /api/admin/assign.
 * Strictly forbids client-controlled actor identity, timestamps, roles, status, or unauthorized fields.
 */
export const assignDepartmentSchema = z
  .object({
    report_id: z.string().uuid("Invalid report ID format. Must be a valid UUID v4."),
    department_id: z.string().uuid("Invalid department ID format. Must be a valid UUID v4."),
    expected_department_id: z
      .string()
      .uuid("Invalid expected department ID format. Must be a valid UUID v4.")
      .nullable()
      .optional(),
    reason: z
      .string()
      .trim()
      .max(1000, "Reason cannot exceed 1000 characters.")
      .optional()
      .transform((val) => (val && val.length > 0 ? val : undefined)),
  })
  .strict();

export type AssignDepartmentInputParsed = z.infer<typeof assignDepartmentSchema>;
