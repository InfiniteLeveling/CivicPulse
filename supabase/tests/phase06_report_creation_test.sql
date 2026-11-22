-- Phase 06: Citizen Complaint Creation Integration and Atomicity Test Suite
-- Run in Supabase SQL Editor or psql to verify transactional behavior, triggers, RLS, and image association.
begin;

do $suite$
declare
  citizen1_id uuid := gen_random_uuid();
  citizen2_id uuid := gen_random_uuid();
  admin_id uuid := gen_random_uuid();
  image1_id uuid := gen_random_uuid();
  image2_id uuid := gen_random_uuid();
  path1 text;
  path2 text;
  report_json jsonb;
  created_report_id uuid;
  status_count integer;
  vote_count integer;
  image_count integer;
  caught_error boolean := false;
begin
  path1 := 'drafts/' || citizen1_id::text || '/' || image1_id::text || '.jpg';
  path2 := 'drafts/' || citizen2_id::text || '/' || image2_id::text || '.png';

  -- 1. Setup synthetic Auth identities and application profiles
  insert into auth.users (id, email)
  values
    (citizen1_id, 'citizen1_test@example.com'),
    (citizen2_id, 'citizen2_test@example.com'),
    (admin_id, 'admin_test@example.com')
  on conflict (id) do nothing;

  insert into public.profiles (id, full_name, role)
  values
    (citizen1_id, 'Test Citizen One', 'citizen'),
    (citizen2_id, 'Test Citizen Two', 'citizen'),
    (admin_id, 'Test Officer Admin', 'admin')
  on conflict (id) do update set role = excluded.role;

  -- 2. Setup synthetic storage object if storage table exists
  if to_regclass('storage.objects') is not null then
    insert into storage.buckets (id, name, public)
    values ('civic-evidence', 'civic-evidence', false)
    on conflict (id) do nothing;

    insert into storage.objects (id, bucket_id, name, owner)
    values
      (gen_random_uuid(), 'civic-evidence', path1, citizen1_id),
      (gen_random_uuid(), 'civic-evidence', path2, citizen2_id)
    on conflict do nothing;
  end if;

  -- 3. Simulate Citizen 1 session
  perform set_config('request.jwt.claim.sub', citizen1_id::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);

  -- 4. Test: Successful Complaint Creation via Atomic Function
  report_json := public.civicpulse_create_report(
    'Dangerous pothole outside campus gate',
    'Deep crater causing traffic slowdown and water pooling.',
    'pothole',
    22.5726,
    88.3639,
    path1,
    'high',
    gen_random_uuid()
  );

  created_report_id := (report_json->>'id')::uuid;

  if created_report_id is null then
    raise exception 'TEST FAILED: Report ID was not returned by civicpulse_create_report';
  end if;

  if (report_json->>'status') <> 'pending' then
    raise exception 'TEST FAILED: Initial report status must be pending, got %', (report_json->>'status');
  end if;

  if (report_json->>'priority_score')::int <> 0 then
    raise exception 'TEST FAILED: Initial priority score must be 0, got %', (report_json->>'priority_score');
  end if;

  -- 5. Verify Report Image Association
  select count(*) into image_count from public.report_images
   where report_id = created_report_id and storage_path = path1 and type = 'before' and uploaded_by = citizen1_id;

  if image_count <> 1 then
    raise exception 'TEST FAILED: report_images record was not created correctly for report %', created_report_id;
  end if;

  -- 6. Verify Database Triggers: status_history and report_votes
  select count(*) into status_count from public.status_history
   where report_id = created_report_id and version = 1 and status = 'pending' and changed_by = citizen1_id;

  if status_count <> 1 then
    raise exception 'TEST FAILED: Initial status_history record was not created by trigger';
  end if;

  select count(*) into vote_count from public.report_votes
   where report_id = created_report_id and user_id = citizen1_id;

  if vote_count <> 1 then
    raise exception 'TEST FAILED: Initial self-support vote was not created by trigger';
  end if;

  -- 7. Test: Duplicate Image Association Blocked
  caught_error := false;
  begin
    perform public.civicpulse_create_report(
      'Duplicate attempt with same image',
      'This should be rejected because image is already linked.',
      'pothole',
      22.5726,
      88.3639,
      path1,
      'medium',
      gen_random_uuid()
    );
  exception
    when others then
      caught_error := true;
  end;

  if not caught_error then
    raise exception 'TEST FAILED: Duplicate image association was not rejected';
  end if;

  -- 8. Test: Cross-User Image Theft Blocked
  caught_error := false;
  begin
    -- Citizen 1 tries to submit complaint claiming Citizen 2's draft image
    perform public.civicpulse_create_report(
      'Theft attempt of citizen 2 image',
      'This must be rejected as forbidden.',
      'garbage',
      22.5726,
      88.3639,
      path2,
      'low',
      gen_random_uuid()
    );
  exception
    when others then
      caught_error := true;
  end;

  if not caught_error then
    raise exception 'TEST FAILED: Cross-user image path was not rejected';
  end if;

  -- 9. Test: Admin Cannot Create Citizen Report
  perform set_config('request.jwt.claim.sub', admin_id::text, true);
  caught_error := false;
  begin
    perform public.civicpulse_create_report(
      'Admin submitting complaint',
      'Admins cannot submit citizen reports.',
      'pothole',
      22.5726,
      88.3639,
      path1,
      'low',
      gen_random_uuid()
    );
  exception
    when others then
      caught_error := true;
  end;

  if not caught_error then
    raise exception 'TEST FAILED: Admin role was not rejected from citizen complaint submission';
  end if;

  raise notice 'Phase 06 SQL integration suite passed successfully!';
end;
$suite$;

rollback;
