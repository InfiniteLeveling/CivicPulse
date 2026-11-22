-- Phase 12: Duplicate Detection SQL Verification Script
-- File: supabase/tests/phase12_duplicate_test.sql

begin;

-- Verify index exists
do $$
begin
  if not exists (
    select 1 from pg_indexes
    where schemaname = 'public'
      and tablename = 'reports'
      and indexname = 'reports_duplicate_lookup'
  ) then
    raise exception 'Assertion failed: reports_duplicate_lookup index does not exist';
  end if;
  raise notice 'Passed: reports_duplicate_lookup index confirmed.';
end;
$$;

-- Verify find_nearby_reports function exists with SECURITY INVOKER
do $$
declare
  v_secdef boolean;
begin
  select prosecdef into v_secdef
  from pg_proc
  where proname = 'find_nearby_reports'
    and pronamespace = 'public'::regnamespace;

  if v_secdef is null then
    raise exception 'Assertion failed: find_nearby_reports function not found';
  end if;

  if v_secdef = true then
    raise exception 'Assertion failed: find_nearby_reports must be SECURITY INVOKER (prosecdef=false)';
  end if;

  raise notice 'Passed: find_nearby_reports exists and is strictly SECURITY INVOKER.';
end;
$$;

rollback;
