-- Run after the core migration as the project owner. One atomic statement.
-- Reuse existing rows by their case-insensitive names, including any edits.
with catalog(name, description) as (
  values
    ('Road Maintenance', 'Campus paths and road surfaces'),
    ('Sanitation', 'Waste collection and cleanup'),
    ('Water Supply', 'Water lines and leaks'),
    ('Electrical', 'Lighting and electrical fixtures'),
    ('Drainage', 'Drains and blockages'),
    ('Public Works', 'Shared infrastructure maintenance')
), added as (
  insert into public.departments (name, description)
  select name, description from catalog order by name
  on conflict (lower(name)) do nothing
  returning id
)
select (select count(*) from added) as departments_added,
       (select count(*) from catalog) - (select count(*) from added) as already_present;
