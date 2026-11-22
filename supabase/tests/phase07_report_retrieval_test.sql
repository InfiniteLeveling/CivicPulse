-- Phase 07: Complaint Retrieval, Public Feed & Personal History Integration Test Suite
-- Run in Supabase SQL Editor or psql to verify RLS filtering, public vs private separation, and role boundaries.
begin;

do $suite$
declare
  citizen_a uuid := gen_random_uuid();
  citizen_b uuid := gen_random_uuid();
  admin_id uuid := gen_random_uuid();
  rep1_pub_a uuid := gen_random_uuid();
  rep2_priv_a uuid := gen_random_uuid();
  rep3_pub_b uuid := gen_random_uuid();
  rep4_priv_b uuid := gen_random_uuid();
  anon_count integer;
  citizen_a_mine_count integer;
  citizen_a_all_count integer;
  admin_count integer;
begin
  -- 1. Setup synthetic Auth identities and application profiles
  insert into auth.users (id, email)
  values
    (citizen_a, 'citizen_a_retrieval@example.com'),
    (citizen_b, 'citizen_b_retrieval@example.com'),
    (admin_id, 'admin_retrieval@example.com')
  on conflict (id) do nothing;

  insert into public.profiles (id, full_name, role)
  values
    (citizen_a, 'Citizen A', 'citizen'),
    (citizen_b, 'Citizen B', 'citizen'),
    (admin_id, 'Admin User', 'admin')
  on conflict (id) do update set role = excluded.role;

  -- 2. Setup test complaints
  -- Report 1: Citizen A, Public Listed
  insert into public.reports (
    id, submission_key, user_id, title, description, category, severity, status,
    latitude, longitude, publication, visibility, priority_score
  ) values (
    rep1_pub_a, gen_random_uuid(), citizen_a, 'Public Pothole by A',
    'Description for public pothole complaint', 'pothole', 'medium', 'pending',
    22.5726, 88.3639, 'public', 'listed', 0
  );

  -- Report 2: Citizen A, Private Listed
  insert into public.reports (
    id, submission_key, user_id, title, description, category, severity, status,
    latitude, longitude, publication, visibility, priority_score
  ) values (
    rep2_priv_a, gen_random_uuid(), citizen_a, 'Private Garbage by A',
    'Description for private garbage complaint', 'garbage', 'low', 'pending',
    22.5726, 88.3639, 'private', 'listed', 0
  );

  -- Report 3: Citizen B, Public Listed
  insert into public.reports (
    id, submission_key, user_id, title, description, category, severity, status,
    latitude, longitude, publication, visibility, priority_score
  ) values (
    rep3_pub_b, gen_random_uuid(), citizen_b, 'Public Water Leak by B',
    'Description for public water leakage complaint', 'water_leakage', 'high', 'pending',
    22.5726, 88.3639, 'public', 'listed', 0
  );

  -- Report 4: Citizen B, Private Listed
  insert into public.reports (
    id, submission_key, user_id, title, description, category, severity, status,
    latitude, longitude, publication, visibility, priority_score
  ) values (
    rep4_priv_b, gen_random_uuid(), citizen_b, 'Private Streetlight by B',
    'Description for private streetlight complaint', 'streetlight', 'critical', 'pending',
    22.5726, 88.3639, 'private', 'listed', 0
  );

  -- 3. Test: Anonymous Role RLS (Public Feed)
  -- Should see only Report 1 (A public) and Report 3 (B public).
  -- Must NOT see Report 2 (A private) or Report 4 (B private).
  perform set_config('request.jwt.claim.role', 'anon', true);
  perform set_config('role', 'anon', true);

  select count(*) into anon_count from public.reports;
  if anon_count <> 2 then
    raise exception 'TEST FAILED: Anonymous caller must see exactly 2 public reports, saw %', anon_count;
  end if;

  if exists (select 1 from public.reports where id in (rep2_priv_a, rep4_priv_b)) then
    raise exception 'SECURITY VIOLATION: Anonymous caller saw private reports';
  end if;

  -- 4. Test: Citizen A Session RLS (Personal Reports)
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  perform set_config('request.jwt.claim.sub', citizen_a::text, true);

  -- Citizen A querying own reports
  select count(*) into citizen_a_mine_count from public.reports where user_id = citizen_a;
  if citizen_a_mine_count <> 2 then
    raise exception 'TEST FAILED: Citizen A personal reports count expected 2, got %', citizen_a_mine_count;
  end if;

  -- Citizen A querying all accessible reports (own reports + public reports)
  select count(*) into citizen_a_all_count from public.reports;
  -- Should see Rep1 (own pub), Rep2 (own priv), Rep3 (peer pub) = 3 reports.
  -- Must NOT see Rep4 (peer priv).
  if citizen_a_all_count <> 3 then
    raise exception 'TEST FAILED: Citizen A total accessible reports expected 3, got %', citizen_a_all_count;
  end if;

  if exists (select 1 from public.reports where id = rep4_priv_b) then
    raise exception 'SECURITY VIOLATION: Citizen A saw Citizen B private report';
  end if;

  -- 5. Test: Admin Session RLS
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  perform set_config('request.jwt.claim.sub', admin_id::text, true);

  select count(*) into admin_count from public.reports;
  if admin_count <> 4 then
    raise exception 'TEST FAILED: Admin must see all 4 reports, saw %', admin_count;
  end if;

  raise notice 'Phase 07 SQL retrieval test suite passed successfully!';
end;
$suite$;

rollback;
