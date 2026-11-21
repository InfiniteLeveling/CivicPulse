-- Phase 17 Migration Verification Test
-- Validates resolution evidence enforcement, database triggers, and RPC function signatures.

begin;

-- 1. Verify civicpulse_transition_report_status has 5 arguments
do $$
declare
  v_args integer;
begin
  select pronargs into v_args
  from pg_proc
  where proname = 'civicpulse_transition_report_status';

  if v_args is null or v_args < 5 then
    raise exception 'TEST FAILED: civicpulse_transition_report_status must accept 5 arguments including p_after_image_path';
  end if;
  raise notice 'CHECK PASSED: civicpulse_transition_report_status accepts 5 arguments.';
end;
$$;

-- 2. Verify trigger civicpulse_check_resolution_evidence exists on public.reports
do $$
begin
  if not exists (
    select 1
    from pg_trigger
    where tgname = 'reports_resolution_evidence_check'
      and tgrelid = 'public.reports'::regclass
  ) then
    raise exception 'TEST FAILED: reports_resolution_evidence_check trigger is missing on public.reports';
  end if;
  raise notice 'CHECK PASSED: reports_resolution_evidence_check trigger verified on public.reports.';
end;
$$;

-- 3. Verify function civicpulse_check_resolution_evidence exists
do $$
begin
  if not exists (
    select 1 from pg_proc where proname = 'civicpulse_check_resolution_evidence'
  ) then
    raise exception 'TEST FAILED: civicpulse_check_resolution_evidence function is missing';
  end if;
  raise notice 'CHECK PASSED: civicpulse_check_resolution_evidence function verified.';
end;
$$;

-- 4. Verify RLS policy image_admin_create on public.report_images
do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'report_images'
      and policyname = 'image_admin_create'
  ) then
    raise exception 'TEST FAILED: image_admin_create policy is missing on public.report_images';
  end if;
  raise notice 'CHECK PASSED: image_admin_create policy verified on public.report_images.';
end;
$$;

rollback;
