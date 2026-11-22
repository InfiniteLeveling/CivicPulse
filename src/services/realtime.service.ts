import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { REALTIME_CONFIG, getReportChannel } from "@/config/realtime";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { RealtimeReportEventPayload } from "@/types/realtime";
import { logger } from "@/utils/logger";

/**
 * Emits a minimal Realtime broadcast event.
 * Design Invariants:
 * - Realtime is an advisory refresh signal, not an authoritative transaction or state store.
 * - Broadcast payloads never contain sensitive data (no PII, no private notes, no signed URLs).
 * - Realtime failures are non-fatal and will never cause the database transaction to roll back.
 */
export async function emitRealtimeReportEvent(
  payload: RealtimeReportEventPayload,
  client?: SupabaseClient
): Promise<boolean> {
  try {
    const topic =
      payload.change_type === "report_created"
        ? REALTIME_CONFIG.PUBLIC_REPORTS_CHANNEL
        : getReportChannel(payload.report_id);

    const supabase = client ?? (await createSupabaseServerClient());

    if (typeof (supabase as unknown as { channel?: unknown }).channel === "function") {
      const channel = (supabase as unknown as { channel: (topic: string) => { send: (msg: unknown) => Promise<unknown> } }).channel(topic);
      if (channel && typeof channel.send === "function") {
        await channel.send({
          type: "broadcast",
          event: payload.event,
          payload,
        });
      }
    }

    logger.info("realtime.broadcast_success");
    return true;
  } catch {
    // Failure in Realtime broadcast must never fail the underlying persistent state mutation
    logger.warn("realtime.broadcast_failed");
    return false;
  }
}
