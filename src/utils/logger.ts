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
  | "storage.file_invalid";

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
