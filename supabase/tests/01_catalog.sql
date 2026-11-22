-- Run the full script after the core migration and seed. Supports either security phase.
begin transaction read only;
do $test$
declare
  t text;
  f record;
  found_departments integer;
  secured boolean := to_regclass('public.civic_report_map') is not null;
  client name;
  expected_policies text[];
  actual_policies text[];
begin
  foreach t in array array['profiles','departments','reports','report_votes','status_history','report_images'] loop
    if not exists (
      select from pg_class c join pg_index i on i.indrelid = c.oid
      join pg_attribute a on a.attrelid = c.oid and a.attname = 'id' and a.atttypid = 'uuid'::regtype
      where c.oid = to_regclass('public.' || t) and c.relrowsecurity and i.indisprimary
        and pg_get_indexdef(i.indexrelid, 1, true) = 'id' and i.indnkeyatts = 1
    ) then raise exception 'Missing table, RLS or id primary key: %', t; end if;
    expected_policies := case
      when not secured then array[]::text[]
      when t = 'profiles' then array['profile_self_edit','profile_self_read']
      when t = 'departments' then array['department_directory']
      when t = 'reports' then array['report_admin_triage','report_private_read','report_self_create']
      when t = 'report_votes' then array['vote_private_read','vote_self_active']
      when t = 'status_history' then array['timeline_report_reader']
      when t = 'report_images' then array['image_report_reader']
    end;
    select array(select policyname::text from pg_policies
      where schemaname='public' and tablename=t order by policyname::text collate "C") into actual_policies;
    if actual_policies <> expected_policies then
      raise exception 'Unexpected policies on %: expected %, found %', t, expected_policies, actual_policies;
    end if;
    foreach client in array array['anon','authenticated'] loop
      if has_table_privilege(client,'public.' || t,'DELETE,TRUNCATE,REFERENCES,TRIGGER') or
         ((not secured or client='anon') and
           has_any_column_privilege(client,'public.' || t,'SELECT,INSERT,UPDATE,REFERENCES')) then
        raise exception 'Unexpected % access on public.%', client, t;
      end if;
    end loop;
  end loop;
  for f in select * from (values
    ('profiles','id','auth.users'),('reports','user_id','public.profiles'),
    ('reports','department_id','public.departments'),('report_votes','report_id','public.reports'),
    ('report_votes','user_id','public.profiles'),('status_history','report_id','public.reports'),
    ('status_history','changed_by','public.profiles'),('report_images','report_id','public.reports'),
    ('report_images','uploaded_by','public.profiles')
  ) as links(child, col, parent) loop
    if not exists (
      select from pg_constraint c
      join pg_attribute a on a.attrelid = c.conrelid and c.conkey = array[a.attnum]
      join pg_attribute p on p.attrelid = c.confrelid and c.confkey = array[p.attnum]
      where c.contype = 'f' and c.conrelid = to_regclass('public.' || f.child)
        and c.confrelid = to_regclass(f.parent) and a.attname = f.col and p.attname = 'id'
        and c.confdeltype = 'r'
    ) then raise exception 'Missing expected FK on %.%', f.child, f.col; end if;
  end loop;
  select count(distinct lower(name)) into found_departments from public.departments where lower(name) in
    ('road maintenance','sanitation','water supply','electrical','drainage','public works');
  if found_departments <> 6 then raise exception 'Missing or duplicated seed departments'; end if;
end;
$test$;
rollback;
select 'Phase 02 catalog checks passed' as result;
