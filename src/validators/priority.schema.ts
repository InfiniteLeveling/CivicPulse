import { z } from "zod";

/**
 * Validates the report ID path parameter for priority queries.
 * Enforces standard RFC 4122 UUID v4 format.
 */
export const priorityReportIdParamSchema = z.object({
  id: z
    .string()
    .uuid("Invalid report ID format. Expected a valid UUID v4."),
});

export type PriorityReportIdParam = z.infer<typeof priorityReportIdParamSchema>;

/**
 * Strict schema rejecting any client attempts to inject priority or score manipulation fields.
 */
export const priorityForbiddenFieldsSchema = z
  .object({
    priority_score: z.never().optional(),
    severity_points: z.never().optional(),
    support_points: z.never().optional(),
    age_points: z.never().optional(),
    days_pending: z.never().optional(),
    vote_count: z.never().optional(),
    as_of: z.never().optional(),
  })
  .strict();
