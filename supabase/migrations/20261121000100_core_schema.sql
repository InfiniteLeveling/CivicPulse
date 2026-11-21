-- Dashboard or migration runner: execute the WHOLE file in one transaction.
-- A replay validates the installed schema against the same DDL used for a fresh
-- install. It does not recreate tables, reset grants, or change existing rows.
begin;
set local search_path = pg_catalog;
select pg_advisory_xact_lock(730513, 1);

-- Produce comparable definitions on the running PostgreSQL version. This also
-- works for installations predating this replay check (no migration ledger).
create function pg_temp.civicpulse_core_parts(target regclass, home name)
returns table(part text, member text, definition text)
language sql stable set search_path = pg_catalog as $signature$
  select 'table', c.relname::text,
    concat_ws('|', c.relkind, c.relpersistence, c.relispartition, c.relforcerowsecurity, c.relhasrules)
    from pg_class c where c.oid = target
  union all
  select 'column', a.attname::text,
    concat_ws('|', format_type(a.atttypid, a.atttypmod), a.attnotnull,
      a.attidentity, a.attgenerated, a.attcollation,
      coalesce(pg_get_expr(d.adbin, d.adrelid), ''))
    from pg_attribute a left join pg_attrdef d on d.adrelid = a.attrelid and d.adnum = a.attnum
    where a.attrelid = target and a.attnum > 0 and not a.attisdropped
  union all
  select 'constraint', conname::text, replace(pg_get_constraintdef(oid), quote_ident(home) || '.', '<core>.')
    from pg_constraint where conrelid = target
  union all
  select 'index', ic.relname::text,
    concat_ws('|', i.indisvalid, i.indisready, replace(pg_get_indexdef(ic.oid), quote_ident(home) || '.', '<core>.'))
    from pg_index i join pg_class ic on ic.oid = i.indexrelid where i.indrelid = target
  union all
  select 'trigger', tgname::text,
    concat_ws('|', tgenabled, replace(pg_get_triggerdef(oid), quote_ident(home) || '.', '<core>.'))
    from pg_trigger where tgrelid = target and not tgisinternal
      -- Phase 03 verifies its own report triggers independently.
      and not (target = to_regclass(quote_ident(home) || '.reports')
        and tgname in ('report_advance_version', 'report_record_event'));
$signature$;

-- A single source of DDL builds fresh installations, the empty comparison schema,
-- and missing objects in a previously verified partial installation.
create function pg_temp.civicpulse_install_core(destination name) returns void
language plpgsql set search_path = pg_catalog as $install_objects$
declare
  tbl text;
