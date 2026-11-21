# CivicPulse: Supabase Realtime Developer Contract (Phase 17)

> **Document Version**: 1.0.0  
> **Status**: Verified & Integrated  
> **Backend Branch**: `backend`  
> **Scope**: Supabase Realtime Private Broadcast, Authorized Channel Subscriptions & State Refresh Signals

---

## 1. Executive Summary & Architecture Decision

CivicPulse uses **Supabase Realtime Private Broadcast Channels** to deliver live invalidation signals to authorized clients when civic complaint records mutate.

### Why Private Broadcast?
1. **Strict Data Minimization**: Broadcast payloads carry only `{ event, report_id, change_type, occurred_at }`. No citizen emails, signed image URLs, internal notes, or tokens are ever sent over WebSockets.
2. **Decoupled State Authority**: Realtime messages are **advisory refresh hints**, not authoritative data records. Upon receiving an event, clients immediately fetch fresh, authenticated, RLS-filtered, role-projected data via established Phase 07 APIs (`GET /api/reports/:id`, `GET /api/reports/:id/history`, `GET /api/reports/:id/evidence`).
3. **Database Independence**: Realtime broadcast failures never fail or roll back the committed PostgreSQL database transaction.
4. **Channel-Level RLS Authorization**: Channel subscriptions are verified via Row Level Security policies on `realtime.messages`.

---

## 2. Channel Naming Convention

| Channel Type | Topic Pattern | Audience | Purpose |
| :--- | :--- | :--- | :--- |
| **Report Channel** | `report:<report_id>` | Authorized Owner, Admins, or Public (if listed) | Live status, department, and resolution updates for a specific complaint |
| **Public Feed Channel** | `reports:public` | Public / All Citizens | Invalidation hint when a new public listed report is created |

*Note: `<report_id>` must be a valid lowercase UUID v4. Wildcard subscriptions (e.g. `report:*`) are strictly rejected.*

---

## 3. Realtime Event Contract

### 3.1 Event Types & Change Types

| Event Name | Change Type | Trigger Scenario | Target Channel |
| :--- | :--- | :--- | :--- |
| `report_updated` | `status_changed` | Complaint status transitions (`pending -> in_progress`) | `report:<report_id>` |
| `report_updated` | `department_changed` | Complaint assigned or routed to department | `report:<report_id>` |
| `report_updated` | `resolution_completed` | Complaint marked resolved with verified after-evidence | `report:<report_id>` |
| `report_created` | `report_created` | New complaint submitted with public listed visibility | `reports:public` |

### 3.2 Standard Event Payload Schema

```json
{
  "event": "report_updated",
  "report_id": "44444444-4444-4444-8444-444444444444",
  "change_type": "resolution_completed",
  "occurred_at": "2026-11-21T18:00:00.000Z"
}
```

```typescript
export interface RealtimeReportEventPayload {
  event: "report_updated" | "report_created";
  report_id: string; // UUID v4
  change_type:
    | "status_changed"
    | "department_changed"
    | "resolution_completed"
    | "report_created";
  occurred_at: string; // ISO 8601 UTC
}
```

---

## 4. Channel Authorization Rules

Subscriptions to `report:<report_id>` are authorized at connection time using Supabase Auth JWT credentials:

1. **Public Listed Reports**: Anyone (including anonymous visitors) may subscribe to receive updates.
2. **Private / Unlisted Reports**:
   - The authenticated creator (`auth.uid() = reports.user_id`) is permitted.
   - Verified administrators (`profiles.role = 'admin'`) are permitted.
   - All other authenticated users and anonymous visitors are **denied subscription** (WebSocket subscription closes with `CHANNEL_ERROR`).
3. **Client Publish Lockout**: Clients are strictly prohibited from broadcasting on any channel (`INSERT` on `realtime.messages` evaluated to `false`). Only trusted server backend services or PostgreSQL functions can emit broadcast events.

---

## 5. Event-to-API Invalidation Matrix

When the frontend client receives a Realtime event, it must refetch the appropriate authoritative HTTP endpoint:

| Received `change_type` | Affected Frontend UI | Authoritative API to Refetch |
| :--- | :--- | :--- |
| `status_changed` | Status Badge, Progress Stepper, History Timeline | `GET /api/reports/:id` & `GET /api/reports/:id/history` |
| `department_changed` | Assigned Department Card, Routing Metadata | `GET /api/reports/:id` |
| `resolution_completed` | Status Badge, Resolved Timestamp, Before/After Evidence Viewer | `GET /api/reports/:id`, `GET /api/reports/:id/history`, `GET /api/reports/:id/evidence` |
| `report_created` | Public Complaint Feed, Interactive Map Viewport | `GET /api/reports` & `GET /api/reports/map` |

---

## 6. Frontend Subscription Lifecycle & React Integration

### 6.1 React Hook Example

```typescript
import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { createClient } from "@supabase/supabase-js";
import type { RealtimeReportEventPayload } from "@/types/realtime";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export function useReportRealtime(reportId: string | null) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!reportId) return;

    const channelTopic = `report:${reportId}`;
    const channel = supabase.channel(channelTopic, {
      config: { private: true },
    });

    channel
      .on(
        "broadcast",
        { event: "report_updated" },
        (payload: { payload: RealtimeReportEventPayload }) => {
          const { change_type } = payload.payload;

          // Invalidate React Query caches to trigger authorized refetch
          queryClient.invalidateQueries({ queryKey: ["report", reportId] });
          queryClient.invalidateQueries({ queryKey: ["reportHistory", reportId] });

          if (change_type === "resolution_completed") {
            queryClient.invalidateQueries({ queryKey: ["reportEvidence", reportId] });
          }
        }
      )
      .subscribe((status) => {
        if (status === "CHANNEL_ERROR") {
          console.warn(`Realtime subscription denied for ${channelTopic}`);
        }
      });

    // Component unmount cleanup
    return () => {
      supabase.removeChannel(channel);
    };
  }, [reportId, queryClient]);
}
```

---

## 7. Reconnection & Offline Recovery Guarantees

1. **Transient Drops**: If client loses network connectivity, Supabase client automatically attempts reconnect with exponential backoff.
2. **Authoritative Refetch on Reconnect**: When the connection state changes from `DISCONNECTED` to `SUBSCRIBED`, the frontend client must automatically refetch `GET /api/reports/:id` to retrieve any intermediate state transitions that occurred while offline.
3. **No Lost State**: Because state history is persisted permanently in PostgreSQL (`status_history`), missed Realtime messages never cause data loss.
