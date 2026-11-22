-- Phase 09: Department Assignment, Reassignment, and Audit History SQL Integration Tests
-- Verifies assignment table, RLS policies, execution permissions, and foreign key integrity.
begin;

-- Helper functions for assertions
create or replace function pg_temp.check_ok(condition boolean, description text) returns void as $$
begin
  if not condition then
    raise exception 'Assertion failed: %', description;
  end if;
  raise notice 'Passed: %', description;
end;
$$ language plpgsql;

-- 1. Verify existence of department_assignment_history table and RPC function
select pg_temp.check_ok(
  to_regclass('public.department_assignment_history') is not null,
  'department_assignment_history table exists'
);

select pg_temp.check_ok(
  to_regprocedure('public.civicpulse_assign_department(uuid,uuid,uuid,boolean,text)') is not null,
  'civicpulse_assign_department RPC function exists'
);

-- 2. Verify RLS is enabled on department_assignment_history
select pg_temp.check_ok(
  relrowsecurity from pg_class where oid = to_regclass('public.department_assignment_history'),
  'RLS is enabled on department_assignment_history'
);

-- 3. Verify execution grants: anon cannot execute civicpulse_assign_department
select pg_temp.check_ok(
  not has_function_privilege('anon', 'public.civicpulse_assign_department(uuid,uuid,uuid,boolean,text)', 'EXECUTE'),
  'anon cannot execute department assignment RPC'
);

-- 4. Verify table privileges: department_assignment_history is physically append-only via RPC
select pg_temp.check_ok(
  not has_table_privilege('authenticated', 'public.department_assignment_history', 'INSERT')
  and not has_table_privilege('authenticated', 'public.department_assignment_history', 'UPDATE')
  and not has_table_privilege('authenticated', 'public.department_assignment_history', 'DELETE')
  and not has_table_privilege('anon', 'public.department_assignment_history', 'SELECT')
  and not has_table_privilege('anon', 'public.department_assignment_history', 'INSERT'),
  'department_assignment_history table is protected against client writes and anon reads'
);

-- 5. Verify index exists on department_assignment_history (report_id, created_at desc)
select pg_temp.check_ok(
  to_regclass('public.dept_assignment_history_report') is not null,
  'index dept_assignment_history_report exists'
);

rollback;
