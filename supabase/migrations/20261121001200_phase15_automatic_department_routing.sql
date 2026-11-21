-- Phase 15: Automatic Department Routing, Category-to-Department Mapping,
-- Secure Auto-Assignment, Manual Admin Override Precedence, Transactional Audit History
-- Migration: 20261121001200_phase15_automatic_department_routing.sql

begin;

-- 1. Schema Extensions on public.reports
-- Add manual_override and assignment_source columns to track assignment authority durably.
alter table public.reports
  add column if not exists manual_override boolean not null default false,
  add column if not exists assignment_source text not null default 'unassigned'
    check (assignment_source in ('unassigned', 'automatic', 'manual'));

-- Performance index for locating unassigned complaints for backfill / review
create index if not exists reports_routing_unassigned_idx
  on public.reports (department_id, manual_override, status)
  where department_id is null;

-- 2. Schema Extensions on public.department_assignment_history
-- Allow assigned_by to be null for system-generated automatic routing actions (no fabricated user UUIDs).
alter table public.department_assignment_history
  alter column assigned_by drop not null;

-- Add assignment_source and rule_key for explainability and auditing
alter table public.department_assignment_history
  add column if not exists assignment_source text not null default 'manual'
    check (assignment_source in ('manual', 'automatic')),
  add column if not exists rule_key text;

-- 3. Update public.civicpulse_assign_department
-- Ensure manual administrator assignments always mark manual_override = true and assignment_source = 'manual'.
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

  -- Layer 9: Execute Atomic Update on public.reports with Manual Override Precedence
  update public.reports
  set
    department_id = p_department_id,
    manual_override = true,
    assignment_source = 'manual',
    updated_at = clock_timestamp()
  where id = p_report_id
  returning updated_at into v_updated_at;

  -- Layer 10: Persist Dedicated Assignment Audit History with assignment_source = 'manual'
  insert into public.department_assignment_history (
    report_id,
    previous_department_id,
    new_department_id,
    assigned_by,
    assignment_source,
    reason,
    created_at
  ) values (
    p_report_id,
    target_report.department_id,
    p_department_id,
    current_uid,
    'manual',
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
    'assignment_source', 'manual',
    'manual_override', true,
    'assignment_history_id', new_history_id
  );
end;
$$;

revoke all on function public.civicpulse_assign_department(uuid, uuid, uuid, boolean, text) from public, anon;
grant execute on function public.civicpulse_assign_department(uuid, uuid, uuid, boolean, text) to authenticated;

