-- Phase 09: Department Management, Complaint Assignment, Reassignment, and Audit History
-- Migration: 20261121000800_phase09_department_assignment.sql
begin;

-- 1. Create Dedicated Department Assignment History Table
-- Records every administrative assignment and reassignment with previous/new department IDs and audit actor.
create table if not exists public.department_assignment_history (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.reports(id) on delete restrict,
  previous_department_id uuid references public.departments(id) on delete restrict,
  new_department_id uuid not null references public.departments(id) on delete restrict,
  assigned_by uuid not null references public.profiles(id) on delete restrict,
  reason text check (char_length(reason) <= 1000),
  created_at timestamptz not null default now()
);

-- 2. Configure Row Level Security on department_assignment_history
alter table public.department_assignment_history enable row level security;

revoke all on table public.department_assignment_history from public, anon, authenticated;

grant select (id, report_id, previous_department_id, new_department_id, assigned_by, reason, created_at)
  on table public.department_assignment_history to authenticated;

-- RLS Policy: Only authorized administrators may view assignment audit records
drop policy if exists assignment_history_admin_read on public.department_assignment_history;
create policy assignment_history_admin_read on public.department_assignment_history
  for select to authenticated
  using ((select civicpulse_private.is_admin()));

-- 3. Atomic Department Assignment RPC Function
-- Verifies caller is admin, locks target report with FOR UPDATE, verifies target department,
-- enforces lifecycle constraints (rejects assignment for resolved complaints),
-- validates optimistic concurrency (expected_department_id), prevents duplicate no-op assignments,
-- atomically updates reports.department_id, and writes immutable department_assignment_history.
create or replace function public.civicpulse_assign_department(
  p_report_id uuid,
  p_department_id uuid,
  p_expected_department_id uuid default null,
  p_check_expected boolean default false,
  p_reason text default null
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
  target_dept public.departments%rowtype;
  v_reason text;
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

  -- Layer 3: Lock Target Report with Row-Level Lock
  select * into target_report from public.reports where id = p_report_id for update;
  if target_report.id is null then
    raise exception 'NOT_FOUND: Report not found' using errcode = 'P0002';
  end if;

  -- Layer 4: Lifecycle Restriction: Resolved complaints cannot be reassigned
  if target_report.status = 'resolved' then
    raise exception 'ASSIGNMENT_CONFLICT: Cannot reassign a resolved complaint' using errcode = '23514';
  end if;

  -- Layer 5: Validate Target Department Existence
  select * into target_dept from public.departments where id = p_department_id;
  if target_dept.id is null then
    raise exception 'NOT_FOUND: Department not found' using errcode = 'P0002';
  end if;

  -- Layer 6: Duplicate No-Op Protection
  if target_report.department_id = p_department_id then
    raise exception 'ASSIGNMENT_CONFLICT: Report is already assigned to this department' using errcode = '23514';
  end if;

  -- Layer 7: Optimistic Concurrency Check (expected_department_id)
  if p_check_expected then
    if p_expected_department_id is null and target_report.department_id is not null then
      raise exception 'ASSIGNMENT_CONFLICT: Complaint was already assigned to another department. Expected unassigned but found %',
        target_report.department_id using errcode = '23514';
    elsif p_expected_department_id is not null and target_report.department_id is distinct from p_expected_department_id then
      raise exception 'ASSIGNMENT_CONFLICT: Complaint department changed. Expected % but found %',
        p_expected_department_id, coalesce(target_report.department_id::text, 'unassigned') using errcode = '23514';
    end if;
  end if;

  -- Layer 8: Reason Validation and Sanitization
  v_reason := trim(both ' ' from coalesce(p_reason, ''));
  if char_length(v_reason) > 1000 then
    raise exception 'INVALID_PARAMETER: Reason cannot exceed 1000 characters' using errcode = '22023';
  end if;
  if v_reason = '' then
    v_reason := null;
  end if;

  -- Layer 9: Execute Atomic Update on public.reports
  update public.reports
  set
    department_id = p_department_id,
    updated_at = clock_timestamp()
  where id = p_report_id
  returning updated_at into v_updated_at;

  -- Layer 10: Persist Dedicated Assignment Audit History
  insert into public.department_assignment_history (
    report_id,
    previous_department_id,
    new_department_id,
    assigned_by,
    reason,
    created_at
  ) values (
    p_report_id,
    target_report.department_id,
    p_department_id,
    current_uid,
    v_reason,
    clock_timestamp()
  )
  returning id into new_history_id;

  -- Layer 11: Return JSON Response Payload
  return jsonb_build_object(
    'report_id', p_report_id,
    'previous_department_id', target_report.department_id,
    'department', jsonb_build_object(
      'id', target_dept.id,
      'name', target_dept.name
    ),
    'assigned_by', current_uid,
    'assigned_at', v_updated_at,
    'assignment_history_id', new_history_id
  );
end;
$$;

revoke all on function public.civicpulse_assign_department(uuid, uuid, uuid, boolean, text) from public, anon;
grant execute on function public.civicpulse_assign_department(uuid, uuid, uuid, boolean, text) to authenticated;

-- 4. Performance Index on department_assignment_history
create index if not exists dept_assignment_history_report
  on public.department_assignment_history (report_id, created_at desc);

commit;
