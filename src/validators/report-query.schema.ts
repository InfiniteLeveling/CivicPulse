import { z } from "zod";
import {
  REPORT_CATEGORIES,
  REPORT_SEVERITIES,
  REPORT_SORT_OPTIONS,
  REPORT_STATUSES,
} from "@/types/report";

/**
 * Validates query parameters for GET /api/reports.
 * Supports pagination, filtering by category/status/severity, search, sorting, and personal/admin scopes.
 * Accepts both backend (limit, search, mine) and frontend (pageSize, q, scope="mine") parameter names.
 * Strictly rejects unknown query filters to prevent injection attacks.
 */
export const reportQuerySchema = z
  .object({
    page: z.coerce
      .number()
      .int("Page must be an integer")
      .min(1, "Page must be at least 1")
      .default(1),

    limit: z.coerce
      .number()
      .int("Limit must be an integer")
      .min(1, "Limit must be at least 1")
      .max(50, "Limit cannot exceed 50")
      .default(20),

    pageSize: z.coerce
      .number()
      .int("pageSize must be an integer")
      .min(1, "pageSize must be at least 1")
      .max(50, "pageSize cannot exceed 50")
      .optional(),

    category: z.enum(REPORT_CATEGORIES).optional(),

    status: z.enum(REPORT_STATUSES).optional(),

    severity: z.enum(REPORT_SEVERITIES).optional(),

    sort: z.enum(REPORT_SORT_OPTIONS).default("newest"),

    search: z
      .string()
      .trim()
      .max(100, "Search query cannot exceed 100 characters")
      .optional()
      .transform((val) => (val && val.length > 0 ? val : undefined)),

    q: z
      .string()
      .trim()
      .max(100, "q query cannot exceed 100 characters")
      .optional()
      .transform((val) => (val && val.length > 0 ? val : undefined)),

    mine: z.preprocess((val) => {
      if (typeof val === "boolean") return val;
      if (val === "true" || val === "1") return true;
      return false;
    }, z.boolean().default(false)),

    scope: z.enum(["admin", "mine"]).optional(),
  })
  .strict()
  .transform((val) => ({
    ...val,
    limit: val.pageSize ?? val.limit,
    search: val.q ?? val.search,
    mine: val.scope === "mine" ? true : val.mine,
    scope: val.scope === "admin" ? ("admin" as const) : undefined,
  }));

export type ReportQuerySchemaInput = z.infer<typeof reportQuerySchema>;

/**
 * Validates dynamic route parameter for GET /api/reports/[id].
 */
export const reportIdParamSchema = z.object({
  id: z.string().uuid("Invalid complaint ID format. Must be a valid UUID."),
});
