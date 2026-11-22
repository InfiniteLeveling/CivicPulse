-- Phase 16: Interactive Map Backend, Geographic Bounding-Box Spatial Queries,
-- Antimeridian Longitude Wrapping, Secure Map Markers & Viewport Filtering
-- Migration: 20261121001300_phase16_map_viewport.sql

begin;

-- 1. Optimized Spatial Partial Index
-- Accelerates bounding-box geographic queries on public, listed complaints.
create index if not exists reports_spatial_viewport_idx
  on public.reports (latitude, longitude, status)
  where publication = 'public' and visibility = 'listed';

-- 2. Secure Map Marker Retrieval Function (SECURITY INVOKER)
-- Enforces caller's RLS policies; provides native database bounding-box filtering
-- with full International Date Line (antimeridian) wraparound support.
create or replace function public.civicpulse_get_map_markers(
  p_south double precision,
  p_west double precision,
  p_north double precision,
  p_east double precision,
  p_category text default null,
  p_status text default null,
  p_severity text default null,
  p_department_id uuid default null,
  p_limit integer default 200
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_limit integer;
  v_crosses_antimeridian boolean;
  v_markers jsonb;
  v_returned_count integer;
  v_has_more boolean;
begin
  -- Validate bounding box coordinates
  if p_south is null or p_west is null or p_north is null or p_east is null then
    raise exception 'INVALID_PARAMETER: Viewport coordinates (south, west, north, east) are required' using errcode = '22023';
  end if;

  if p_south < -90 or p_south > 90 or p_north < -90 or p_north > 90 then
    raise exception 'INVALID_PARAMETER: Latitude must be between -90 and +90 degrees' using errcode = '22023';
  end if;

  if p_west < -180 or p_west > 180 or p_east < -180 or p_east > 180 then
    raise exception 'INVALID_PARAMETER: Longitude must be between -180 and +180 degrees' using errcode = '22023';
  end if;

  if p_south >= p_north then
    raise exception 'INVALID_PARAMETER: Southern latitude must be strictly less than northern latitude' using errcode = '22023';
  end if;

  if p_west = p_east then
    raise exception 'INVALID_PARAMETER: Western and eastern longitudes cannot be identical' using errcode = '22023';
  end if;

  -- Clamp limit between 1 and 300 (default 200)
  v_limit := greatest(1, least(coalesce(p_limit, 200), 300));
  v_crosses_antimeridian := (p_west > p_east);

  -- Execute query with RLS enforcement (SECURITY INVOKER)
  with candidate_reports as (
    select
      r.id,
      r.latitude,
      r.longitude,
      r.title,
      r.category,
      r.status,
      r.severity,
      r.priority_score,
      r.created_at,
      d.id as dept_id,
      d.name as dept_name
    from public.reports r
    left join public.departments d on d.id = r.department_id
    where
      r.latitude >= p_south
      and r.latitude <= p_north
      and (
        case
          when v_crosses_antimeridian then (r.longitude >= p_west or r.longitude <= p_east)
          else (r.longitude >= p_west and r.longitude <= p_east)
        end
      )
      and (p_category is null or r.category = p_category)
      and (
        case
          when p_status = 'all' then r.status in ('pending', 'in_progress', 'resolved')
          when p_status is not null then r.status = p_status
          else r.status in ('pending', 'in_progress')
        end
      )
      and (p_severity is null or r.severity = p_severity)
      and (p_department_id is null or r.department_id = p_department_id)
    order by r.created_at desc, r.id desc
    limit (v_limit + 1)
  ),
  bounded_slice as (
    select * from candidate_reports limit v_limit
  ),
  marker_json as (
    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'id', b.id,
          'latitude', b.latitude,
          'longitude', b.longitude,
          'title', b.title,
          'category', b.category,
          'status', b.status,
          'severity', b.severity,
          'priority_score', b.priority_score,
          'department', case
            when b.dept_id is not null then jsonb_build_object('id', b.dept_id, 'name', b.dept_name)
            else null
          end,
          'created_at', b.created_at
        )
      ),
      '[]'::jsonb
    ) as agg_markers,
    count(*)::integer as total_sliced
    from bounded_slice b
  )
  select
    agg_markers,
    total_sliced,
    ((select count(*) from candidate_reports) > v_limit)
  into v_markers, v_returned_count, v_has_more
  from marker_json;

  return jsonb_build_object(
    'markers', v_markers,
    'viewport', jsonb_build_object(
      'south', p_south,
      'west', p_west,
      'north', p_north,
      'east', p_east,
      'crosses_antimeridian', v_crosses_antimeridian
    ),
    'returned_count', coalesce(v_returned_count, 0),
    'limit', v_limit,
    'has_more', coalesce(v_has_more, false)
  );
end;
$$;

revoke all on function public.civicpulse_get_map_markers(double precision, double precision, double precision, double precision, text, text, text, uuid, integer) from public;
grant execute on function public.civicpulse_get_map_markers(double precision, double precision, double precision, double precision, text, text, text, uuid, integer) to anon, authenticated;

commit;
