# CivicPulse – Database Row Level Security (RLS) Verification Report (Phase 19)

**Document Version:** 1.0.0  
**Status:** FULLY VERIFIED & HARDENED  
**Scope:** PostgreSQL Database Architecture (All 11 Tables & Storage Objects)  
**Verification Date:** 2026-11-21  

---

## 1. Executive Summary

Row Level Security (RLS) is enabled and enforced on all 11 public schema tables and the Supabase Storage object layer.
Each table follows the principle of least privilege:
- `SELECT` policies enforce public visibility where civically transparent, and privacy boundaries for citizen profiles.
- `INSERT` policies bind records strictly to `auth.uid()` or administrative roles.
- `UPDATE` policies restrict status and department mutations exclusively to verified `admin` roles.
- `DELETE` operations on core complaint data and audit logs are strictly revoked.
- Trigger-driven audit tables (`report_history`, `priority_history`) are read-only to clients; mutations occur strictly via internal security context.
- Hardening migration `20261121001600_phase19_security_hardening.sql` added database-level self-voting prevention on `public.report_votes` and revoked default `PUBLIC` execution privileges from all database triggers.

---

## 2. Table-by-Table Policy Audit Matrix

### 2.1 `public.profiles`
- **RLS Enabled:** YES (`ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;`)
- **Policies:**
  - `profile_read_own_or_admin`: `SELECT` permitted if `auth.uid() = id` OR `public.is_admin(auth.uid())`.
  - `profile_update_own`: `UPDATE` permitted if `auth.uid() = id`. `role` column cannot be changed by user due to update trigger guard.
  - `profile_insert_own`: `INSERT` permitted if `auth.uid() = id`.
- **Grants:** `SELECT`, `UPDATE` granted to `authenticated`. `anon` access revoked.

### 2.2 `public.reports`
- **RLS Enabled:** YES
- **Policies:**
  - `reports_select_public`: `SELECT` permitted to all authenticated and anonymous viewers for public civic accountability.
  - `reports_insert_citizen`: `INSERT` permitted to `authenticated` with `WITH CHECK (auth.uid() = citizen_id AND status = 'submitted')`.
  - `reports_update_admin`: `UPDATE` permitted ONLY if `public.is_admin(auth.uid())`.
  - `DELETE`: Explicitly disallowed for all roles (records preserved permanently).
- **Grants:** `SELECT` to `anon`, `authenticated`. `INSERT` to `authenticated`. `UPDATE` to `authenticated` (RLS guarded).

### 2.3 `public.report_images`
- **RLS Enabled:** YES
- **Policies:**
  - `report_images_select_public`: `SELECT` permitted to `anon` and `authenticated`.
  - `report_images_insert_owner`: `INSERT` permitted if `EXISTS (SELECT 1 FROM public.reports r WHERE r.id = report_id AND r.citizen_id = auth.uid())`.
  - `DELETE`: Revoked. Immutability guaranteed once linked to a submitted report.
- **Constraints:** `report_images_path_valid` regex checks prevent directory traversal.

### 2.4 `public.report_evidence`
- **RLS Enabled:** YES
- **Policies:**
  - `report_evidence_select_public`: `SELECT` permitted for civic transparency of resolved complaints.
  - `report_evidence_insert_admin`: `INSERT` permitted ONLY if `public.is_admin(auth.uid())`.
  - `DELETE`: Revoked. Resolution evidence is permanent and immutable.
- **Triggers:** `civicpulse_check_resolution_evidence` enforces that a complaint cannot transition to `'resolved'` without active evidence.

### 2.5 `public.report_history` (Audit Log)
- **RLS Enabled:** YES
- **Policies:**
  - `report_history_select_all`: `SELECT` permitted to `anon` and `authenticated`.
  - `INSERT`, `UPDATE`, `DELETE`: **REVOKED from ALL roles (`PUBLIC`, `anon`, `authenticated`)**.
- **Execution Mechanism:** Populated strictly via PostgreSQL trigger `record_report_event()` executing with definer privileges. Non-tamperable audit trail.

### 2.6 `public.report_votes`
- **RLS Enabled:** YES
- **Policies:**
  - `vote_select_authenticated`: `SELECT` permitted to `authenticated`.
  - `vote_self_active_hardening` (Hardened in Phase 19):
    ```sql
    CREATE POLICY vote_self_active_hardening ON public.report_votes
      FOR INSERT TO authenticated
      WITH CHECK (
        auth.uid() = user_id
        AND NOT EXISTS (
          SELECT 1 FROM public.reports r
          WHERE r.id = report_id
            AND r.citizen_id = auth.uid()
        )
      );
    ```
  - `vote_delete_own`: `DELETE` permitted if `auth.uid() = user_id`.
  - `UPDATE`: Revoked.
- **Constraints:** `UNIQUE (report_id, user_id)` guarantees one vote per citizen per report.

### 2.7 `public.departments`
- **RLS Enabled:** YES
- **Policies:**
  - `departments_select_all`: `SELECT` permitted to all roles.
  - `departments_admin_mutation`: `INSERT`, `UPDATE`, `DELETE` restricted to `public.is_admin(auth.uid())`.

### 2.8 `public.department_routing_rules`
- **RLS Enabled:** YES
- **Policies:**
  - `routing_rules_select_all`: `SELECT` permitted to `authenticated`.
  - Mutations restricted to `admin`.

### 2.9 `public.priority_history`
- **RLS Enabled:** YES
- **Policies:**
  - `priority_history_select_authenticated`: `SELECT` permitted to `authenticated`.
  - `INSERT`, `UPDATE`, `DELETE`: **REVOKED from ALL roles**.
- **Execution Mechanism:** Populated strictly via PostgreSQL trigger `on_vote_recalculate_priority()`.

### 2.10 `public.analytics_department_kpis` & Analytics Views
- Access restricted to `authenticated` users where `public.is_admin(auth.uid()) = true`.

### 2.11 Storage Objects (`storage.objects`)
- Bucket `report-images` is marked `public = false`.
- Citizen Draft Isolation: Users can upload ONLY to `drafts/<user_id>/...` matching `auth.uid()`.
- Admin Resolution Drafts: Admins can upload ONLY to `resolution-drafts/<admin_id>/...` matching `auth.uid()`.
- Finalized Files: Once finalized, storage deletion is denied by storage RLS.

---

## 3. Database Functions & Privilege Hardening

| Function Name | Return Type | Security Context | Granted To | Public Revoked |
|---|---|---|---|---|
| `public.is_admin(uuid)` | `boolean` | `SECURITY DEFINER` | `authenticated` | **YES** |
| `public.find_nearby_reports(...)` | `SETOF record` | `SECURITY DEFINER` | `authenticated` | **YES (Phase 19)** |
| `public.record_report_event()` | `trigger` | `SECURITY DEFINER` | System / Trigger | **YES (Phase 19)** |
| `public.advance_report_version()` | `trigger` | `SECURITY DEFINER` | System / Trigger | **YES (Phase 19)** |
| `public.civicpulse_check_resolution_evidence()` | `trigger` | `SECURITY DEFINER` | System / Trigger | **YES (Phase 19)** |
| `public.on_vote_recalculate_priority()` | `trigger` | `SECURITY DEFINER` | System / Trigger | **YES (Phase 19)** |

---

## 4. Verification Conclusion
All database RLS policies and function execution privileges have been strictly verified against direct data-access abuse, unauthorized privilege escalation, and direct PostgREST tampering.
