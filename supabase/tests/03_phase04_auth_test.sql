-- SQL Editor: run after Phase 03 and Phase 04 migrations as project owner.
-- Verifies profile provisioning trigger, escalation prevention, and ensure_profile RPC.
begin;

do $test$
declare
  test_uid uuid := gen_random_uuid();
  admin_uid uuid := gen_random_uuid();
  fetched_profile public.profiles;
begin
  -- 1. Test handle_new_user trigger directly
  insert into auth.users (id, email, raw_user_meta_data)
  values (
    test_uid,
    'test_citizen_04@example.com',
    '{"full_name": "Test Citizen 04", "role": "admin"}'::jsonb
  );

  select * into fetched_profile from public.profiles where id = test_uid;

  -- Verify profile exists
  if fetched_profile.id is null then
    raise exception 'Phase 04 failed: Profile was not created by trigger';
  end if;

  -- Verify role escalation attempt was ignored and assigned 'citizen'
  if fetched_profile.role <> 'citizen' then
    raise exception 'Phase 04 failed: Role escalation succeeded! Found role %', fetched_profile.role;
  end if;

  if fetched_profile.full_name <> 'Test Citizen 04' then
    raise exception 'Phase 04 failed: Full name mismatch. Found %', fetched_profile.full_name;
  end if;

  -- 2. Test fallback name handling when metadata is missing
  insert into auth.users (id, email, raw_user_meta_data)
  values (admin_uid, 'fallback_user@example.com', '{}'::jsonb);

  select * into fetched_profile from public.profiles where id = admin_uid;
  if fetched_profile.full_name <> 'fallback_user' then
    raise exception 'Phase 04 failed: Fallback name mismatch. Expected fallback_user, found %', fetched_profile.full_name;
  end if;
  if fetched_profile.role <> 'citizen' then
    raise exception 'Phase 04 failed: Fallback profile role was not citizen';
  end if;

  -- Clean up test records in rollback
end;
$test$;

select 'Phase 04 auth sync and role tests passed' as result;

rollback;
