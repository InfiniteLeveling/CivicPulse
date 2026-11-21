import "server-only";

type LogLevel = "info" | "warn" | "error";
type LogEvent =
  | "request.completed"
  | "request.failed"
  | "configuration.invalid"
  | "auth.session_missing"
  | "auth.profile_missing"
  | "auth.unauthorized"
  | "auth.forbidden"
  | "auth.callback_failed"
  | "auth.token_invalid"
  | "auth.profile_repaired"
  | "storage.upload_success"
  | "storage.upload_failed"
  | "storage.access_granted"
  | "storage.access_denied"
  | "storage.file_invalid"
  | "report.created"
  | "report.creation_failed"
  | "report.validation_failed"
  | "report.forbidden"
  | "report.duplicate_image"
  | "report.listed"
  | "report.retrieved"
  | "report.not_found"
  | "report.status_updated"
  | "report.status_conflict"
  | "report.history_retrieved"
  | "department.listed"
  | "department.assigned"
  | "department.assignment_conflict"
  | "department.not_found"
  | "storage.download_failed"
  | "gemini.unconfigured"
  | "ai.validation_failed"
  | "ai.consent_missing"
  | "ai.image_oversized"
  | "ai.not_configured"
  | "ai.classification_started"
  | "ai.classification_success"
  | "ai.classification_completed"
  | "ai.classification_error"
  | "ai.provider_error"
  | "ai.empty_response"
  | "ai.json_parse_failed"
  | "duplicate.checked"
  | "duplicate.found"
  | "duplicate.none_found"
  | "duplicate.query_failed"
  | "duplicate.validation_failed"
  | "vote.created"
  | "vote.already_supported"
  | "vote.forbidden"
  | "vote.ineligible"
  | "vote.summary_retrieved"
  | "vote.failed"
  | "priority.calculated"
  | "priority.breakdown_retrieved"
  | "priority.recalculated"
  | "priority.failed"
  | "routing.completed"
  | "routing.assigned"
  | "routing.skipped"
  | "routing.decision_failed"
  | "routing.report_not_found"
  | "routing.forbidden"
  | "routing.rpc_failed"
  | "routing.update_failed"
  | "routing.audit_failed"
  | "routing.retry_failed"
  | "routing.retry_not_found"
  | "routing.retry_conflict"
  | "routing.backfill_query_failed"
  | "routing.backfill_item_failed"
  | "routing.backfill_completed"
  | "routing.validation_failed"
  | "map.queried"
  | "map.failed"
  | "realtime.broadcast_success"
  | "realtime.broadcast_failed"
  | "evidence.uploaded"
  | "evidence.upload_failed"
  | "evidence.retrieved"
  | "evidence.required"
  | "evidence.not_found"
  | "analytics.retrieved"
  | "analytics.failed"
  | "rate_limit.exceeded"
  | "security.warning";

type LogContext = { status?: number; durationMs?: number };

// Serialize only operational counters. Request bodies, exceptions, headers and
// caller-supplied properties must never reach the log sink.
function write(level: LogLevel, event: LogEvent, context: LogContext = {}): void {
  console[level](
    JSON.stringify({
      timestamp: new Date().toISOString(),
      level,
      event,
      status: Number.isInteger(context.status) ? context.status : undefined,
      durationMs: Number.isFinite(context.durationMs) ? context.durationMs : undefined,
    })
  );
}

export const logger = {
  info: (event: LogEvent, context?: LogContext) => write("info", event, context),
  warn: (event: LogEvent, context?: LogContext) => write("warn", event, context),
  error: (event: LogEvent, context?: LogContext) => write("error", event, context),
};
