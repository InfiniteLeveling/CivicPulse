-- Phase 14: Intelligent Priority Scoring Engine, Severity Weighting, Community Support, Age Recalculation & Secure Ranking
-- Migration: 20261121001100_phase14_priority_scoring.sql
begin;

-- 1. Pure immutable priority calculation formula
-- priority_score = min(100, severityPoints + min(3 * voteCount, 20) + min(2 * daysPending, 10))
create or replace function public.civicpulse_calculate_priority(
  p_severity text,
  p_vote_count integer,
  p_days_pending integer
)
returns integer
language sql
immutable
set search_path = ''
as $$
  select least(
    100,
    greatest(
      0,
      case lower(coalesce(p_severity, 'medium'))
        when 'low' then 15
        when 'medium' then 30
        when 'high' then 50
        when 'critical' then 70
        else 30
      end
      + least(3 * greatest(0, coalesce(p_vote_count, 0)), 20)
      + least(2 * greatest(0, coalesce(p_days_pending, 0)), 10)
    )
  );
$$;

-- 2. Pure stable function to calculate fully elapsed 24-hour periods
-- Unresolved duration stops accumulating when a report is resolved (coalesce to resolved_at).
create or replace function public.civicpulse_calculate_days_pending(
  p_created_at timestamptz,
  p_resolved_at timestamptz default null,
  p_as_of timestamptz default clock_timestamp()
)
returns integer
language sql
stable
set search_path = ''
as $$
  select greatest(
    0,
    floor(
      extract(epoch from (
        coalesce(p_resolved_at, p_as_of) - p_created_at
      )) / 86400
    )::integer
  );
$$;

-- 3. Dynamic report priority calculation function
-- Aggregates authoritative vote count and elapsed time for a given complaint
create or replace function public.civicpulse_compute_report_priority(
  p_report_id uuid,
  p_as_of timestamptz default clock_timestamp()
)
returns integer
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_report record;
  v_vote_count integer := 0;
  v_days_pending integer := 0;
begin
  select id, severity, status, created_at, resolved_at
  into v_report
  from public.reports
  where id = p_report_id;

  if not found then
    return null;
  end if;

  select count(*)::integer into v_vote_count
  from public.report_votes
  where report_id = p_report_id;

  v_days_pending := public.civicpulse_calculate_days_pending(
    v_report.created_at,
    v_report.resolved_at,
    p_as_of
  );

  return public.civicpulse_calculate_priority(
    v_report.severity,
    v_vote_count,
    v_days_pending
  );
end;
$$;

-- 4. Authoritative priority breakdown function
-- Enforces report visibility, voter anonymity, and returns full explainable score components
create or replace function public.civicpulse_get_priority_breakdown(
  p_report_id uuid,
  p_as_of timestamptz default clock_timestamp()
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_caller uuid := auth.uid();
  v_is_admin boolean := false;
  v_report record;
  v_vote_count integer := 0;
  v_days_pending integer := 0;
  v_severity_points integer := 30;
  v_support_points integer := 0;
  v_age_points integer := 0;
  v_final_score integer := 30;
  v_canonical_severity text := 'medium';
  v_is_active boolean := false;
begin
  select id, user_id, severity, status, publication, visibility, created_at, resolved_at
  into v_report
  from public.reports
  where id = p_report_id;

  if not found then
    return null;
  end if;

  if v_caller is not null then
    select (role = 'admin') into v_is_admin from public.profiles where id = v_caller;
    v_is_admin := coalesce(v_is_admin, false);
  end if;

  -- Visibility check: Conceal inaccessible private/unlisted complaints
  if (v_report.publication != 'public' or v_report.visibility != 'listed') then
    if v_caller is null or (v_report.user_id != v_caller and not v_is_admin) then
      return null;
    end if;
  end if;

  -- Authoritative distinct vote count (voter UUIDs never exposed)
  select count(*)::integer into v_vote_count
  from public.report_votes
  where report_id = p_report_id;

  v_canonical_severity := case lower(coalesce(v_report.severity, 'medium'))
    when 'low' then 'low'
    when 'medium' then 'medium'
    when 'high' then 'high'
    when 'critical' then 'critical'
    else 'medium'
  end;

  v_severity_points := case v_canonical_severity
    when 'low' then 15
    when 'medium' then 30
    when 'high' then 50
    when 'critical' then 70
    else 30
  end;

  v_support_points := least(3 * greatest(0, v_vote_count), 20);

  v_days_pending := public.civicpulse_calculate_days_pending(
    v_report.created_at,
    v_report.resolved_at,
    p_as_of
  );
  v_age_points := least(2 * greatest(0, v_days_pending), 10);

  v_final_score := least(100, greatest(0, v_severity_points + v_support_points + v_age_points));
  v_is_active := (v_report.status in ('pending', 'in_progress'));

  return json_build_object(
    'report_id', p_report_id,
    'priority_score', v_final_score,
    'priority_breakdown', json_build_object(
      'severity', v_canonical_severity,
      'severity_points', v_severity_points,
      'support_count', v_vote_count,
      'support_points', v_support_points,
      'days_unresolved', v_days_pending,
      'age_points', v_age_points,
      'priority_score', v_final_score,
      'max_score', 100
    ),
    'calculated_at', coalesce(p_as_of, clock_timestamp()),
    'is_active', v_is_active
  )::jsonb;
end;
$$;

-- 5. Trigger on report_votes to recalculate reports.priority_score automatically upon new votes
create or replace function civicpulse_private.on_vote_recalculate_priority()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_new_priority integer;
begin
  v_new_priority := public.civicpulse_compute_report_priority(new.report_id, clock_timestamp());
  if v_new_priority is not null then
    update public.reports
    set priority_score = v_new_priority
    where id = new.report_id;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_vote_recalculate_priority on public.report_votes;
create trigger trg_vote_recalculate_priority
after insert on public.report_votes
for each row
execute function civicpulse_private.on_vote_recalculate_priority();

-- 6. Priority ranking composite index for fast deterministic sorting
create index if not exists reports_priority_ranking_idx
on public.reports (status, priority_score desc, created_at asc, id asc);

-- 7. Safe Backfill / Synchronization for existing reports
update public.reports r
set priority_score = public.civicpulse_compute_report_priority(r.id, coalesce(r.resolved_at, clock_timestamp()))
where r.priority_score is distinct from public.civicpulse_compute_report_priority(r.id, coalesce(r.resolved_at, clock_timestamp()));

-- 8. Grants
revoke all on function public.civicpulse_calculate_priority(text, integer, integer) from public;
grant execute on function public.civicpulse_calculate_priority(text, integer, integer) to authenticated, anon;

revoke all on function public.civicpulse_calculate_days_pending(timestamptz, timestamptz, timestamptz) from public;
grant execute on function public.civicpulse_calculate_days_pending(timestamptz, timestamptz, timestamptz) to authenticated, anon;

revoke all on function public.civicpulse_compute_report_priority(uuid, timestamptz) from public;
grant execute on function public.civicpulse_compute_report_priority(uuid, timestamptz) to authenticated, anon;

revoke all on function public.civicpulse_get_priority_breakdown(uuid, timestamptz) from public;
grant execute on function public.civicpulse_get_priority_breakdown(uuid, timestamptz) to authenticated, anon;

commit;
