-- Phase 18: Administrative Analytics Engine, KPI Dashboard Aggregations, Performance Metrics, and Workload Analytics
-- Migration: 20261121001500_phase18_admin_analytics.sql
begin;

-- ============================================================================
-- 1. High-Performance Analytics Composite Indexes
-- ============================================================================

-- Fast lookup for created_at range scans and status distribution
create index if not exists reports_analytics_created_at_idx
  on public.reports (created_at desc, status);

-- Fast lookup for resolved_at range scans with resolution duration calculations
create index if not exists reports_analytics_resolved_at_idx
  on public.reports (resolved_at desc, created_at)
  where resolved_at is not null;

-- Partial index for active backlog and department workload aggregations
create index if not exists reports_analytics_active_backlog_idx
  on public.reports (department_id, status)
  where status in ('pending', 'in_progress');

-- Fast index for operational priority ranking on active backlog
create index if not exists reports_analytics_priority_active_idx
  on public.reports (priority_score desc, created_at asc)
  where status in ('pending', 'in_progress');

-- Index for category distribution aggregation within time ranges
create index if not exists reports_analytics_category_created_idx
  on public.reports (category, created_at desc);

-- ============================================================================
-- 2. Stored Procedure: civicpulse_get_analytics_overview
-- Computes system-wide totals, period volume, current statuses, active backlog,
-- unassigned count, and creation-cohort resolution rate in a single round-trip.
-- ============================================================================
create or replace function public.civicpulse_get_analytics_overview(
  p_start timestamptz,
  p_end timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_uid uuid;
  caller_role text;
  v_all_time_total bigint;
  v_created_in_period bigint;
  v_resolved_in_period bigint;
  v_current_pending bigint;
  v_current_in_progress bigint;
  v_current_resolved bigint;
  v_current_active_backlog bigint;
  v_current_unassigned_active bigint;
  v_cohort_resolved bigint;
  v_cohort_rate numeric;
begin
  -- Enforce Administrator Authentication
  current_uid := auth.uid();
  if current_uid is null then
    raise exception 'Unauthorized: Authentication required';
  end if;

  select role into caller_role from public.profiles where id = current_uid;
  if caller_role is distinct from 'admin' then
    raise exception 'Unauthorized: Administrator access required';
  end if;

  -- 1. All-time total reports recorded in system
  select count(*) into v_all_time_total from public.reports;

  -- 2. Reports created within period [p_start, p_end)
  select count(*) into v_created_in_period
  from public.reports
  where created_at >= p_start and created_at < p_end;

  -- 3. Reports resolved within period [p_start, p_end)
  select count(*) into v_resolved_in_period
  from public.reports
  where resolved_at >= p_start and resolved_at < p_end and status = 'resolved';

  -- 4. Current snapshot status counts
  select
    count(*) filter (where status = 'pending'),
    count(*) filter (where status = 'in_progress'),
    count(*) filter (where status = 'resolved'),
    count(*) filter (where status in ('pending', 'in_progress')),
    count(*) filter (where status in ('pending', 'in_progress') and department_id is null)
  into
    v_current_pending,
    v_current_in_progress,
    v_current_resolved,
    v_current_active_backlog,
    v_current_unassigned_active
  from public.reports;

  -- 5. Creation cohort resolution: of reports created in period, how many are currently resolved
  select count(*) into v_cohort_resolved
  from public.reports
  where created_at >= p_start and created_at < p_end and status = 'resolved';

  if v_created_in_period > 0 then
    v_cohort_rate := round((v_cohort_resolved::numeric / v_created_in_period::numeric) * 100.0, 2);
  else
    v_cohort_rate := null;
  end if;

  return jsonb_build_object(
    'all_time_total_reports', coalesce(v_all_time_total, 0),
    'created_in_period', coalesce(v_created_in_period, 0),
    'resolved_in_period', coalesce(v_resolved_in_period, 0),
    'current_pending', coalesce(v_current_pending, 0),
    'current_in_progress', coalesce(v_current_in_progress, 0),
    'current_resolved', coalesce(v_current_resolved, 0),
    'current_active_backlog', coalesce(v_current_active_backlog, 0),
    'current_unassigned_active', coalesce(v_current_unassigned_active, 0),
    'creation_cohort_resolution_rate_percent', v_cohort_rate
  );
end;
$$;

revoke all on function public.civicpulse_get_analytics_overview(timestamptz, timestamptz) from public, anon;
grant execute on function public.civicpulse_get_analytics_overview(timestamptz, timestamptz) to authenticated;

-- ============================================================================
-- 3. Stored Procedure: civicpulse_get_analytics_performance
-- Computes resolution durations (average and exact median via percentile_cont),
-- throughput sample size, active backlog, and aging complaints (> 7 days).
-- ============================================================================
create or replace function public.civicpulse_get_analytics_performance(
  p_start timestamptz,
  p_end timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_uid uuid;
  caller_role text;
  v_resolved_in_period bigint;
  v_sample_size bigint;
  v_avg_hours numeric;
  v_median_hours numeric;
  v_current_active_backlog bigint;
  v_aging_older_than_7_days bigint;
begin
  -- Enforce Administrator Authentication
  current_uid := auth.uid();
  if current_uid is null then
    raise exception 'Unauthorized: Authentication required';
  end if;

  select role into caller_role from public.profiles where id = current_uid;
  if caller_role is distinct from 'admin' then
    raise exception 'Unauthorized: Administrator access required';
  end if;

  -- 1. Performance durations for complaints resolved in [p_start, p_end)
  -- Filter out invalid negative durations (e.g. clock anomalies where resolved_at < created_at)
  select
    count(*),
    count(*) filter (where resolved_at >= created_at),
    round(avg(extract(epoch from (resolved_at - created_at)) / 3600.0)::numeric, 2),
    round(percentile_cont(0.5) within group (order by (extract(epoch from (resolved_at - created_at)) / 3600.0))::numeric, 2)
  into
    v_resolved_in_period,
    v_sample_size,
    v_avg_hours,
    v_median_hours
  from public.reports
  where resolved_at >= p_start and resolved_at < p_end and status = 'resolved';

  -- 2. Current active backlog and aging complaints (> 7 calendar days from creation)
  select
    count(*),
    count(*) filter (where created_at <= (clock_timestamp() - interval '7 days'))
  into
    v_current_active_backlog,
    v_aging_older_than_7_days
  from public.reports
  where status in ('pending', 'in_progress');

  return jsonb_build_object(
    'resolved_in_period', coalesce(v_resolved_in_period, 0),
    'resolution_duration_sample_size', coalesce(v_sample_size, 0),
    'average_resolution_hours', v_avg_hours,
    'median_resolution_hours', v_median_hours,
    'current_active_backlog', coalesce(v_current_active_backlog, 0),
    'active_reports_older_than_7_days', coalesce(v_aging_older_than_7_days, 0)
  );
end;
$$;

revoke all on function public.civicpulse_get_analytics_performance(timestamptz, timestamptz) from public, anon;
grant execute on function public.civicpulse_get_analytics_performance(timestamptz, timestamptz) to authenticated;

-- ============================================================================
-- 4. Stored Procedure: civicpulse_get_department_workload
-- Aggregates current active backlog across all registered departments plus unassigned.
-- ============================================================================
create or replace function public.civicpulse_get_department_workload()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_uid uuid;
  caller_role text;
  v_departments jsonb;
  v_unassigned_active bigint;
  v_total_active_backlog bigint;
begin
  -- Enforce Administrator Authentication
  current_uid := auth.uid();
  if current_uid is null then
    raise exception 'Unauthorized: Authentication required';
  end if;

  select role into caller_role from public.profiles where id = current_uid;
  if caller_role is distinct from 'admin' then
    raise exception 'Unauthorized: Administrator access required';
  end if;

  -- 1. Aggregate active complaints grouped by registered department
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'department_id', d.id,
      'department_name', d.name,
      'pending_count', coalesce(counts.pending_c, 0),
      'in_progress_count', coalesce(counts.in_prog_c, 0),
      'active_count', coalesce(counts.pending_c, 0) + coalesce(counts.in_prog_c, 0)
    ) order by d.name asc
  ), '[]'::jsonb)
  into v_departments
  from public.departments d
  left join (
    select
      department_id,
      count(*) filter (where status = 'pending') as pending_c,
      count(*) filter (where status = 'in_progress') as in_prog_c
    from public.reports
    where status in ('pending', 'in_progress') and department_id is not null
    group by department_id
  ) counts on counts.department_id = d.id;

  -- 2. Count active complaints with department_id IS NULL
  select count(*) into v_unassigned_active
  from public.reports
  where status in ('pending', 'in_progress') and department_id is null;

  -- 3. Total active backlog
  select count(*) into v_total_active_backlog
  from public.reports
  where status in ('pending', 'in_progress');

  return jsonb_build_object(
    'workload_basis', 'current_assignment',
    'total_active_backlog', coalesce(v_total_active_backlog, 0),
    'unassigned_active_count', coalesce(v_unassigned_active, 0),
    'departments', v_departments
  );
end;
$$;

revoke all on function public.civicpulse_get_department_workload() from public, anon;
grant execute on function public.civicpulse_get_department_workload() to authenticated;

commit;
