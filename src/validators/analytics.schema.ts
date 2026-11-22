import { z } from "zod";
import { ANALYTICS_CONFIG } from "@/config/analytics";

const isoDateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must match format YYYY-MM-DD");

/**
 * Schema for standard analytics date range query parameters (overview, categories, performance).
 */
export const analyticsDateRangeSchema = z
  .object({
    start: isoDateString.optional(),
    end: isoDateString.optional(),
  })
  .strict();

export type AnalyticsDateRangeQuery = z.infer<typeof analyticsDateRangeSchema>;

/**
 * Schema for analytics trends query parameters (supports granularity).
 */
export const analyticsTrendsQuerySchema = z
  .object({
    start: isoDateString.optional(),
    end: isoDateString.optional(),
    granularity: z.enum(ANALYTICS_CONFIG.ALLOWED_GRANULARITIES).default("day"),
  })
  .strict();

export type AnalyticsTrendsQuery = z.infer<typeof analyticsTrendsQuerySchema>;

/**
 * Schema for analytics priorities query parameters.
 */
export const analyticsPrioritiesQuerySchema = z
  .object({
    limit: z
      .string()
      .optional()
      .transform((val) => (val !== undefined ? Number(val) : ANALYTICS_CONFIG.DEFAULT_PRIORITIES_LIMIT))
      .pipe(
        z
          .number()
          .int()
          .min(1, "Limit must be at least 1")
          .max(ANALYTICS_CONFIG.MAX_PRIORITIES_LIMIT, `Limit must not exceed ${ANALYTICS_CONFIG.MAX_PRIORITIES_LIMIT}`)
      ),
  })
  .strict();

export type AnalyticsPrioritiesQuery = z.infer<typeof analyticsPrioritiesQuerySchema>;
