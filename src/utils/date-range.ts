import { AppError } from "@/utils/app-error";
import { ANALYTICS_CONFIG, type AnalyticsGranularity } from "@/config/analytics";

/**
 * Validates whether a string matches exact ISO date format (YYYY-MM-DD)
 * and represents a valid calendar date (e.g. rejects 2026-02-31).
 */
export function isValidIsoDate(dateStr: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return false;
  }

  const [yearStr, monthStr, dayStr] = dateStr.split("-");
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  const day = parseInt(dayStr, 10);

  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;

  // Use Date.UTC to verify calendar validity
  const utcDate = new Date(Date.UTC(year, month - 1, day));
  return (
    utcDate.getUTCFullYear() === year &&
    utcDate.getUTCMonth() === month - 1 &&
    utcDate.getUTCDate() === day
  );
}

/**
 * Format a Date object to YYYY-MM-DD in UTC.
 */
export function formatUtcIsoDate(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export interface ResolvedDateRange {
  start: string; // YYYY-MM-DD
  end: string; // YYYY-MM-DD
  timezone: "UTC";
  startTimestamp: string; // ISO 8601 UTC timestamp 00:00:00.000Z
  endExclusiveTimestamp: string; // ISO 8601 UTC timestamp of end + 1 day at 00:00:00.000Z
  daySpan: number;
}

/**
 * Resolves and validates start and end date parameters for analytics queries.
 *
 * Rules:
 * - If end is omitted, defaults to today in UTC.
 * - If start is omitted, defaults to end minus (DEFAULT_RANGE_DAYS - 1) days (30 days total).
 * - Interval is half-open: [start 00:00:00Z, (end + 1 day) 00:00:00Z).
 * - start must not be after end.
 * - Calendar span must not exceed maxDays (366 days).
 */
export function resolveDateRange(
  startParam?: string,
  endParam?: string,
  maxDays: number = ANALYTICS_CONFIG.MAX_RANGE_DAYS,
  referenceDate?: Date
): ResolvedDateRange {
  const now = referenceDate ?? new Date();

  let resolvedEnd = endParam;
  if (!resolvedEnd) {
    resolvedEnd = formatUtcIsoDate(now);
  } else if (!isValidIsoDate(resolvedEnd)) {
    throw new AppError(
      "VALIDATION_ERROR",
      `Invalid 'end' date parameter '${endParam}'. Expected valid YYYY-MM-DD format.`
    );
  }

  const [endY, endM, endD] = resolvedEnd.split("-").map(Number);
  const endUtc = new Date(Date.UTC(endY, endM - 1, endD));

  let resolvedStart = startParam;
  if (!resolvedStart) {
    // Default: 30 calendar days ending on resolvedEnd
    const startUtc = new Date(Date.UTC(endY, endM - 1, endD - (ANALYTICS_CONFIG.DEFAULT_RANGE_DAYS - 1)));
    resolvedStart = formatUtcIsoDate(startUtc);
  } else if (!isValidIsoDate(resolvedStart)) {
    throw new AppError(
      "VALIDATION_ERROR",
      `Invalid 'start' date parameter '${startParam}'. Expected valid YYYY-MM-DD format.`
    );
  }

  const [startY, startM, startD] = resolvedStart.split("-").map(Number);
  const startUtc = new Date(Date.UTC(startY, startM - 1, startD));

  if (startUtc.getTime() > endUtc.getTime()) {
    throw new AppError(
      "VALIDATION_ERROR",
      `'start' date (${resolvedStart}) must not be chronologically after 'end' date (${resolvedEnd}).`
    );
  }

  // Calculate inclusive calendar day span
  const msDiff = endUtc.getTime() - startUtc.getTime();
  const daySpan = Math.round(msDiff / 86_400_000) + 1;

  if (daySpan > maxDays) {
    throw new AppError(
      "VALIDATION_ERROR",
      `Requested date range (${daySpan} days) exceeds maximum allowable range of ${maxDays} days.`
    );
  }

  // Half-open interval: [start 00:00:00.000Z, (end + 1 day) 00:00:00.000Z)
  const startTimestamp = new Date(Date.UTC(startY, startM - 1, startD, 0, 0, 0, 0)).toISOString();
  const endExclusiveUtc = new Date(Date.UTC(endY, endM - 1, endD + 1, 0, 0, 0, 0));
  const endExclusiveTimestamp = endExclusiveUtc.toISOString();

  return {
    start: resolvedStart,
    end: resolvedEnd,
    timezone: "UTC",
    startTimestamp,
    endExclusiveTimestamp,
    daySpan,
  };
}

export interface ZeroFilledBucket {
  period_start: string;
  created_count: number;
  resolved_count: number;
}

/**
 * Generates continuous zero-filled time buckets between start and end date (UTC)
 * for daily, weekly, or monthly granularity.
 */
export function generateZeroFilledBuckets(
  startStr: string,
  endStr: string,
  granularity: AnalyticsGranularity
): ZeroFilledBucket[] {
  const [startY, startM, startD] = startStr.split("-").map(Number);
  const [endY, endM, endD] = endStr.split("-").map(Number);

  const startUtc = new Date(Date.UTC(startY, startM - 1, startD));
  const endUtc = new Date(Date.UTC(endY, endM - 1, endD));

  const buckets: ZeroFilledBucket[] = [];

  if (granularity === "day") {
    const current = new Date(startUtc);
    while (current <= endUtc) {
      buckets.push({
        period_start: formatUtcIsoDate(current),
        created_count: 0,
        resolved_count: 0,
      });
      current.setUTCDate(current.getUTCDate() + 1);
    }
  } else if (granularity === "week") {
    // Generate weekly intervals starting from start date
    const current = new Date(startUtc);
    while (current <= endUtc) {
      buckets.push({
        period_start: formatUtcIsoDate(current),
        created_count: 0,
        resolved_count: 0,
      });
      current.setUTCDate(current.getUTCDate() + 7);
    }
  } else if (granularity === "month") {
    // Generate monthly intervals starting with the first day of each month
    const current = new Date(Date.UTC(startY, startM - 1, 1));
    while (current <= endUtc) {
      if (current >= startUtc || buckets.length === 0) {
        buckets.push({
          period_start: formatUtcIsoDate(current),
          created_count: 0,
          resolved_count: 0,
        });
      }
      current.setUTCMonth(current.getUTCMonth() + 1);
    }
  }

  return buckets;
}

/**
 * Calculates cohort resolution rate percentage:
 * (reports created in period that are currently resolved / total reports created in period) * 100
 *
 * Returns null if createdInPeriod is 0 (safely avoids division by zero, NaN, or Infinity).
 * Rounds to 2 decimal places.
 */
export function calculateCohortResolutionRate(
  createdInPeriod: number,
  createdAndResolvedInPeriod: number
): number | null {
  if (createdInPeriod <= 0) {
    return null;
  }
  const rawRate = (createdAndResolvedInPeriod / createdInPeriod) * 100;
  return Math.round(rawRate * 100) / 100;
}

/**
 * Calculates percentage of a category or subset relative to a total.
 * Returns 0 if total is 0.
 * Rounds to 2 decimal places.
 */
export function calculatePercentage(count: number, total: number): number {
  if (total <= 0) {
    return 0;
  }
  const rawPct = (count / total) * 100;
  return Math.round(rawPct * 100) / 100;
}

/**
 * Calculates the arithmetic mean of an array of numeric durations.
 * Returns null if the array is empty.
 * Rounds to 2 decimal places.
 */
export function calculateAverage(values: number[]): number | null {
  if (values.length === 0) {
    return null;
  }
  const sum = values.reduce((acc, v) => acc + v, 0);
  const avg = sum / values.length;
  return Math.round(avg * 100) / 100;
}

/**
 * Calculates the median of an array of numeric durations (50th percentile).
 * Returns null if the array is empty.
 * Rounds to 2 decimal places.
 */
export function calculateMedian(values: number[]): number | null {
  if (values.length === 0) {
    return null;
  }
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  let median: number;
  if (sorted.length % 2 === 0) {
    median = (sorted[mid - 1] + sorted[mid]) / 2;
  } else {
    median = sorted[mid];
  }
  return Math.round(median * 100) / 100;
}
