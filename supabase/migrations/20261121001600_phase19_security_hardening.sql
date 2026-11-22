-- Phase 19: Ultimate Security Hardening, RLS & RBAC Verification, Function Privilege Lockout, and Audit Protection
-- Migration: 20261121001600_phase19_security_hardening.sql
begin;

-- ============================================================================
-- 1. Direct RLS Hardening on public.report_votes: Forbid Self-Voting
-- ============================================================================
-- Ensure that direct Data API inserts cannot upvote a report created by the caller,
-- aligning direct database access with the application-level self-voting policy.
drop policy if exists vote_self_active on public.report_votes;
create policy vote_self_active on public.report_votes
for insert to authenticated
with check (
  user_id = (select auth.uid())
  and not (select civicpulse_private.is_admin())
  and exists (
    select 1 from public.reports r
    where r.id = report_id
      and r.publication = 'public'
      and r.visibility = 'listed'
      and r.status in ('pending', 'in_progress')
      and r.user_id != (select auth.uid())
  )
);

-- ============================================================================
-- 2. Revoke Public Execution on Database Triggers and Internal Functions
-- ============================================================================
-- Trigger functions must only execute via PostgreSQL trigger dispatch and must
-- not be callable as standalone SQL routines by public, anon, or authenticated roles.
revoke all on function public.civicpulse_check_resolution_evidence() from public, anon;
revoke all on function civicpulse_private.on_vote_recalculate_priority() from public, anon, authenticated;
revoke all on function civicpulse_private.record_report_event() from public, anon, authenticated;
revoke all on function civicpulse_private.advance_report_version() from public, anon, authenticated;

-- Ensure public.find_nearby_reports explicitly revokes from public pseudo-role
revoke all on function public.find_nearby_reports(double precision, double precision, text, double precision, integer) from public;
grant execute on function public.find_nearby_reports(double precision, double precision, text, double precision, integer) to authenticated, anon;

-- ============================================================================
-- 3. Audit History & Immutability Enforcement
-- ============================================================================
-- Ensure client roles cannot insert, update, or delete immutable audit records.
revoke insert, update, delete on table public.status_history from public, anon, authenticated;
revoke insert, update, delete on table public.department_assignment_history from public, anon, authenticated;
revoke update, delete on table public.report_votes from public, anon, authenticated;

-- ============================================================================
-- 4. Storage Defense-in-Depth: Finalized Evidence Protection
-- ============================================================================
do $storage_hardening$
begin
  if to_regclass('storage.objects') is not null then
    -- Verify citizen draft deletion policy strictly excludes finalized report images
    drop policy if exists "citizen_delete_draft" on storage.objects;
    create policy "citizen_delete_draft" on storage.objects
    for delete to authenticated
    using (
      bucket_id = 'civic-evidence'
      and (storage.foldername(name))[1] = 'drafts'
      and (storage.foldername(name))[2] = (select auth.uid())::text
      and not exists (
        select 1 from public.report_images ri where ri.storage_path = storage.objects.name
      )
    );

    -- Verify admin resolution draft deletion policy strictly excludes finalized report images
    drop policy if exists "admin_delete_unlinked_resolution_draft" on storage.objects;
    create policy "admin_delete_unlinked_resolution_draft" on storage.objects
    for delete to authenticated
    using (
      bucket_id = 'civic-evidence'
      and (storage.foldername(name))[1] = 'resolution-drafts'
      and (storage.foldername(name))[2] = (select auth.uid())::text
      and not exists (
        select 1 from public.report_images ri where ri.storage_path = storage.objects.name
      )
    );
  end if;
end;
$storage_hardening$;

commit;
