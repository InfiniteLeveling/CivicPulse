-- Phase 12: Geographical Duplicate Complaint Detection
-- Migration: 20261121000900_phase12_duplicate_detection.sql
begin;

-- 1. Optimized composite partial index for public duplicate candidate lookups
-- Accelerates bounding-box and category queries for active public reports
create index if not exists reports_duplicate_lookup
  on public.reports (category, status, latitude, longitude)
  where publication = 'public' and visibility = 'listed';

-- 2. SECURITY INVOKER function for database-side nearby reports discovery
-- Strictly enforces caller RLS (SECURITY INVOKER) and operates with pinned search_path = public, pg_catalog
create or replace function public.find_nearby_reports(
  p_latitude double precision,
  p_longitude double precision,
  p_category text,
  p_radius_meters double precision default 100.0,
  p_limit integer default 5
)
returns table (
  id uuid,
  title text,
  category text,
  status text,
  distance_meters double precision,
  created_at timestamptz
)
language plpgsql
security invoker
set search_path = public, pg_catalog
as $$
declare
  c_earth_radius constant double precision := 6371000.0;
  v_effective_radius double precision;
  v_effective_limit integer;
  v_delta_lat double precision;
begin
  -- Validate finite coordinate bounds
  if p_latitude is null or p_latitude < -90.0 or p_latitude > 90.0 then
    raise exception 'Invalid latitude: must be between -90 and 90';
  end if;

  if p_longitude is null or p_longitude < -180.0 or p_longitude > 180.0 then
    raise exception 'Invalid longitude: must be between -180 and 180';
  end if;

  if p_category is null or length(trim(p_category)) = 0 then
    raise exception 'Category is required';
  end if;

  -- Server-side boundary clamping: Prevents clients from requesting > 100m or > 5 rows
  v_effective_radius := least(greatest(coalesce(p_radius_meters, 100.0), 1.0), 100.0);
  v_effective_limit := least(greatest(coalesce(p_limit, 5), 1), 5);
  v_delta_lat := (v_effective_radius / c_earth_radius) * (180.0 / pi()) * 1.05;

  return query
  select
    r.id,
    r.title,
    r.category,
    r.status,
    -- Exact Haversine spherical distance calculation
    (2.0 * c_earth_radius * asin(sqrt(
      least(1.0, greatest(0.0,
        sin(radians(r.latitude - p_latitude) / 2.0) ^ 2 +
        cos(radians(p_latitude)) * cos(radians(r.latitude)) *
        sin(radians(r.longitude - p_longitude) / 2.0) ^ 2
      ))
    ))) as distance_meters,
    r.created_at
  from public.reports r
  where r.category = p_category
    and r.status in ('pending', 'in_progress')
    -- Bounding box prefilter with 5% safety margin
    and r.latitude between (p_latitude - v_delta_lat) and (p_latitude + v_delta_lat)
    and (2.0 * c_earth_radius * asin(sqrt(
      least(1.0, greatest(0.0,
        sin(radians(r.latitude - p_latitude) / 2.0) ^ 2 +
        cos(radians(p_latitude)) * cos(radians(r.latitude)) *
        sin(radians(r.longitude - p_longitude) / 2.0) ^ 2
      ))
    ))) <= v_effective_radius
  order by distance_meters asc, r.created_at desc, r.id asc
  limit v_effective_limit;
end;
$$;

-- Grant EXECUTE to authenticated and anon (under SECURITY INVOKER, RLS still filters rows)
grant execute on function public.find_nearby_reports(double precision, double precision, text, double precision, integer) to authenticated, anon;

commit;
