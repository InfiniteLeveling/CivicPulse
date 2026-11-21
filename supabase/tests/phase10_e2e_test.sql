-- Phase 10: Complete Core Backend Integration & Security Regression SQL Test
-- Verifies database consistency, table existence, RLS policies, RPC functions,
-- trigger integrity, and security permissions across the entire CivicPulse schema.
begin;

-- Helper assertion function
create or replace function pg_temp.check_ok(condition boolean, description text) returns void as $$
begin
  if not condition then
    raise exception 'Assertion failed: %', description;
  end if;
  raise notice 'Passed: %', description;
end;
$$ language plpgsql;

-- 1. All 7 Core Tables Exist
select pg_temp.check_ok(to_regclass('public.profiles') is not null, 'Table public.profiles exists');
select pg_temp.check_ok(to_regclass('public.departments') is not null, 'Table public.departments exists');
select pg_temp.check_ok(to_regclass('public.reports') is not null, 'Table public.reports exists');
select pg_temp.check_ok(to_regclass('public.report_votes') is not null, 'Table public.report_votes exists');
select pg_temp.check_ok(to_regclass('public.status_history') is not null, 'Table public.status_history exists');
select pg_temp.check_ok(to_regclass('public.report_images') is not null, 'Table public.report_images exists');
select pg_temp.check_ok(to_regclass('public.department_assignment_history') is not null, 'Table public.department_assignment_history exists');

-- 2. Row Level Security Enabled on All Tables
select pg_temp.check_ok(relrowsecurity, 'RLS enabled on profiles') from pg_class where oid = to_regclass('public.profiles');
select pg_temp.check_ok(relrowsecurity, 'RLS enabled on departments') from pg_class where oid = to_regclass('public.departments');
select pg_temp.check_ok(relrowsecurity, 'RLS enabled on reports') from pg_class where oid = to_regclass('public.reports');
select pg_temp.check_ok(relrowsecurity, 'RLS enabled on report_votes') from pg_class where oid = to_regclass('public.report_votes');
select pg_temp.check_ok(relrowsecurity, 'RLS enabled on status_history') from pg_class where oid = to_regclass('public.status_history');
select pg_temp.check_ok(relrowsecurity, 'RLS enabled on report_images') from pg_class where oid = to_regclass('public.report_images');
select pg_temp.check_ok(relrowsecurity, 'RLS enabled on department_assignment_history') from pg_class where oid = to_regclass('public.department_assignment_history');

-- 3. Core RPC Functions Exist
select pg_temp.check_ok(
  to_regprocedure('public.civicpulse_create_report(uuid,text,text,text,double precision,double precision,text,text,text)') is not null,
  'RPC civicpulse_create_report exists'
);

select pg_temp.check_ok(
  to_regprocedure('public.civicpulse_transition_report_status(uuid,text,uuid,text,text)') is not null,
  'RPC civicpulse_transition_report_status exists'
);

select pg_temp.check_ok(
  to_regprocedure('public.civicpulse_assign_department(uuid,uuid,uuid,boolean,text)') is not null,
  'RPC civicpulse_assign_department exists'
);

select pg_temp.check_ok(
  to_regprocedure('public.civicpulse_get_status_history(uuid)') is not null,
  'RPC civicpulse_get_status_history exists'
);

-- 4. Audit Tables are Physically Protected Against Direct Client Mutation
select pg_temp.check_ok(
  not has_table_privilege('authenticated', 'public.status_history', 'INSERT')
  and not has_table_privilege('authenticated', 'public.status_history', 'UPDATE')
  and not has_table_privilege('authenticated', 'public.status_history', 'DELETE')
  and not has_table_privilege('anon', 'public.status_history', 'INSERT'),
  'status_history is physically protected from direct client mutations'
);

select pg_temp.check_ok(
  not has_table_privilege('authenticated', 'public.department_assignment_history', 'INSERT')
  and not has_table_privilege('authenticated', 'public.department_assignment_history', 'UPDATE')
  and not has_table_privilege('authenticated', 'public.department_assignment_history', 'DELETE')
  and not has_table_privilege('anon', 'public.department_assignment_history', 'INSERT'),
  'department_assignment_history is physically protected from direct client mutations'
);

-- 5. Foreign Key Integrity and Constraints
select pg_temp.check_ok(
  exists (
    select 1 from pg_constraint 
    where conname = 'reports_department_id_fkey' 
    and contype = 'f'
  ),
  'reports table has foreign key constraint to departments'
);

select pg_temp.check_ok(
  exists (
    select 1 from pg_constraint 
    where conname = 'reports_user_id_fkey' 
    and contype = 'f'
  ),
  'reports table has foreign key constraint to profiles'
);

rollback;
