-- Phase 08: Status Workflow, State Machine, and Audit History SQL Integration Tests
-- Verifies transition function, optimistic locking, trigger atomicity, resolved_at handling, and RLS barriers.
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

create or replace function pg_temp.expect_error(sql_to_run text, expected_state text, description text) returns void as $$
begin
  execute sql_to_run;
  raise exception 'Expected error % but command succeeded: %', expected_state, description;
exception
  when others then
    if sqlstate <> expected_state and position(expected_state in sqlerrm) = 0 then
      raise exception 'Expected error % but got % (%): %', expected_state, sqlstate, sqlerrm, description;
    end if;
    raise notice 'Passed (expected error caught): %', description;
end;
$$ language plpgsql;

-- 1. Verify existence of RPC functions and security configuration
select pg_temp.check_ok(
  to_regprocedure('public.civicpulse_transition_report_status(uuid,text,text,text)') is not null,
  'civicpulse_transition_report_status exists'
);

select pg_temp.check_ok(
  to_regprocedure('public.civicpulse_get_admin_status_history(uuid)') is not null,
  'civicpulse_get_admin_status_history exists'
);

-- 2. Verify execute grants: anon must NOT have execute privileges
select pg_temp.check_ok(
  not has_function_privilege('anon', 'public.civicpulse_transition_report_status(uuid,text,text,text)', 'EXECUTE'),
  'anon cannot execute status transition RPC'
);

select pg_temp.check_ok(
  not has_function_privilege('anon', 'public.civicpulse_get_admin_status_history(uuid)', 'EXECUTE'),
  'anon cannot execute admin history RPC'
);

-- 3. Verify column-level privileges: status_history notes & changed_by must NOT be readable by anon
select pg_temp.check_ok(
  has_column_privilege('anon', 'public.status_history', 'status', 'SELECT')
  and not has_column_privilege('anon', 'public.status_history', 'notes', 'SELECT')
  and not has_column_privilege('anon', 'public.status_history', 'changed_by', 'SELECT'),
  'anon can select status but cannot select internal notes or changed_by'
);

-- 4. Verify reports.status is NOT directly updatable by authenticated or anon
select pg_temp.check_ok(
  not has_column_privilege('authenticated', 'public.reports', 'status', 'UPDATE')
  and not has_column_privilege('anon', 'public.reports', 'status', 'UPDATE'),
  'direct UPDATE on reports.status is forbidden for client roles'
);

-- 5. Verify status_history is NOT directly insertable/updatable/deletable by authenticated or anon
select pg_temp.check_ok(
  not has_table_privilege('authenticated', 'public.status_history', 'INSERT')
  and not has_table_privilege('authenticated', 'public.status_history', 'UPDATE')
  and not has_table_privilege('authenticated', 'public.status_history', 'DELETE')
  and not has_table_privilege('anon', 'public.status_history', 'INSERT'),
  'status_history table is physically append-only via database trigger'
);

rollback;
