-- Phase 07: Public Report Retrieval, Scoped Data Projection & Performance Indexes
-- Migration: 20261121000600_phase07_report_retrieval.sql
begin;

-- 1. Public Grants and RLS for public.reports
-- Grant only safe, non-sensitive columns to anon (excludes user_id and submission_key)
grant select (
  id, reference, title, description, category, severity, status,
  latitude, longitude, publication, visibility, priority_score,
  department_id, created_at, updated_at
) on public.reports to anon;

drop policy if exists report_public_read on public.reports;
create policy report_public_read on public.reports
for select to anon, authenticated
using (publication = 'public' and visibility = 'listed');

-- 2. Public Grants and RLS for public.departments
grant select (id, name, description) on public.departments to anon;

drop policy if exists department_directory_anon on public.departments;
create policy department_directory_anon on public.departments
for select to anon
using (true);

-- 3. Public Grants and RLS for public.report_images
-- Allows anon to see image metadata for public, listed reports only
grant select (id, report_id, storage_path, type, created_at) on public.report_images to anon;

drop policy if exists image_public_read on public.report_images;
create policy image_public_read on public.report_images
for select to anon
using (
  exists (
    select 1 from public.reports r
    where r.id = report_id
      and r.publication = 'public'
      and r.visibility = 'listed'
  )
);

-- 4. Optimized Partial Indexes for Public Report Feeds and Filtering
create index if not exists reports_public_recent
  on public.reports (created_at desc, id)
  where publication = 'public' and visibility = 'listed';

create index if not exists reports_public_category
  on public.reports (category, created_at desc, id)
  where publication = 'public' and visibility = 'listed';

create index if not exists reports_public_status
  on public.reports (status, created_at desc, id)
  where publication = 'public' and visibility = 'listed';

commit;
