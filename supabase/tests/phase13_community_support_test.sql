-- Phase 13: Community Support SQL Verification Script
-- File: supabase/tests/phase13_community_support_test.sql

begin;

-- 1. Verify report_votes_once unique constraint exists
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'report_votes_once'
      and conrelid = 'public.report_votes'::regclass
  ) then
    raise exception 'Assertion failed: report_votes_once constraint does not exist';
  end if;
  raise notice 'Passed: report_votes_once composite unique constraint confirmed.';
end;
$$;

-- 2. Verify report_votes_report_idx index exists
do $$
begin
  if not exists (
    select 1 from pg_indexes
    where schemaname = 'public'
      and tablename = 'report_votes'
      and indexname = 'report_votes_report_idx'
  ) then
    raise exception 'Assertion failed: report_votes_report_idx index does not exist';
  end if;
  raise notice 'Passed: report_votes_report_idx index confirmed.';
end;
$$;

-- 3. Verify civicpulse_support_report function exists with SECURITY DEFINER
do $$
declare
  v_secdef boolean;
begin
  select prosecdef into v_secdef
  from pg_proc
  where proname = 'civicpulse_support_report'
    and pronamespace = 'public'::regnamespace;

  if v_secdef is null or v_secdef = false then
    raise exception 'Assertion failed: civicpulse_support_report must exist and be SECURITY DEFINER';
  end if;
  raise notice 'Passed: civicpulse_support_report exists and is SECURITY DEFINER.';
end;
$$;

-- 4. Verify civicpulse_get_support_summary function exists with SECURITY DEFINER
do $$
declare
  v_secdef boolean;
begin
  select prosecdef into v_secdef
  from pg_proc
  where proname = 'civicpulse_get_support_summary'
    and pronamespace = 'public'::regnamespace;

  if v_secdef is null or v_secdef = false then
    raise exception 'Assertion failed: civicpulse_get_support_summary must exist and be SECURITY DEFINER';
  end if;
  raise notice 'Passed: civicpulse_get_support_summary exists and is SECURITY DEFINER.';
end;
$$;

rollback;
