# CivicPulse Priority Scoring Engine · Security Architecture & Threat Model

> **Document Version**: 1.0.0  
> **Target Audience**: Security Auditors, Database Administrators, Backend Engineers  
> **Applicable Branch**: `backend`

---

## 1. Security Overview

The CivicPulse Priority Engine calculates operational urgency scores to prioritize civic complaints for municipal triage. Because high priority complaints receive faster dispatcher visibility and crew allocation, the scoring engine is a natural target for manipulation, vote-gaming, and unauthorized elevation.

This document outlines the defense-in-depth architecture implemented across database schema, Row Level Security (RLS), Zod schemas, service logic, and database function privileges.

---

## 2. Threat Modeling & Safeguards Matrix

| Threat ID | Threat Vector | Potential Impact | Implemented Mitigation |
|---|---|---|---|
| **T-14-01** | Client injects `priority_score: 100` during report submission | Fake emergency classification | `createReportSchema` strictly strips/rejects unpermitted fields. Initial score is computed server-side from canonical severity. |
| **T-14-02** | Citizen attempts `PATCH /api/reports/:id` with forged score | Unauthorized score elevation | Direct score updates are blocked by Zod schemas and PostgreSQL column-level grants. |
| **T-14-03** | Rapid repetitive upvoting to game priority | Score inflation | One-User-One-Vote enforced at database level via `UNIQUE(report_id, user_id)`. Vote points capped at `20` regardless of vote volume. |
| **T-14-04** | Client supplies forged `as_of` or `created_at` timestamp | Artificially aged complaint gains age points | Server ignores any client-supplied time. Elapsed time uses server UTC clock and immutable database timestamps. |
| **T-14-05** | Voter identity enumeration via priority breakdown | Voter privacy violated | Priority APIs project only scalar totals (`support_count`, `support_points`). No voter UUIDs, profiles, or emails are exposed. |
| **T-14-06** | Existence probing of private complaints via priority endpoint | Metadata leakage of hidden reports | `getReportPriority` checks visibility. Inaccessible complaints return HTTP 404 `NOT_FOUND` identically to nonexistent IDs. |
| **T-14-07** | Resolved complaints continue gaming urgency | Inactive tickets cluttering active queues | Age accumulation strictly terminates at `resolved_at`. The active priority lifecycle terminates upon resolution. |
| **T-14-08** | Concurrent upvotes overwrite each other's score updates | Stale priority score | Database trigger `on_vote_recalculate_priority` and atomic service recalculation compute authoritative totals directly from `report_votes`. |

---

## 3. Database Privileges & Column Protection

- **Column Privilege Restriction**: `reports.priority_score` is NOT directly editable by citizen roles (`authenticated`, `anon`). Direct `UPDATE (priority_score)` statements by citizens are rejected by PostgreSQL.
- **Trigger-Controlled Maintenance**: Updates to `reports.priority_score` occur via privileged server services or trusted database triggers (`on_vote_recalculate_priority`).
- **SECURITY DEFINER Hardening**:
  - Functions `civicpulse_get_priority_breakdown`, `civicpulse_compute_report_priority`, and `on_vote_recalculate_priority` execute with `SECURITY DEFINER`.
  - All such functions strictly enforce `set search_path = ''` to eliminate search-path hijacking attacks.
  - All database tables are fully schema-qualified (`public.reports`, `public.report_votes`).
  - Strict caller validation is executed before returning breakdown data.

---

## 4. Voter Privacy & Data Protection

Under CivicPulse data privacy policies:
- Citizens have a right to cast civic support votes without public profiling or retaliation.
- The priority engine aggregates vote counts using `count(*)` queries.
- At no point during priority calculation or breakdown retrieval are voter UUIDs or personal records stored in cache, logged, or serialized to the client.

---

## 5. Mathematical Invariant Verification

The priority engine enforces strict invariants tested by automated boundary suites:
1. **Upper Bound**: $\forall \text{ complaints}, 0 \le \text{priority\_score} \le 100$.
2. **Support Ceiling**: $\forall \text{ complaints}, 0 \le \text{support\_points} \le 20$.
3. **Age Ceiling**: $\forall \text{ complaints}, 0 \le \text{age\_points} \le 10$.
4. **Resolution Freeze**: $\forall \text{ resolved complaints}, \text{age\_points}(t > \text{resolved\_at}) = \text{age\_points}(\text{resolved\_at})$.
