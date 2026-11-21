# CivicPulse: Realtime Security & Threat Model (Phase 17)

> **Document Version**: 1.0.0  
> **Status**: Verified & Integrated  
> **Backend Branch**: `backend`  

---

## 1. Threat Matrix & Countermeasures

| Threat Vector | Attack Scenario | Implemented Mitigation | Verification |
| :--- | :--- | :--- | :--- |
| **Unauthorized Eavesdropping** | Malicious user subscribes to `report:<private_id>` to spy on confidential citizen complaint. | `realtime.messages` RLS policy checks `reports` table: permits subscription only if report is public & listed, caller is owner, or caller is admin. | Verified in RLS policies; subscription rejected for unrelated users. |
| **Event Spoofing** | Attacker broadcasts fake `{ change_type: "resolution_completed" }` to trick UI into marking report fixed. | `realtime.messages` insert policy has `WITH CHECK (false)`. Clients cannot broadcast messages. Only server service role can publish. Even if received, client refetches authoritative HTTP API. | Verified in SQL migration & security tests. |
| **PII & Credential Leakage** | Eavesdropper intercepts WebSocket packets to extract citizen email or signed URLs. | Payload contains only `{ event, report_id, change_type, occurred_at }`. No PII, no signed URLs, and no private notes are broadcast. | Verified in payload schema unit tests. |
| **Wildcard Subscription Attacks** | Attacker subscribes to `report:*` or SQL injection strings to intercept multiple reports. | Topic validation rejects non-UUID topics. RLS policy checks exact pattern `^report:[0-9a-fA-F-]{36}$`. | Verified in topic validator tests. |
| **Connection Drop Desynchronization** | Client loses connection during resolution and displays stale "in_progress" state. | Frontend reconnection handler automatically refetches `GET /api/reports/:id` upon restoring connection. | Documented in frontend contract. |

---

## 2. Realtime Row Level Security Implementation

```sql
-- Enforce RLS on Realtime Authorization
alter table realtime.messages enable row level security;

-- Subscriber Policy (SELECT)
create policy "realtime_subscriber_auth" on realtime.messages
for select to authenticated, anon
using (
  topic = 'reports:public'
  or (
    topic ~ '^report:[0-9a-fA-F-]{36}$'
    and exists (
      select 1 from public.reports r
      where r.id = (substring(topic from 8))::uuid
        and (
          (r.publication = 'public' and r.visibility = 'listed')
          or (auth.uid() is not null and r.user_id = auth.uid())
          or (auth.uid() is not null and exists (
            select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'
          ))
        )
    )
  )
);

-- Client Broadcast Lockout (INSERT)
create policy "realtime_client_publish_block" on realtime.messages
for insert to authenticated, anon
with check (false);
```

---

## 3. Guarantees & Non-Guarantees

### What Realtime Guarantees:
- Subscriptions to private complaints are strictly gated by report visibility and user ownership.
- Client browsers cannot forge broadcast messages.
- Broadcast packets are minimal and leak zero personal information.

### What Realtime Does NOT Guarantee:
- Guaranteed at-least-once or in-order delivery across network partitions. (Clients must treat events as invalidation signals and refetch authoritative HTTP APIs).
- Instantaneous revocation of an existing open WebSocket connection if an admin demotes a user mid-session. (The next HTTP refetch will enforce the current session permissions).
