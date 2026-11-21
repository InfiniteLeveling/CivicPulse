-- Phase 18: Verification Script for Administrative Analytics Migration
-- File: supabase/tests/phase18_analytics_test.sql
begin;

do $$
declare
  v_test_admin_id uuid := '22222222-2222-4222-8222-222222222222';
  v_test_citizen_id uuid := '11111111-1111-4111-8111-111111111111';
  v_overview jsonb;
  v_perf jsonb;
  v_workload jsonb;
  v_denied boolean := false;
begin
  -- 1. Ensure test admin profile exists
  insert into public.profiles (id, email, role, full_name)
  values (v_test_admin_id, 'admin_analytics@civicpulse.org', 'admin', 'Analytics Admin')
  on conflict (id) do update set role = 'admin';

  insert into public.profiles (id, email, role, full_name)
  values (v_test_citizen_id, 'citizen_analytics@civicpulse.org', 'citizen', 'Citizen User')
  on conflict (id) do update set role = 'citizen';

  -- 2. Verify non-admin is strictly rejected
  perform set_config('request.jwt.claim.sub', v_test_citizen_id::text, true);
  begin
    perform public.civicpulse_get_analytics_overview(now() - interval '30 days', now() + interval '1 day');
  exception when others then
    v_denied := true;
  end;

  if not v_denied then
    raise exception 'Security regression: non-admin was permitted to call civicpulse_get_analytics_overview!';
  end if;

  -- 3. Verify admin access and calculation execution
  perform set_config('request.jwt.claim.sub', v_test_admin_id::text, true);

  v_overview := public.civicpulse_get_analytics_overview(now() - interval '30 days', now() + interval '1 day');
  if v_overview is null or not (v_overview ? 'all_time_total_reports') then
    raise exception 'Overview RPC returned invalid structure: %', v_overview;
  end if;

  v_perf := public.civicpulse_get_analytics_performance(now() - interval '30 days', now() + interval '1 day');
  if v_perf is null or not (v_perf ? 'resolved_in_period') then
    raise exception 'Performance RPC returned invalid structure: %', v_perf;
  end if;

  v_workload := public.civicpulse_get_department_workload();
  if v_workload is null or not (v_workload ? 'departments') then
    raise exception 'Workload RPC returned invalid structure: %', v_workload;
  end if;

  raise notice 'Phase 18 Analytics SQL verification succeeded.';
end;
$$;

rollback;
