-- Phase 17: Supabase Realtime Complaint Tracking, Administrator Resolution Evidence,
-- Before/After Images, Atomic Resolution Workflow, Private Storage Security & Channel Authorization
-- Migration: 20261121001400_phase17_realtime_and_resolution.sql
begin;

-- ============================================================================
-- 1. Hardened Storage RLS: Admin Resolution Evidence Uploads
-- ============================================================================
do $storage_policy$
begin
  if to_regclass('storage.objects') is not null then
    -- Policy: Admins can upload resolution drafts into resolution-drafts/<admin_id>/<report_id>/...
    drop policy if exists "admin_upload_resolution_draft" on storage.objects;
    create policy "admin_upload_resolution_draft" on storage.objects
    for insert to authenticated
    with check (
      bucket_id = 'civic-evidence'
      and (storage.foldername(name))[1] = 'resolution-drafts'
      and (storage.foldername(name))[2] = (select auth.uid())::text
      and exists (
        select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin'
      )
    );

    -- Policy: Admins can delete only unfinalized resolution drafts
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
$storage_policy$;

-- ============================================================================
-- 2. Direct RLS Protection on public.report_images for 'after' Evidence
-- ============================================================================
drop policy if exists image_admin_create on public.report_images;
create policy image_admin_create on public.report_images
for insert to authenticated
with check (
  uploaded_by = (select auth.uid())
  and type = 'after'
  and (select civicpulse_private.is_admin())
  and exists (
    select 1 from public.reports r
    where r.id = report_id and r.status = 'in_progress'
  )
);

