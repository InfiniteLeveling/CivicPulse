-- Phase 20: Support p_publication parameter in civicpulse_create_report RPC
-- Allows citizen-selected visibility ('public' vs 'private') to persist atomically
-- while defaulting safely to 'private' for backward compatibility.
begin;

drop function if exists public.civicpulse_create_report(text, text, text, double precision, double precision, text, text, uuid);

create or replace function public.civicpulse_create_report(
  p_title text,
  p_description text,
  p_category text,
  p_latitude double precision,
  p_longitude double precision,
  p_image_path text,
  p_severity text default 'medium',
  p_submission_key uuid default gen_random_uuid(),
  p_publication text default 'private'
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
  v_publication text;
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
  v_publication := case when lower(coalesce(p_publication, 'private')) = 'public' then 'public' else 'private' end;

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
      'publication', existing_report.publication,
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
    v_publication,
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
    'publication', v_publication,
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

revoke all on function public.civicpulse_create_report(text, text, text, double precision, double precision, text, text, uuid, text) from public, anon;
grant execute on function public.civicpulse_create_report(text, text, text, double precision, double precision, text, text, uuid, text) to authenticated;

commit;
