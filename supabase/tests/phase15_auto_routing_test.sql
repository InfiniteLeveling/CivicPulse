-- CivicPulse Phase 15: Automatic Department Routing Database Verification
-- Test Script: supabase/tests/phase15_auto_routing_test.sql

begin;

-- Verify seeded departments exist
do $$
declare
  v_count integer;
begin
  select count(*) into v_count from public.departments
  where name in ('Road Maintenance', 'Sanitation', 'Water Supply', 'Electrical', 'Drainage', 'Public Works');
  if v_count < 6 then
    raise notice 'Warning: Some canonical departments are not seeded yet (found %)', v_count;
  end if;
end;
$$;

-- Verify reports columns
do $$
begin
  assert exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'reports' and column_name = 'manual_override'
  ), 'reports.manual_override column missing';

  assert exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'reports' and column_name = 'assignment_source'
  ), 'reports.assignment_source column missing';
end;
$$;

-- Verify department_assignment_history columns and nullability
do $$
begin
  assert exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'department_assignment_history'
      and column_name = 'assigned_by' and is_nullable = 'YES'
  ), 'department_assignment_history.assigned_by must be nullable for system actor';

  assert exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'department_assignment_history'
      and column_name = 'assignment_source'
  ), 'department_assignment_history.assignment_source column missing';

  assert exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'department_assignment_history'
      and column_name = 'rule_key'
  ), 'department_assignment_history.rule_key column missing';
end;
$$;

-- Verify function exists and is security definer
do $$
declare
  v_secdef boolean;
begin
  select prosecdef into v_secdef
  from pg_proc
  where proname = 'civicpulse_auto_route_report';

  assert v_secdef = true, 'civicpulse_auto_route_report must be SECURITY DEFINER';
end;
$$;

rollback;