-- ============================================================================
-- 3. Enhanced Atomic Status Transition RPC with Resolution Evidence Support
-- ============================================================================
create or replace function public.civicpulse_transition_report_status(
  p_report_id uuid,
  p_new_status text,
  p_notes text default null,
  p_expected_status text default null,
  p_after_image_path text default null
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
  new_image_id uuid;
  path_match boolean;
  clean_after_path text;
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
    clean_after_path := nullif(trim(both ' ' from coalesce(p_after_image_path, '')), '');
    -- Safe replay: if report is already resolved and the same after_image is associated, return existing state
    if p_new_status = 'resolved' and clean_after_path is not null then
      select id into new_image_id
      from public.report_images
      where report_id = p_report_id and storage_path = clean_after_path and type = 'after';

      if new_image_id is not null then
        select id into new_history_id
        from public.status_history
        where report_id = p_report_id and status = 'resolved'
        order by created_at desc limit 1;

        return jsonb_build_object(
          'id', p_report_id,
          'previous_status', 'in_progress',
          'status', 'resolved',
          'updated_at', target_report.updated_at,
          'resolved_at', target_report.resolved_at,
          'history_entry_id', new_history_id,
          'version', target_report.version,
          'resolution_evidence', jsonb_build_object(
            'image_id', new_image_id,
            'storage_path', clean_after_path,
            'type', 'after'
          )
        );
      end if;
    end if;

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

  -- Layer 8: Phase 17 Resolution Evidence Validation
  if p_new_status = 'resolved' then
    clean_after_path := nullif(trim(both ' ' from coalesce(p_after_image_path, '')), '');
    if clean_after_path is null then
      raise exception 'RESOLUTION_EVIDENCE_REQUIRED: Resolution requires an administrator-submitted after-repair image' using errcode = '22023';
    end if;

    -- Validate path structure: resolution-drafts/<admin_id>/<report_id>/<uuid>.<ext>
    path_match := clean_after_path ~ ('^resolution-drafts/' || current_uid::text || '/' || p_report_id::text || '/[0-9a-fA-F-]{36}\.(jpg|jpeg|png|webp)$');
    if not path_match then
      raise exception 'FORBIDDEN: Evidence image does not belong to authorized administrator resolution staging for this report' using errcode = '42501';
    end if;

    -- Cross-report reuse protection: ensure image is not linked to any other complaint
    if exists (select 1 from public.report_images where storage_path = clean_after_path and report_id <> p_report_id) then
      raise exception 'CONFLICT: This evidence image has already been associated with another report' using errcode = '23505';
    end if;

    -- Storage catalog existence check (if storage catalog is installed)
    if to_regclass('storage.objects') is not null then
      if not exists (select 1 from storage.objects where bucket_id = 'civic-evidence' and name = clean_after_path) then
        raise exception 'NOT_FOUND: Evidence image object not found in storage bucket' using errcode = 'P0002';
      end if;
    end if;

    -- Atomically insert the after-image record into public.report_images
    insert into public.report_images (report_id, storage_path, type, uploaded_by)
    values (p_report_id, clean_after_path, 'after', current_uid)
    on conflict (storage_path) do nothing
    returning id into new_image_id;

    if new_image_id is null then
      select id into new_image_id from public.report_images where storage_path = clean_after_path;
    end if;
  end if;

  -- Layer 9: Notes validation and sanitization
  v_notes := trim(both ' ' from coalesce(p_notes, ''));
  if char_length(v_notes) > 1000 then
    raise exception 'INVALID_PARAMETER: Notes cannot exceed 1000 characters' using errcode = '22023';
  end if;
  if v_notes = '' then
    v_notes := null;
  end if;

  -- Layer 10: Set transaction-local note for record_report_event trigger
  if v_notes is not null then
    perform set_config('civicpulse.transition_notes', v_notes, true);
  else
    perform set_config('civicpulse.transition_notes', '', true);
  end if;

  -- Layer 11: Manage resolved_at timestamp
  if p_new_status = 'resolved' then
    v_resolved_at := clock_timestamp();
  else
    v_resolved_at := null;
  end if;

  -- Layer 12: Execute atomic update (advances version and fires record_report_event trigger)
  update public.reports
  set
    status = p_new_status,
    resolved_at = v_resolved_at,
    updated_at = clock_timestamp()
  where id = p_report_id
  returning version, updated_at into new_version, v_updated_at;

  -- Layer 13: Retrieve newly created status_history id
  select id into new_history_id
  from public.status_history
  where report_id = p_report_id and version = new_version;

  -- Layer 14: Return verified response payload
  return jsonb_build_object(
    'id', p_report_id,
    'previous_status', target_report.status,
    'status', p_new_status,
    'updated_at', v_updated_at,
    'resolved_at', v_resolved_at,
    'history_entry_id', new_history_id,
    'version', new_version,
    'resolution_evidence', case
      when p_new_status = 'resolved' and new_image_id is not null then
        jsonb_build_object(
          'image_id', new_image_id,
          'storage_path', clean_after_path,
          'type', 'after'
        )
      else null
    end
  );
end;
$$;

revoke all on function public.civicpulse_transition_report_status(uuid, text, text, text, text) from public, anon;
grant execute on function public.civicpulse_transition_report_status(uuid, text, text, text, text) to authenticated;

-- ============================================================================
-- 4. Database-Level Invariant Enforcement: Direct DB Update Trigger
-- ============================================================================
-- Prevents bypass of evidence requirement via direct SQL 'UPDATE public.reports SET status = resolved'
create or replace function public.civicpulse_check_resolution_evidence()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (new.status = 'resolved' and old.status <> 'resolved') then
    if not exists (
      select 1 from public.report_images ri
      where ri.report_id = new.id and ri.type = 'after'
    ) then
      raise exception 'RESOLUTION_EVIDENCE_REQUIRED: Direct update to resolved prohibited without associated after-repair evidence in report_images' using errcode = '22023';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists reports_resolution_evidence_check on public.reports;
create trigger reports_resolution_evidence_check
  before update on public.reports
  for each row
  execute function public.civicpulse_check_resolution_evidence();

-- ============================================================================
-- 5. Realtime Channel Authorization: Private Broadcast Security
-- ============================================================================
do $realtime_auth$
begin
  if to_regclass('realtime.messages') is not null then
    begin
      alter table realtime.messages enable row level security;

      -- Allow subscribers to receive messages only on authorized channels:
      -- 1. 'reports:public' is accessible by anyone
      -- 2. 'report:<uuid>' is accessible if report is public/listed, caller is owner, or caller is admin
      drop policy if exists "realtime_subscriber_auth" on realtime.messages;
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

      -- Anti-spoofing guard: strictly forbid client-side broadcast inserts
      drop policy if exists "realtime_client_publish_block" on realtime.messages;
      create policy "realtime_client_publish_block" on realtime.messages
      for insert to authenticated, anon
      with check (false);
    exception when others then
      raise notice 'Realtime messages RLS configuration skipped: %', sqlerrm;
    end;
  end if;
end;
$realtime_auth$;

-- ============================================================================
-- 6. Supabase Realtime Publication Configuration (if publication exists)
-- ============================================================================
do $pub$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'reports'
    ) then
      begin
        alter publication supabase_realtime add table public.reports;
      exception when others then
        raise notice 'Realtime publication update skipped: %', sqlerrm;
      end;
    end if;
  end if;
end;
$pub$;

commit;
