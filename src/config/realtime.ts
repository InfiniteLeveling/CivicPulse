/**
 * CivicPulse Phase 17: Realtime Event Configuration and Channel Definitions
 */

export const REALTIME_CONFIG = {
  /** Channel topic prefix for single-report updates */
  REPORT_CHANNEL_PREFIX: "report:",

  /** Global channel for public report creations / feed invalidations */
  PUBLIC_REPORTS_CHANNEL: "reports:public",

  /** Supported high-level Realtime event names */
  EVENTS: {
    REPORT_UPDATED: "report_updated",
    REPORT_CREATED: "report_created",
  } as const,

  /** Supported change types within report events */
  CHANGE_TYPES: {
    STATUS_CHANGED: "status_changed",
    DEPARTMENT_CHANGED: "department_changed",
    RESOLUTION_COMPLETED: "resolution_completed",
    REPORT_CREATED: "report_created",
  } as const,
} as const;

/**
 * Returns the standardized private channel topic for a specific complaint report.
 * Format: report:<report_id>
 */
export function getReportChannel(reportId: string): string {
  return `${REALTIME_CONFIG.REPORT_CHANNEL_PREFIX}${reportId}`;
}

/**
 * Validates whether a topic conforms to the report-specific channel pattern.
 */
export function isValidReportChannel(topic: string): boolean {
  if (!topic || typeof topic !== "string") return false;
  const regex = /^report:[0-9a-fA-F-]{36}$/;
  return regex.test(topic);
}

/**
 * Extracts the report UUID from a report channel topic string, or null if invalid.
 */
export function extractReportIdFromChannel(topic: string): string | null {
  if (!isValidReportChannel(topic)) return null;
  return topic.substring(REALTIME_CONFIG.REPORT_CHANNEL_PREFIX.length);
}