-- 4. Create public.civicpulse_auto_route_report
-- Deterministically routes a report based on category mapping while strictly respecting manual override precedence.
create or replace function public.civicpulse_auto_route_report(
  p_report_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_uid uuid;
  caller_role text;
  is_svc boolean;
  target_report public.reports%rowtype;
  target_dept public.departments%rowtype;
  v_dept_name text;
  v_rule_key text;
  v_updated_at timestamptz;
  new_history_id uuid;
begin
  -- Layer 1: Authorization Guard (Only service_role or admin callers)
  caller_uid := auth.uid();
  is_svc := (coalesce(auth.role(), '') = 'service_role');

  if not is_svc then
    if caller_uid is null then
      raise exception 'UNAUTHORIZED: Authentication required' using errcode = '28000';
    end if;

    select role into caller_role from public.profiles where id = caller_uid;
    if caller_role is null or caller_role <> 'admin' then
      raise exception 'FORBIDDEN: Administrative or service privileges required' using errcode = '42501';
    end if;
  end if;

  -- Layer 2: Lock Target Report with Row-Level Lock
  select * into target_report from public.reports where id = p_report_id for update;
  if target_report.id is null then
    raise exception 'NOT_FOUND: Report not found' using errcode = 'P0002';
  end if;

  -- Layer 3: Lifecycle Restriction: Resolved complaints are frozen
  if target_report.status = 'resolved' then
    return jsonb_build_object(
      'report_id', p_report_id,
      'routing_status', 'skipped_resolved',
      'assignment_source', target_report.assignment_source,
      'department', case
        when target_report.department_id is not null then
          (select jsonb_build_object('id', id, 'name', name) from public.departments where id = target_report.department_id)
        else null
      end,
      'previous_department_id', target_report.department_id,
      'message', 'Complaint is resolved and cannot be automatically routed'
    );
  end if;

  -- Layer 4: Manual Admin Override Precedence
  -- If manually assigned or unassigned by an admin, automatic routing must skip.
  if target_report.manual_override = true or target_report.assignment_source = 'manual' then
    return jsonb_build_object(
      'report_id', p_report_id,
      'routing_status', 'skipped_manual_override',
      'assignment_source', 'manual',
      'department', case
        when target_report.department_id is not null then
          (select jsonb_build_object('id', id, 'name', name) from public.departments where id = target_report.department_id)
        else null
      end,
      'previous_department_id', target_report.department_id,
      'message', 'Complaint is protected by administrator manual override'
    );
  end if;

  -- Layer 5: Canonical Category-to-Department Mapping
  case target_report.category
    when 'pothole' then v_dept_name := 'Road Maintenance';
    when 'garbage' then v_dept_name := 'Sanitation';
    when 'water_leakage' then v_dept_name := 'Water Supply';
    when 'streetlight' then v_dept_name := 'Electrical';
    when 'drainage' then v_dept_name := 'Drainage';
    when 'damaged_infrastructure' then v_dept_name := 'Public Works';
    else v_dept_name := null;
  end case;

  if v_dept_name is null then
    return jsonb_build_object(
      'report_id', p_report_id,
      'routing_status', 'skipped_unmapped',
      'assignment_source', target_report.assignment_source,
      'department', null,
      'previous_department_id', target_report.department_id,
      'message', 'Category requires manual administrator review'
    );
  end if;

  -- Layer 6: Dynamic Department Resolution from Database
  select * into target_dept from public.departments where name = v_dept_name;
  if target_dept.id is null then
    return jsonb_build_object(
      'report_id', p_report_id,
      'routing_status', 'target_department_missing',
      'assignment_source', target_report.assignment_source,
      'department', null,
      'previous_department_id', target_report.department_id,
      'message', 'Target department ' || v_dept_name || ' does not exist in database directory'
    );
  end if;

  v_rule_key := target_report.category || '_to_' || lower(replace(target_dept.name, ' ', '_'));

  -- Layer 7: Idempotency Check: Already assigned to target department
  if target_report.department_id = target_dept.id then
    return jsonb_build_object(
      'report_id', p_report_id,
      'routing_status', 'skipped_already_assigned',
      'assignment_source', target_report.assignment_source,
      'department', jsonb_build_object('id', target_dept.id, 'name', target_dept.name),
      'previous_department_id', target_report.department_id,
      'rule_key', v_rule_key,
      'message', 'Complaint is already assigned to the target department'
    );
  end if;

  -- Layer 8: Execute Atomic Update on public.reports
  update public.reports
  set
    department_id = target_dept.id,
    assignment_source = 'automatic',
    updated_at = clock_timestamp()
  where id = p_report_id
  returning updated_at into v_updated_at;

  -- Layer 9: Persist Dedicated Assignment Audit History (System Action: assigned_by = null)
  insert into public.department_assignment_history (
    report_id,
    previous_department_id,
    new_department_id,
    assigned_by,
    assignment_source,
    rule_key,
    reason,
    created_at
  ) values (
    p_report_id,
    target_report.department_id,
    target_dept.id,
    null,
    'automatic',
    v_rule_key,
    'Automated routing based on complaint category: ' || target_report.category,
    clock_timestamp()
  )
  returning id into new_history_id;

  -- Layer 10: Return Standardized Routing Result DTO
  return jsonb_build_object(
    'report_id', p_report_id,
    'routing_status', 'assigned',
    'assignment_source', 'automatic',
    'department', jsonb_build_object('id', target_dept.id, 'name', target_dept.name),
    'previous_department_id', target_report.department_id,
    'rule_key', v_rule_key,
    'assignment_history_id', new_history_id,
    'assigned_at', v_updated_at,
    'message', 'Complaint routed successfully'
  );
end;
$$;

revoke all on function public.civicpulse_auto_route_report(uuid) from public, anon;
grant execute on function public.civicpulse_auto_route_report(uuid) to authenticated;

-- 5. Update public.civicpulse_create_report
-- In-transaction automatic routing during citizen complaint submission.
create or replace function public.civicpulse_create_report(
  p_title text,
  p_description text,
  p_category text,
  p_latitude double precision,
  p_longitude double precision,
  p_image_path text,
  p_severity text default 'medium',
  p_submission_key uuid default gen_random_uuid()
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_uid uuid;
  existing_report public.reports%rowtype;
  new_report_id uuid;
  new_reference text;
  new_created_at timestamptz;
  v_submission_key uuid;
  path_match boolean;
  v_target_dept_name text;
  v_target_dept public.departments%rowtype;
  v_dept_id uuid := null;
  v_assignment_src text := 'unassigned';
  v_rule_key text := null;
begin
  -- Layer 1: Authentication Guard
  current_uid := auth.uid();
  if current_uid is null then
    raise exception 'UNAUTHORIZED: Authentication required to submit complaint' using errcode = '28000';
  end if;

  v_submission_key := coalesce(p_submission_key, gen_random_uuid());

  -- Layer 2: Idempotent Submission Check
  select * into existing_report
  from public.reports
  where submission_key = v_submission_key and user_id = current_uid;

  if existing_report.id is null then
    select r.* into existing_report
    from public.reports r
    join public.report_images ri on ri.report_id = r.id
    where ri.storage_path = p_image_path and r.user_id = current_uid;
  end if;

  -- Layer 3: Return Existing Report on Repeat Request
  if existing_report.id is not null then
    return jsonb_build_object(
      'id', existing_report.id,
      'reference', existing_report.reference,
      'title', existing_report.title,
      'description', existing_report.description,
      'category', existing_report.category,
      'severity', existing_report.severity,
      'status', existing_report.status,
      'priority_score', existing_report.priority_score,
      'latitude', existing_report.latitude,
      'longitude', existing_report.longitude,
      'image_count', 1,
      'image_path', p_image_path,
      'department_id', existing_report.department_id,
      'assignment_source', existing_report.assignment_source,
      'created_at', existing_report.created_at
    );
  end if;

  -- Layer 4: Storage Draft Ownership Verification
  path_match := p_image_path ~ ('^drafts/' || current_uid::text || '/[0-9a-fA-F-]{36}\.(jpg|jpeg|png|webp)$');
  if not path_match then
    raise exception 'FORBIDDEN: Evidence image does not belong to authenticated citizen' using errcode = '42501';
  end if;

  -- Layer 5: Duplicate Evidence Check
  if exists (select 1 from public.report_images where storage_path = p_image_path) then
    raise exception 'CONFLICT: This image has already been associated with another report' using errcode = '23505';
  end if;

  -- Layer 6: Storage Object Existence Check (if storage catalog is available)
  if to_regclass('storage.objects') is not null then
    if not exists (select 1 from storage.objects where bucket_id = 'civic-evidence' and name = p_image_path) then
      raise exception 'NOT_FOUND: Evidence image object not found in storage bucket' using errcode = 'P0002';
    end if;
  end if;

  -- Layer 7: Category & Severity Validation
  if p_category not in ('pothole','garbage','water_leakage','streetlight','drainage','damaged_infrastructure','other') then
    raise exception 'VALIDATION_ERROR: Invalid category %', p_category using errcode = '22023';
  end if;
  if p_severity not in ('low','medium','high','critical') then
    raise exception 'VALIDATION_ERROR: Invalid severity %', p_severity using errcode = '22023';
  end if;

  -- Layer 8: Resolve Automatic Department Routing
  case p_category
    when 'pothole' then v_target_dept_name := 'Road Maintenance';
    when 'garbage' then v_target_dept_name := 'Sanitation';
    when 'water_leakage' then v_target_dept_name := 'Water Supply';
    when 'streetlight' then v_target_dept_name := 'Electrical';
    when 'drainage' then v_target_dept_name := 'Drainage';
    when 'damaged_infrastructure' then v_target_dept_name := 'Public Works';
    else v_target_dept_name := null;
  end case;

  if v_target_dept_name is not null then
    select * into v_target_dept from public.departments where name = v_target_dept_name;
    if v_target_dept.id is not null then
      v_dept_id := v_target_dept.id;
      v_assignment_src := 'automatic';
      v_rule_key := p_category || '_to_' || lower(replace(v_target_dept.name, ' ', '_'));
    end if;
  end if;

  -- Layer 9: Atomic Insert into public.reports
  insert into public.reports (
    submission_key,
    user_id,
    title,
    description,
    category,
    severity,
    status,
    latitude,
    longitude,
    publication,
    visibility,
    priority_score,
    department_id,
    manual_override,
    assignment_source,
    resolved_at
  ) values (
    v_submission_key,
    current_uid,
    p_title,
    p_description,
    p_category,
    coalesce(p_severity, 'medium'),
    'pending',
    p_latitude,
    p_longitude,
    'private',
    'listed',
    0,
    v_dept_id,
    false,
    v_assignment_src,
    null
  ) returning id, reference, created_at into new_report_id, new_reference, new_created_at;

  -- Layer 10: Atomic Insert into public.report_images
  insert into public.report_images (
    report_id,
    storage_path,
    type,
    uploaded_by
  ) values (
    new_report_id,
    p_image_path,
    'before',
    current_uid
  );

  -- Layer 11: If automatically assigned, record audit history
  if v_dept_id is not null then
    insert into public.department_assignment_history (
      report_id,
      previous_department_id,
      new_department_id,
      assigned_by,
      assignment_source,
      rule_key,
      reason,
      created_at
    ) values (
      new_report_id,
      null,
      v_dept_id,
      null,
      'automatic',
      v_rule_key,
      'Automated routing based on complaint category: ' || p_category,
      new_created_at
    );
  end if;

  -- Layer 12: Return Standardized Complaint DTO
  return jsonb_build_object(
    'id', new_report_id,
    'reference', new_reference,
    'title', p_title,
    'description', p_description,
    'category', p_category,
    'severity', coalesce(p_severity, 'medium'),
    'status', 'pending',
    'priority_score', 0,
    'latitude', p_latitude,
    'longitude', p_longitude,
    'image_count', 1,
    'image_path', p_image_path,
    'department_id', v_dept_id,
    'department', case
      when v_dept_id is not null then jsonb_build_object('id', v_target_dept.id, 'name', v_target_dept.name)
      else null
    end,
    'assignment_source', v_assignment_src,
    'created_at', new_created_at
  );
end;
$$;

revoke all on function public.civicpulse_create_report(text, text, text, double precision, double precision, text, text, uuid) from public, anon;
grant execute on function public.civicpulse_create_report(text, text, text, double precision, double precision, text, text, uuid) to authenticated;

commit;