begin
  execute replace($ddl$
create table if not exists @core@.profiles (
  id uuid primary key references auth.users(id) on delete restrict,
  full_name text not null constraint profiles_name_valid
    check (char_length(full_name) between 1 and 120 and full_name !~ '^[[:space:]]|[[:space:]]$'),
  role text not null default 'citizen' constraint profiles_role_valid check (role in ('citizen', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists @core@.departments (
  id uuid primary key default gen_random_uuid(),
  name text not null constraint departments_name_valid
    check (char_length(name) between 1 and 120 and name !~ '^[[:space:]]|[[:space:]]$'),
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists departments_name_ci_key on @core@.departments (lower(name));

create table if not exists @core@.reports (
  id uuid primary key default gen_random_uuid(),
  reference text generated always as ('CP-' || id::text) stored unique,
  submission_key uuid not null,
  user_id uuid not null references @core@.profiles(id) on delete restrict,
  department_id uuid references @core@.departments(id) on delete restrict,
  title text not null constraint reports_title_valid
    check (char_length(title) between 5 and 120 and title !~ '^[[:space:]]|[[:space:]]$'),
  description text not null constraint reports_description_valid
    check (char_length(description) between 10 and 1000 and description !~ '^[[:space:]]|[[:space:]]$'),
  category text not null constraint reports_category_valid check (category in
    ('pothole','garbage','water_leakage','streetlight','drainage','damaged_infrastructure','other')),
  severity text not null default 'medium' constraint reports_severity_valid check (severity in ('low','medium','high','critical')),
  status text not null default 'pending' constraint reports_status_valid check (status in ('pending','in_progress','resolved')),
  latitude double precision not null constraint reports_latitude_valid check (latitude between -90 and 90),
  longitude double precision not null constraint reports_longitude_valid check (longitude between -180 and 180),
  publication text not null default 'private' constraint reports_publication_valid check (publication in ('public','private')),
  visibility text not null default 'listed' constraint reports_visibility_valid check (visibility in ('listed','hidden')),
  priority_score integer not null default 0 constraint reports_priority_valid check (priority_score between 0 and 100),
  version integer not null default 1 constraint reports_version_valid check (version >= 1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  resolved_at timestamptz,
  constraint reports_resolution_valid check ((status = 'resolved') = (resolved_at is not null)
    and (resolved_at is null or resolved_at >= created_at)),
  constraint reports_submission_key unique (user_id, submission_key)
);

create table if not exists @core@.report_votes (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references @core@.reports(id) on delete restrict,
  user_id uuid not null references @core@.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint report_votes_once unique (report_id, user_id)
);

create table if not exists @core@.status_history (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references @core@.reports(id) on delete restrict,
  version integer not null check (version >= 1),
  previous_status text check (previous_status in ('pending','in_progress','resolved')),
  status text not null check (status in ('pending','in_progress','resolved')),
  changed_by uuid not null references @core@.profiles(id) on delete restrict,
  notes text check (char_length(notes) <= 1000),
  created_at timestamptz not null default now(),
  constraint status_history_report_version_key unique (report_id, version)
);

create table if not exists @core@.report_images (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references @core@.reports(id) on delete restrict,
  storage_path text not null unique constraint report_images_path_valid check (
    char_length(storage_path) between 1 and 512
    and storage_path ~ '^[A-Za-z0-9_-][A-Za-z0-9_./-]*$'
    and storage_path !~ '(^|/)[.]{1,2}(/|$)|//|/$'
  ),
  type text not null constraint report_images_type_valid check (type in ('before','after')),
  uploaded_by uuid not null references @core@.profiles(id) on delete restrict,
  created_at timestamptz not null default now()
);

create index if not exists reports_creator_recent on @core@.reports (user_id, created_at desc, id);
create index if not exists reports_department_status on @core@.reports (department_id, status);
create index if not exists reports_status_priority on @core@.reports (status, priority_score desc, created_at, id);
create index if not exists reports_category_location on @core@.reports (category, status, latitude, longitude);
create index if not exists reports_recent on @core@.reports (created_at desc, id);
create index if not exists report_votes_user on @core@.report_votes (user_id, report_id);
create index if not exists report_images_report on @core@.report_images (report_id, type, created_at);
$ddl$, '@core@', quote_ident(destination));

  if to_regprocedure(format('%I.civicpulse_touch_updated_at()',destination)) is null then
    execute replace($ddl$
create function @core@.civicpulse_touch_updated_at() returns trigger
language plpgsql security invoker set search_path = pg_catalog as $$
begin
  new.created_at := old.created_at;
  new.updated_at := clock_timestamp();
  return new;
end;
$$;
$ddl$, '@core@', quote_ident(destination));
  end if;
  foreach tbl in array array['profiles','departments','reports'] loop
    if not exists (select from pg_trigger where tgrelid = to_regclass(format('%I.%I',destination,tbl))
                    and tgname = tbl || '_touch') then
      execute format('create trigger %I before update on %I.%I for each row execute function %I.civicpulse_touch_updated_at()',
                     tbl || '_touch',destination,tbl,destination);
    end if;
  end loop;
  foreach tbl in array array['profiles','departments','reports','report_votes','status_history','report_images'] loop
    execute format('alter table %I.%I enable row level security',destination,tbl);
  end loop;
end;
$install_objects$;

create function pg_temp.check_core_table(tbl name, scratch name, partial_install boolean)
returns void language plpgsql set search_path = pg_catalog as $check$
declare
  difference record;
begin
  if not partial_install and not (select relrowsecurity from pg_class where oid = to_regclass('public.' || tbl)) then
    raise exception 'Row level security is disabled on public.%',tbl
      using hint = 'Review this installed schema before changing its access model.';
  end if;
  select coalesce(e.part,a.part) as part, coalesce(e.member,a.member) as member,
         e.definition as expected, a.definition as installed
    into difference
    from pg_temp.civicpulse_core_parts(to_regclass(format('%I.%I',scratch,tbl)),scratch) e
    full join pg_temp.civicpulse_core_parts(to_regclass(format('public.%I',tbl)),'public') a
      using (part,member)
    where e.definition is distinct from a.definition
      -- Core can supply missing indexes and timestamp triggers on a matching
      -- partial table. It cannot safely infer new columns, constraints or data.
      and not (partial_install and a.part is null and e.part in ('index','trigger'))
    order by 1,2 limit 1;
  if found then
    raise exception 'Incompatible CivicPulse schema at public.%, % %', tbl, difference.part, difference.member
      using detail = format('Expected: %s. Installed: %s.',coalesce(difference.expected,'(absent)'),coalesce(difference.installed,'(absent)')),
            hint = 'Inspect this difference before applying a corrective migration. Existing tables and data were left intact.';
  end if;
end;
$check$;

do $install$
declare
  tables constant text[] := array['profiles','departments','reports','report_votes','status_history','report_images'];
  tbl text;
  live regclass;
  actor name;
  columns_sql text;
  scratch name := format('civicpulse_schema_check_%s',pg_backend_pid());
  actual_function regprocedure := to_regprocedure('public.civicpulse_touch_updated_at()');
  existing_count integer;
  partial_install boolean;
begin
  if to_regclass('auth.users') is null or to_regrole('anon') is null or to_regrole('authenticated') is null then
    raise exception 'Supabase Auth prerequisites missing'
      using hint = 'Open SQL Editor in the intended Supabase development project.';
  end if;

  select count(*) into existing_count from unnest(tables) t where to_regclass('public.' || t) is not null;
  partial_install := existing_count < cardinality(tables);
  -- Scratch is created exclusively by this transaction. A naming collision aborts.
  execute format('create schema %I',scratch);
  perform pg_temp.civicpulse_install_core(scratch);

  if actual_function is not null and
    replace(pg_get_functiondef(actual_function),'public.civicpulse_touch_updated_at','<core>.civicpulse_touch_updated_at')
      is distinct from replace(pg_get_functiondef(to_regprocedure(format('%I.civicpulse_touch_updated_at()',scratch))),
        quote_ident(scratch) || '.civicpulse_touch_updated_at','<core>.civicpulse_touch_updated_at')
  then
    raise exception 'Incompatible public.civicpulse_touch_updated_at()' using hint = 'Inspect the existing timestamp function.';
  elsif actual_function is null and not partial_install then
    raise exception 'Existing CivicPulse core is missing its timestamp function; inspect the installation.';
  end if;
  if partial_install and (to_regnamespace('civicpulse_private') is not null
                           or to_regclass('public.civic_report_map') is not null) then
    raise exception 'Core tables are missing from a project with security objects'
      using hint = 'Inspect the partial installation before attempting schema or permission changes.';
  end if;

  foreach tbl in array tables loop
    live := to_regclass('public.' || tbl);
    if live is null then continue; end if;
    if partial_install then
      if not exists (select from pg_class where oid=live and relkind='r' and relowner=current_user::regrole)
        or exists (select from pg_policy where polrelid=live)
        or exists (select from pg_trigger where tgrelid=live and not tgisinternal and tgname <> tbl || '_touch')
      then raise exception 'Unexpected owner, relation kind, policy or trigger on partial public.%',tbl
        using hint = 'Review the existing table before completing a partial CivicPulse installation.'; end if;
    end if;
    perform pg_temp.check_core_table(tbl,scratch,partial_install);
  end loop;

  if partial_install then
    perform pg_temp.civicpulse_install_core('public');
    revoke all on table public.profiles, public.departments, public.reports, public.report_votes,
      public.status_history, public.report_images from public, anon, authenticated;
    revoke all on function public.civicpulse_touch_updated_at() from public, anon, authenticated;
    foreach tbl in array tables loop
      live := to_regclass('public.' || tbl);
      -- Supabase projects can automatically grant privileges at table creation.
      -- Normalize only verified Phase 02 tables with no existing policies.
      select string_agg(quote_ident(attname), ', ' order by attnum) into columns_sql
        from pg_attribute where attrelid = live and attnum > 0 and not attisdropped;
      execute format('revoke all (%s) on table public.%I from public, anon, authenticated',columns_sql,tbl);
      foreach actor in array array['anon','authenticated'] loop
        if has_table_privilege(actor,live,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')
          or has_any_column_privilege(actor,live,'SELECT,INSERT,UPDATE,REFERENCES')
        then raise exception 'Inherited client privileges on public.% remain for %',tbl,actor
          using hint = 'Review role memberships and grants. This transaction made no changes.'; end if;
      end loop;
      perform pg_temp.check_core_table(tbl,scratch,false);
    end loop;
    raise notice 'Core installed: % existing compatible tables preserved.',existing_count;
  else
    raise notice 'Matching CivicPulse core already installed. Data and access policies preserved.';
  end if;

  -- Only transaction-created reference tables/functions exist in this schema.
  execute format('drop schema %I cascade',scratch);
end;
$install$;

drop function pg_temp.check_core_table(name,name,boolean);
drop function pg_temp.civicpulse_install_core(name);
drop function pg_temp.civicpulse_core_parts(regclass,name);
commit;
