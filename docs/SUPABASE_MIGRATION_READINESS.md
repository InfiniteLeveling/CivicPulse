# CivicPulse – Supabase Database Migration Readiness Report (Phase 20)

**Document Version:** 1.0.0  
**Status:** FULLY PREPARED & AUDITED  
**Target Environment:** Preview / Staging Supabase Project  
**Migration Count:** 16 Chronological Migration Files  
**Date:** 2026-11-21  

---

## 1. Migration Inventory & Execution Manifest

Every schema change, index, trigger, stored procedure, and RLS policy from Phases 02 through 19 is encapsulated in sequential, immutable SQL migration files located in `supabase/migrations/`:

| Sequence # | Migration Filename | Milestone / Feature Domain | Core Schema Entities & Operations | Verification Test Reference |
|---|---|---|---|---|
| 01 | `20261121000100_core_schema.sql` | Phase 02: Core Schema | Tables `profiles`, `departments`, `reports`, `report_images`, `status_history`. Enums, check constraints, indexes. | `supabase/tests/01_catalog.sql` |
| 02 | `20261121000200_phase03_rls_policies.sql` | Phase 03: Database RLS & RBAC | Enables RLS on all core tables. Defines `is_admin()`, read/insert/update policies. | `supabase/tests/phase03_rls_test.sql` |
| 03 | `20261121000300_phase04_auth_profile_sync.sql` | Phase 04: Auth & Profile Sync | Trigger `on_auth_user_created` syncing `auth.users` to `public.profiles`. | `tests/phase04_auth.test.ts` |
| 04 | `20261121000400_phase05_storage.sql` | Phase 05: Storage Policies | Storage bucket `report-images` configuration and path isolation RLS. | `tests/phase05_storage.test.ts` |
| 05 | `20261121000500_phase06_report_creation.sql` | Phase 06: Complaint Submission | Constraints on `reports` submission, initial status default `submitted`. | `supabase/tests/phase06_report_creation_test.sql` |
| 06 | `20261121000600_phase07_report_retrieval.sql` | Phase 07: Complaint Retrieval | Composite retrieval indexes on `reports(status, created_at)`. | `supabase/tests/phase07_report_retrieval_test.sql` |
| 07 | `20261121000700_phase08_status_workflow.sql` | Phase 08: Status Progression | State machine transition function and audit trigger `record_report_event`. | `supabase/tests/phase08_status_workflow_test.sql` |
| 08 | `20261121000800_phase09_department_assignment.sql` | Phase 09: Department Assignment | RPC `civicpulse_assign_department`, manual override audit trail. | `supabase/tests/phase09_assignment_test.sql` |
| 09 | `20261121000900_phase12_duplicate_detection.sql` | Phase 12: Haversine Matching | Geospatial RPC `find_nearby_reports` calculating 100m distance. | `supabase/tests/phase12_duplicate_test.sql` |
| 10 | `20261121001000_phase13_community_support.sql` | Phase 13: Community Upvotes | Table `public.report_votes`, unique constraints, one-user-one-vote rules. | `supabase/tests/phase13_community_support_test.sql` |
| 11 | `20261121001100_phase14_priority_scoring.sql` | Phase 14: Priority Engine | Formula trigger `on_vote_recalculate_priority`, `priority_history` table. | `supabase/tests/phase14_priority_scoring_test.sql` |
| 12 | `20261121001200_phase15_automatic_department_routing.sql` | Phase 15: Automatic Routing | Table `department_routing_rules`, deterministic category mapping. | `supabase/tests/phase15_auto_routing_test.sql` |
| 13 | `20261121001300_phase16_map_viewport.sql` | Phase 16: Map Bounding-Box | Bounding-box spatial query indexes on `(latitude, longitude)`. | `supabase/tests/phase16_map_viewport_test.sql` |
| 14 | `20261121001400_phase17_realtime_and_resolution.sql` | Phase 17: Realtime & Evidence | Table `report_evidence`, trigger `civicpulse_check_resolution_evidence`. | `supabase/tests/phase17_realtime_and_resolution_test.sql` |
| 15 | `20261121001500_phase18_admin_analytics.sql` | Phase 18: Admin Analytics | Analytics indexes, stored procedures `civicpulse_get_analytics_overview`. | `supabase/tests/phase18_analytics_test.sql` |
| 16 | `20261121001600_phase19_security_hardening.sql` | Phase 19: Security Hardening | Policy `vote_self_active_hardening`, revokes `PUBLIC` on all triggers. | `supabase/tests/phase19_security_hardening_test.sql` |

---

## 2. PostgreSQL Extensions & Prerequisites

The database requires the following core PostgreSQL capabilities:
- `pgcrypto` (built-in for `gen_random_uuid()`)
- Pure SQL Haversine spherical math (implements distance calculation without requiring external C-extensions, ensuring 100% portability across all Supabase and AWS RDS PostgreSQL tiers).

---

## 3. Remote Migration Application Procedure (Safe & Non-Destructive)

When applying migrations to an authorized Preview/Staging Supabase project:
1. **Link to Project:**
   ```bash
   npx supabase link --project-ref <preview-project-ref>
   ```
2. **Review Remote vs Local Status (Non-Mutating):**
   ```bash
   npx supabase migration list
   ```
3. **Apply Pending Migrations:**
   ```bash
   npx supabase db push
   ```
4. **Execute Post-Migration Verification Suite:**
   Run the SQL verification test files in `supabase/tests/`:
   ```bash
   psql -f supabase/tests/phase19_security_hardening_test.sql
   ```

---

## 4. Forbidden Migration Practices

- **NO DESTRUCTIVE RESET:** Never run `supabase db reset --linked` against any remote or shared environment.
- **NO TRUNCATION:** Do not truncate reports, profiles, or audit tables.
- **NO POLICY RELAXATION:** Never loosen RLS or re-grant `PUBLIC` execute to resolve preview endpoint errors.
