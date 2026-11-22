-- Phase 13: Authenticated Community Support & Secure Upvoting
-- Migration: 20261121001000_phase13_community_support.sql
begin;

-- 1. Index on report_id for high-performance aggregate support counting
create index if not exists report_votes_report_idx on public.report_votes (report_id);

-- 2. Atomic community support upvoting function
-- Enforces:
-- - Verified authenticated citizen identity (auth.uid())
-- - Rejection of administrative accounts (citizen participation only)
-- - Rejection of self-voting (creators cannot upvote their own complaints)
-- - Status eligibility ('pending' and 'in_progress' only; 'resolved' closed)
-- - Report visibility (inaccessible private reports return not found)
-- - Concurrency safety via FOR SHARE row lock and ON CONFLICT DO NOTHING
create or replace function public.civicpulse_support_report(p_report_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_caller uuid := auth.uid();
  v_is_admin boolean := false;
  v_report record;
  v_already_supported boolean := false;
  v_support_count integer := 0;
begin
  -- 1. Require authenticated session
  if v_caller is null then
    raise exception 'Authentication required to support complaints' using errcode = '42501';
  end if;

  -- 2. Verify caller role: Admins cannot vote
  select (role = 'admin') into v_is_admin from public.profiles where id = v_caller;
  if coalesce(v_is_admin, false) then
    raise exception 'Administrative accounts cannot upvote complaints' using errcode = '42501';
  end if;

  -- 3. Lock report row for status concurrency protection (FOR SHARE)
  select id, user_id, status, publication, visibility
  into v_report
  from public.reports
  where id = p_report_id
  for share;

  if not found then
    raise exception 'Report not found' using errcode = 'P0002';
  end if;

  -- 4. Visibility verification: private complaints not accessible to other users
  if (v_report.publication != 'public' or v_report.visibility != 'listed') and v_report.user_id != v_caller then
    raise exception 'Report not found' using errcode = 'P0002';
  end if;

  -- 5. Self-voting policy: Report creators cannot upvote their own complaints
  if v_report.user_id = v_caller then
    raise exception 'Report creators cannot support their own complaints' using errcode = '42501';
  end if;

  -- 6. Report eligibility: active complaints only ('pending', 'in_progress')
  if v_report.status not in ('pending', 'in_progress') then
    raise exception 'Complaint is not eligible for community support' using errcode = '23514';
  end if;

  -- 7. Insert vote atomically with ON CONFLICT (report_id, user_id) DO NOTHING
  insert into public.report_votes (report_id, user_id)
  values (p_report_id, v_caller)
  on conflict (report_id, user_id) do nothing;

  if not found then
    v_already_supported := true;
  else
    v_already_supported := false;
  end if;

  -- 8. Authoritative current support count
  select count(*)::integer into v_support_count
  from public.report_votes
  where report_id = p_report_id;

  return json_build_object(
    'report_id', p_report_id,
    'supported', true,
    'already_supported', v_already_supported,
    'support_count', v_support_count
  )::jsonb;
end;
$$;

-- 3. Community support summary function
-- Computes global support count without exposing individual voter identities,
-- checks current user personal support state, and evaluates can_support UX flag.
create or replace function public.civicpulse_get_support_summary(p_report_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_caller uuid := auth.uid();
  v_is_admin boolean := false;
  v_report record;
  v_support_count integer := 0;
  v_current_user_supported boolean := false;
  v_can_support boolean := false;
begin
  -- 1. Check report existence and authorization
  select id, user_id, status, publication, visibility
  into v_report
  from public.reports
  where id = p_report_id;

  if not found then
    return null;
  end if;

  -- Verify admin status if caller is authenticated
  if v_caller is not null then
    select (role = 'admin') into v_is_admin from public.profiles where id = v_caller;
    v_is_admin := coalesce(v_is_admin, false);
  end if;

  -- 2. Visibility check: Only public listed reports or owner/admin can access summary
  if (v_report.publication != 'public' or v_report.visibility != 'listed') then
    if v_caller is null or (v_report.user_id != v_caller and not v_is_admin) then
      return null; -- Conceal private report completely (maps to 404)
    end if;
  end if;

  -- 3. Accurate global count (runs under SECURITY DEFINER without exposing individual voters)
  select count(*)::integer into v_support_count
  from public.report_votes
  where report_id = p_report_id;

  -- 4. Check if current user has supported
  if v_caller is not null then
    select exists (
      select 1 from public.report_votes
      where report_id = p_report_id and user_id = v_caller
    ) into v_current_user_supported;
  end if;

  -- 5. Calculate can_support advisory flag
  v_can_support := (
    v_caller is not null and
    not v_is_admin and
    v_report.status in ('pending', 'in_progress') and
    v_report.user_id != v_caller and
    not v_current_user_supported
  );

  return json_build_object(
    'report_id', p_report_id,
    'support_count', v_support_count,
    'current_user_supported', v_current_user_supported,
    'can_support', v_can_support
  )::jsonb;
end;
$$;

-- 4. Function Execution Grants
revoke all on function public.civicpulse_support_report(uuid) from public, anon;
grant execute on function public.civicpulse_support_report(uuid) to authenticated;

revoke all on function public.civicpulse_get_support_summary(uuid) from public;
grant execute on function public.civicpulse_get_support_summary(uuid) to authenticated, anon;

commit;
