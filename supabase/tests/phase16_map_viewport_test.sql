-- CivicPulse Phase 16: Map Viewport Spatial Index and Query Function Verification
-- Test Script: supabase/tests/phase16_map_viewport_test.sql

begin;

-- 1. Verify spatial index exists on public.reports
do $$
begin
  assert exists (
    select 1
    from pg_indexes
    where schemaname = 'public'
      and tablename = 'reports'
      and indexname = 'reports_spatial_viewport_idx'
  ), 'reports_spatial_viewport_idx partial spatial index missing';
end;
$$;

-- 2. Verify civicpulse_get_map_markers exists and is SECURITY INVOKER
do $$
declare
  v_secdef boolean;
begin
  select prosecdef into v_secdef
  from pg_proc
  where proname = 'civicpulse_get_map_markers';

  assert v_secdef = false, 'civicpulse_get_map_markers must be SECURITY INVOKER (prosecdef=false) to respect RLS';
end;
$$;

-- 3. Verify parameter signature and grants
do $$
begin
  assert has_function_privilege('anon', 'public.civicpulse_get_map_markers(double precision, double precision, double precision, double precision, text, text, text, uuid, integer)', 'EXECUTE'),
    'anon role must have EXECUTE privilege on civicpulse_get_map_markers';

  assert has_function_privilege('authenticated', 'public.civicpulse_get_map_markers(double precision, double precision, double precision, double precision, text, text, text, uuid, integer)', 'EXECUTE'),
    'authenticated role must have EXECUTE privilege on civicpulse_get_map_markers';
end;
$$;

rollback;
