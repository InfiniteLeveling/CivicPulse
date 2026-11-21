import { REPORT_CATEGORIES } from "@/types/report";

export const ANALYTICS_CONFIG = {
  /**
   * Default time window in calendar days when no start/end is specified (last 30 calendar days).
   */
  DEFAULT_RANGE_DAYS: 30,

  /**
   * Maximum permitted time window in calendar days to prevent excessive database scanning (366 days).
   */
  MAX_RANGE_DAYS: 366,

  /**
   * Default time-series aggregation granularity.
   */
  DEFAULT_GRANULARITY: "day",

  /**
   * Allowed time-series aggregation granularities.
   */
  ALLOWED_GRANULARITIES: ["day", "week", "month"] as const,

  /**
   * Threshold for aging complaint backlog analysis (7 calendar days).
   */
  AGING_BACKLOG_THRESHOLD_DAYS: 7,

  /**
   * Default limit of top priority complaints returned for operational insights.
   */
  DEFAULT_PRIORITIES_LIMIT: 5,

  /**
   * Maximum allowed limit of top priority complaints.
   */
  MAX_PRIORITIES_LIMIT: 20,

  /**
   * Canonical categories for civic complaints.
   */
  CANONICAL_CATEGORIES: REPORT_CATEGORIES,
} as const;

export type AnalyticsGranularity = (typeof ANALYTICS_CONFIG.ALLOWED_GRANULARITIES)[number];
