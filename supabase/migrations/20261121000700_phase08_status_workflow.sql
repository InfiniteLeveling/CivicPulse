-- Phase 08: Complaint Status Management, Admin Authorization, State Transitions, and Atomic Audit History
-- Migration: 20261121000700_phase08_status_workflow.sql
begin;

-- 1. Grant safe column-level SELECT on status_history to anon (public timeline)
grant select (id, report_id, version, previous_status, status, created_at)
  on table public.status_history to anon;

-- 2. Add RLS policy for anonymous visitors to view public listed complaint timelines
drop policy if exists timeline_public_read on public.status_history;
create policy timeline_public_read on public.status_history for select to anon
  using (exists (
    select 1 from public.reports r
    where r.id = status_history.report_id
      and r.publication = 'public'
      and r.visibility = 'listed'
  ));

-- 3. Enhance audit trigger civicpulse_private.record_report_event()
-- Supports transaction-local custom administrative remarks set via set_config('civicpulse.transition_notes', ...)
create or replace function civicpulse_private.record_report_event() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  actor uuid := auth.uid();
  custom_notes text := nullif(current_setting('civicpulse.transition_notes', true), '');
  final_notes text;
begin
  if actor is null then raise exception 'Report writes require an authenticated actor'; end if;
  if tg_op = 'INSERT' then
    insert into public.status_history(report_id,version,status,changed_by)
      values (new.id,new.version,new.status,actor);
    insert into public.report_votes(report_id,user_id) values (new.id,new.user_id);
  else
    if custom_notes is not null then
      final_notes := custom_notes;
    else
      final_notes := format('department %s -> %s; severity %s -> %s; visibility %s -> %s',
        old.department_id,new.department_id,old.severity,new.severity,old.visibility,new.visibility);
    end if;
    insert into public.status_history(report_id,version,previous_status,status,changed_by,notes)
      values (new.id,new.version,old.status,new.status,actor,final_notes);
  end if;
  return null;
end;
$$;

-- 4. Atomic Status Transition RPC Function
-- Verifies caller is admin, locks target report with FOR UPDATE, verifies state transition matrix,
-- checks expected_status for optimistic concurrency, updates status and resolved_at,
-- and relies on report triggers to atomically advance version and insert immutable status_history.
create or replace function public.civicpulse_transition_report_status(
  p_report_id uuid,
  p_new_status text,
  p_notes text default null,
  p_expected_status text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_uid uuid;
  caller_role text;
  target_report public.reports%rowtype;
  v_notes text;
  v_resolved_at timestamptz;
  new_version integer;
  v_updated_at timestamptz;
  new_history_id uuid;
begin
  -- Layer 1: Authentication Guard
  current_uid := auth.uid();
  if current_uid is null then
    raise exception 'UNAUTHORIZED: Authentication required' using errcode = '28000';
  end if;

  -- Layer 2: Role Verification (Strict Admin Only)
  select role into caller_role from public.profiles where id = current_uid;
  if caller_role is null or caller_role <> 'admin' then
    raise exception 'FORBIDDEN: Administrative privileges required' using errcode = '42501';
  end if;

  -- Layer 3: Validate new_status is canonical
  if p_new_status not in ('pending', 'in_progress', 'resolved') then
    raise exception 'INVALID_PARAMETER: Unknown status %', p_new_status using errcode = '22023';
  end if;

  -- Layer 4: Lock Target Report with Row-Level Lock
  select * into target_report from public.reports where id = p_report_id for update;
  if target_report.id is null then
    raise exception 'NOT_FOUND: Report not found' using errcode = 'P0002';
  end if;

  -- Layer 5: Optimistic Concurrency Check (expected_status)
  if p_expected_status is not null and target_report.status <> p_expected_status then
    raise exception 'STATUS_CONFLICT: Complaint status changed. Expected % but current status is %',
      p_expected_status, target_report.status using errcode = '23514';
  end if;

  -- Layer 6: Same-Status Idempotency / Conflict Check
  if target_report.status = p_new_status then
    raise exception 'STATUS_CONFLICT: Report is already in status %', p_new_status using errcode = '23514';
  end if;

  -- Layer 7: State Transition Matrix (pending -> in_progress -> resolved)
  if not (
    (target_report.status = 'pending' and p_new_status = 'in_progress') or
    (target_report.status = 'in_progress' and p_new_status = 'resolved')
  ) then
    raise exception 'STATUS_CONFLICT: Cannot transition complaint status from % to %',
      target_report.status, p_new_status using errcode = '23514';
  end if;

  -- Layer 8: Notes validation and sanitization
  v_notes := trim(both ' ' from coalesce(p_notes, ''));
  if char_length(v_notes) > 1000 then
    raise exception 'INVALID_PARAMETER: Notes cannot exceed 1000 characters' using errcode = '22023';
  end if;
  if v_notes = '' then
    v_notes := null;
  end if;

  -- Layer 9: Set transaction-local note for record_report_event trigger
  if v_notes is not null then
    perform set_config('civicpulse.transition_notes', v_notes, true);
  else
    perform set_config('civicpulse.transition_notes', '', true);
  end if;

  -- Layer 10: Manage resolved_at timestamp
  if p_new_status = 'resolved' then
    v_resolved_at := clock_timestamp();
  else
    v_resolved_at := null;
  end if;

  -- Layer 11: Execute atomic update (advances version and fires record_report_event trigger)
  update public.reports
  set
    status = p_new_status,
    resolved_at = v_resolved_at,
    updated_at = clock_timestamp()
  where id = p_report_id
  returning version, updated_at into new_version, v_updated_at;

  -- Layer 12: Retrieve newly created status_history id
  select id into new_history_id
  from public.status_history
  where report_id = p_report_id and version = new_version;

  -- Layer 13: Return verified response payload
  return jsonb_build_object(
    'id', p_report_id,
    'previous_status', target_report.status,
    'status', p_new_status,
    'updated_at', v_updated_at,
    'resolved_at', v_resolved_at,
    'history_entry_id', new_history_id,
    'version', new_version
  );
end;
$$;

revoke all on function public.civicpulse_transition_report_status(uuid, text, text, text) from public, anon;
grant execute on function public.civicpulse_transition_report_status(uuid, text, text, text) to authenticated;

-- 5. Privileged Admin Timeline Retrieval Function
-- Accessible only to verified administrators; projects operational notes and actor UUIDs
create or replace function public.civicpulse_get_admin_status_history(p_report_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_uid uuid;
  caller_role text;
  history_records jsonb;
begin
  current_uid := auth.uid();
  if current_uid is null then
    raise exception 'UNAUTHORIZED: Authentication required' using errcode = '28000';
  end if;

  select role into caller_role from public.profiles where id = current_uid;
  if caller_role is null or caller_role <> 'admin' then
    raise exception 'FORBIDDEN: Administrative privileges required' using errcode = '42501';
  end if;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', sh.id,
      'report_id', sh.report_id,
      'version', sh.version,
      'previous_status', sh.previous_status,
      'status', sh.status,
      'changed_by', sh.changed_by,
      'notes', sh.notes,
      'created_at', sh.created_at
    ) order by sh.created_at asc, sh.version asc
  ), '[]'::jsonb)
  into history_records
  from public.status_history sh
  where sh.report_id = p_report_id;

  return history_records;
end;
$$;

revoke all on function public.civicpulse_get_admin_status_history(uuid) from public, anon;
grant execute on function public.civicpulse_get_admin_status_history(uuid) to authenticated;

-- 6. Performance Index for Chronological Timeline Traversal
create index if not exists status_history_report_chronological
  on public.status_history (report_id, created_at asc, version asc);

commit;
