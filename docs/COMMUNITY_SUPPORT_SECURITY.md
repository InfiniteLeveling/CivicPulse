# CivicPulse – Community Support Security, RLS & Voter Privacy Architecture

**Document Version:** 1.0.0  
**Phase:** 13 – Community Support & Upvoting  
**Classification:** Security Architecture & Threat Model

---

## 1. Security Overview

The Community Support subsystem enables citizens to validate and prioritize civic infrastructure issues. Because community support totals directly influence future priority scoring and municipal attention (Phase 14), the integrity of the vote-recording mechanism must be protected against:
1. **Vote Duplication & Inflation**: Multiple votes from a single account.
2. **Identity Spoofing**: Submitting votes under another citizen's identifier.
3. **Self-Voting**: Complaint creators artificially inflating their own reports.
4. **Voter Identity Leakage**: Disclosing who supported which complaint.
5. **Direct Database Bypass**: Tampering with vote counts via Supabase Data API.

---

## 2. Row Level Security & Database Architecture

### A. Core Uniqueness Constraint
The database table `public.report_votes` contains a composite uniqueness constraint:
```sql
constraint report_votes_once unique (report_id, user_id)
```
- Even if network retries, simultaneous requests, or race conditions bypass application-level checks, PostgreSQL enforces that **at most one vote row can ever exist for any (report_id, user_id) pair**.
- Attempting to insert a duplicate record triggers error code `23505` (`unique_violation`), which is safely intercepted by the service to return HTTP 200 `already_supported: true` without incrementing counts.

### B. Table-Level RLS Policies (`public.report_votes`)
- `vote_private_read`: Citizens may SELECT only rows where `user_id = auth.uid()`. They cannot inspect other citizens' voting records.
- `vote_self_active`: Citizens may INSERT rows only where `user_id = auth.uid()`, the caller is not an administrator, and the target report is in an active state (`pending` or `in_progress`).
- **No UPDATE or DELETE**: No role is granted `UPDATE` or `DELETE` on `report_votes`. Votes are immutable append-only records.

### C. The RLS Counting Challenge & Privileged Summary Function
Under `vote_private_read`, a standard citizen-scoped `SELECT count(*)` would only count 1 (the user's own row) because RLS filters out all other rows.
To solve this without exposing individual voter identities:
- We implement `public.civicpulse_get_support_summary(p_report_id uuid)` with `SECURITY DEFINER` and `set search_path = ''`.
- It executes an index-only `COUNT(*)` over `report_votes` and returns the scalar integer `support_count`.
- It never queries or returns voter profiles, names, UUIDs, or emails.
- It validates that the underlying complaint is public and listed; unauthorized requests for private complaints return `null` (HTTP 404).

---

## 3. Threat Model & Mitigation Matrix

| Threat / Attack Vector | Attack Method | Architectural Countermeasure | Test Verification |
|---|---|---|---|
| **Identity Forgery** | Attacker sends `user_id: <victim_uuid>` in request payload | Server derives identity solely from verified Supabase session cookies (`requireUser()`). Body `user_id` is rejected by strict Zod schema. | `Validation 04`, `Auth 01` |
| **Self-Voting Inflation** | Complaint creator upvotes own complaint to boost rank | Service and database RPC verify `report.user_id != caller.id`. Returns HTTP 403 `FORBIDDEN`. | `SelfVote 01` |
| **Vote Inflation via Rapid Clicks** | Attacker sends 100 simultaneous POST requests | Backed by `UNIQUE(report_id, user_id)`. Exactly one row commits; remaining requests receive HTTP 200 with `already_supported: true`. Count remains 1. | `Concurrency 01` |
| **Voting on Resolved Issues** | Attacker upvotes a closed complaint | System checks `report.status in ('pending', 'in_progress')`. Resolved reports return HTTP 409 `CONFLICT`. | `Eligibility 03` |
| **Voting on Private Reports** | Attacker guesses a private complaint UUID | System checks publication and visibility. Private complaints of other citizens return HTTP 404 `NOT_FOUND`. | `Visibility 02` |
| **Voter Privacy Enumeration** | Attacker queries vote endpoints to find who supported an issue | Data projection strictly omits voter UUIDs, profiles, and emails. Returns scalar `support_count` only. | `RouteContract 06` |
| **Admin Participation** | Administrative account upvotes complaint | System enforces citizen role. Admins are operational staff, not voting citizens (HTTP 403 `FORBIDDEN`). | `Auth 02` |
| **Direct DB Table Manipulation** | Attacker calls Supabase Data API directly | Table has RLS enabled with `WITH CHECK (user_id = auth.uid())`, preventing forged user IDs. UPDATE and DELETE privileges are revoked. | `phase03_rls_test.sql` |

---

## 4. Concurrency & Status Transition Synchronization

When a citizen upvotes a complaint while an administrator concurrently transitions its status to `resolved`:
- The database function `civicpulse_support_report` executes `SELECT id, user_id, status FROM public.reports WHERE id = p_report_id FOR SHARE`.
- Concurrently, Phase 08's `civicpulse_transition_report_status` acquires a `FOR UPDATE` lock on the same report.
- PostgreSQL serializes the two operations:
  - If the upvote commits before status transition: The vote is recorded and preserved in historical totals.
  - If the status transition commits first: The upvote detects `status = 'resolved'` and raises `CONFLICT` (HTTP 409).
- Votes are **never lost or deleted** when a report resolves.

---

## 5. Security Test Suite Matrix

The following test suites in `tests/phase13_support.test.ts` verify security:

| Test ID | Description | Expected Status | Result |
|---|---|---|---|
| `Auth 01` | Missing authentication session | `401 Unauthorized` | **PASS** |
| `Auth 02` | Administrator account attempts to vote | `403 Forbidden` | **PASS** |
| `SelfVote 01` | Report creator attempts to support own complaint | `403 Forbidden` | **PASS** |
| `Eligibility 03` | Attempting to upvote a resolved complaint | `409 Conflict` | **PASS** |
| `Visibility 01` | Nonexistent report UUID | `404 Not Found` | **PASS** |
| `Visibility 02` | Inaccessible private report of another user | `404 Not Found` | **PASS** |
| `OneVote 01` | First support from citizen | `201 Created` | **PASS** |
| `OneVote 02` | Repeated support from same citizen | `200 OK` (`already_supported: true`) | **PASS** |
| `Concurrency 01` | 5 simultaneous upvote requests from same citizen | Exactly 1 vote recorded | **PASS** |
| `Validation 04` | Client-injected `user_id`, `vote_count`, `priority_score` | `422 Unprocessable Entity` | **PASS** |
| `RouteContract 06` | Verification that no voter UUIDs or emails appear in output | Sensitive fields omitted | **PASS** |

---

## 6. Abuse Prevention & Known Limitations

1. **One-Account vs One-Human**:
   - The database enforces **One-User-One-Vote per authenticated account**.
   - It does not verify biometric or government ID identity. A malicious actor with multiple authenticated email accounts could cast multiple votes.
2. **Rate Limiting**:
   - For hackathon MVP, database uniqueness provides complete structural protection against count inflation per account.
   - For production, an edge rate-limiter (e.g. Cloudflare / Upstash Redis) should bound upvote actions to 20 requests per minute per IP.
