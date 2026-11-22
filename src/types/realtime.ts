/**
 * CivicPulse Phase 17: Supabase Realtime Type Definitions
 */

export type RealtimeEventType = "report_updated" | "report_created";

export type RealtimeChangeType =
  | "status_changed"
  | "department_changed"
  | "resolution_completed"
  | "report_created";

/**
 * Standard minimal Realtime event payload.
 * Intentionally contains zero sensitive fields (no citizen emails, no signed URLs,
 * no private notes, and no raw image bytes). Serves purely as a refresh hint.
 */
export interface RealtimeReportEventPayload {
  event: RealtimeEventType;
  report_id: string;
  change_type: RealtimeChangeType;
  occurred_at: string; // ISO 8601
}

export type RealtimeSubscriptionStatus =
  | "SUBSCRIBED"
  | "TIMED_OUT"
  | "CLOSED"
  | "CHANNEL_ERROR";

export interface RealtimeChannelAuthorization {
  authorized: boolean;
  reason?: string;
}
