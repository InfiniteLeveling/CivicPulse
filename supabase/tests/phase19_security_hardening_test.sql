-- Phase 19: Security Hardening Verification Script
-- File: supabase/tests/phase19_security_hardening_test.sql
begin;

do $$
declare
  v_admin_id uuid := '22222222-2222-4222-8222-222222222222';
  v_citizen_a_id uuid := '11111111-1111-4111-8111-111111111111';
  v_citizen_b_id uuid := '33333333-3333-4333-8333-333333333333';
  v_report_id uuid := '44444444-4444-4444-8444-444444444444';
  v_denied boolean := false;
begin
  -- 1. Setup Profiles
  insert into public.profiles (id, full_name, role)
  values
    (v_admin_id, 'Security Admin', 'admin'),
    (v_citizen_a_id, 'Citizen Alice', 'citizen'),
    (v_citizen_b_id, 'Citizen Bob', 'citizen')
  on conflict (id) do update set role = excluded.role;

  -- 2. Setup Test Report owned by Citizen A
  insert into public.reports (
    id, user_id, submission_key, title, description, category,
    latitude, longitude, publication, visibility, status
  ) values (
    v_report_id, v_citizen_a_id, gen_random_uuid(),
    'Security Hardening Pothole', 'Report for RLS policy verification.',
    'pothole', 22.57, 88.36, 'public', 'listed', 'pending'
  ) on conflict (id) do nothing;

  -- 3. Verify Self-Voting RLS Prevention: Citizen A cannot insert into report_votes for own report
  perform set_config('request.jwt.claim.sub', v_citizen_a_id::text, true);
  v_denied := false;
  begin
    insert into public.report_votes (report_id, user_id)
    values (v_report_id, v_citizen_a_id);
  exception when others then
    v_denied := true;
  end;

  if not v_denied then
    raise exception 'Security regression: Citizen was able to insert vote on own report via direct RLS!';
  end if;

  -- 4. Verify Citizen B CAN upvote Citizen A's report under RLS
  perform set_config('request.jwt.claim.sub', v_citizen_b_id::text, true);
  insert into public.report_votes (report_id, user_id)
  values (v_report_id, v_citizen_b_id)
  on conflict (report_id, user_id) do nothing;

  -- 5. Verify Citizen B CANNOT delete or update report_votes
  v_denied := false;
  begin
    delete from public.report_votes where report_id = v_report_id and user_id = v_citizen_b_id;
  exception when others then
    v_denied := true;
  end;

  if not v_denied then
    raise exception 'Security regression: Citizen was able to delete report_votes directly!';
  end if;

  -- 6. Verify Citizen cannot call admin status transition RPC
  v_denied := false;
  begin
    perform public.civicpulse_transition_report_status(v_report_id, 'in_progress', 'Unauthorized note');
  exception when others then
    v_denied := true;
  end;

  if not v_denied then
    raise exception 'Security regression: Citizen was able to invoke civicpulse_transition_report_status!';
  end if;

  -- 7. Verify Citizen cannot call admin department assignment RPC
  v_denied := false;
  begin
    perform public.civicpulse_assign_department(v_report_id, 'd1111111-1111-4111-8111-111111111111');
  exception when others then
    v_denied := true;
  end;

  if not v_denied then
    raise exception 'Security regression: Citizen was able to invoke civicpulse_assign_department!';
  end if;

  -- 8. Verify Citizen cannot call admin analytics overview RPC
  v_denied := false;
  begin
    perform public.civicpulse_get_analytics_overview(now() - interval '30 days', now() + interval '1 day');
  exception when others then
    v_denied := true;
  end;

  if not v_denied then
    raise exception 'Security regression: Citizen was able to invoke civicpulse_get_analytics_overview!';
  end if;

  raise notice 'Phase 19 Security Hardening SQL verification passed successfully.';
end;
$$;

rollback;
