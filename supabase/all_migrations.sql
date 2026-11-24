-- =============================================================================
-- CivicPulse Consolidated Database Schema & Migrations
-- =============================================================================

-- -----------------------------------------------------------------------------
-- MIGRATION: 20261121000100_core_schema.sql
-- -----------------------------------------------------------------------------

-- Dashboard or migration runner: execute the WHOLE file in one transaction.
-- A replay validates the installed schema against the same DDL used for a fresh
-- install. It does not recreate tables, reset grants, or change existing rows.
begin;
set local search_path = pg_catalog;
select pg_advisory_xact_lock(730513, 1);

-- Safe cleanup of incompatible legacy prototype schema objects if present.
-- If status_history is from the legacy complaints prototype (tracks complaint_id rather
-- than CivicPulse report_id) or is an orphan without reports, clean it up.
do $legacy_cleanup$
begin
  drop function if exists public.advance_complaint cascade;
  drop table if exists public.authority_members cascade;
  if to_regclass('public.status_history') is not null and (
    exists (
      select 1 from pg_catalog.pg_attribute a
      join pg_catalog.pg_class c on c.oid = a.attrelid
      join pg_catalog.pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relname = 'status_history' and a.attname = 'complaint_id' and not a.attisdropped
    )
    or to_regclass('public.reports') is null
  ) then
    drop table public.status_history cascade;
  end if;
  drop table if exists public.complaints cascade;
end;
$legacy_cleanup$;

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
      -- Allow later migration phases to have added indexes or triggers on core tables
      and not (e.part is null and a.part in ('index','trigger'))
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


-- -----------------------------------------------------------------------------
-- MIGRATION: 20261121000200_phase03_rls_policies.sql
-- -----------------------------------------------------------------------------

-- Repeatable in the SQL Editor. Apply the matching core schema first. This
-- transaction re-installs only CivicPulse policies and permissions; rows stay put.
begin;
set local search_path = pg_catalog, public;
select pg_advisory_xact_lock(730513,1);

do $preflight$
declare
  obj record;
  tbl regclass;
  policy_name name;
  owner_name name;
  column_names text;
  client name;
begin
  if to_regprocedure('auth.uid()') is null then
    raise exception 'Missing Supabase auth.uid(); use a Supabase development project.';
  end if;
  if exists (select from pg_roles where rolname in ('anon','authenticated') and (rolsuper or rolbypassrls))
  then raise exception 'Client roles must obey RLS'; end if;

  for obj in select * from (values
    ('profiles', array['profile_self_read','profile_self_edit']),
    ('departments', array['department_directory','department_directory_anon']),
    ('reports', array['report_private_read','report_self_create','report_admin_triage','report_public_read']),
    ('report_votes', array['vote_private_read','vote_self_active']),
    ('status_history', array['timeline_report_reader','timeline_public_read']),
    ('report_images', array['image_report_reader','image_self_create','image_public_read','image_admin_create'])
  ) as objects(table_name,managed_policies) loop
    tbl := to_regclass(format('public.%I',obj.table_name));
    if tbl is null then
      raise exception 'Missing public.%. Run the core schema migration first.', obj.table_name;
    end if;
    select pg_get_userbyid(relowner) into owner_name from pg_class where oid=tbl;
    if owner_name <> current_user then
      raise exception 'Table % belongs to %; run as its trusted owner (current role: %).', tbl, owner_name, current_user;
    end if;
    if not exists(select from pg_class where oid=tbl and relkind='r' and relrowsecurity and not relforcerowsecurity)
    then raise exception 'Unexpected relation kind or RLS flags on %. Verify the core schema before proceeding.',tbl; end if;

    -- Stabilize policy and ACL inspection against concurrent table DDL.
    execute format('lock table %s in access exclusive mode',tbl);
    for policy_name in select polname from pg_policy where polrelid=tbl loop
      if not (policy_name::text = any(obj.managed_policies)) then
        raise exception 'Unrecognized policy "%" on %. Review it before integrating CivicPulse permissions.',policy_name,tbl;
      end if;
      execute format('drop policy %I on %s',policy_name,tbl);
    end loop;

    -- Reset direct table AND column grants before granting the explicit allowlist
    -- below. Managed service roles and other applications' tables are untouched.
    execute format('revoke all privileges on table %s from public, anon, authenticated',tbl);
    select string_agg(quote_ident(attname),', ' order by attnum) into column_names
      from pg_attribute where attrelid=tbl and attnum>0 and not attisdropped;
    execute format('revoke all privileges (%s) on table %s from public, anon, authenticated',column_names,tbl);
    foreach client in array array['anon','authenticated'] loop
      if has_table_privilege(client,tbl,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')
        or has_any_column_privilege(client,tbl,'SELECT,INSERT,UPDATE,REFERENCES')
      then raise exception 'Inherited access for % on % remains after direct grants were removed; review role memberships.',client,tbl; end if;
    end loop;
  end loop;

  if exists (select from pg_namespace where nspname='civicpulse_private' and nspowner <> current_user::regrole)
  then raise exception 'Existing civicpulse_private schema belongs to a different role.'; end if;
  if exists (select from pg_proc where pronamespace=to_regnamespace('civicpulse_private')
    and (proname not in ('is_admin','advance_report_version','record_report_event','handle_new_user','on_vote_recalculate_priority')
      or proowner<>current_user::regrole))
  then raise exception 'Unexpected routine or routine owner in civicpulse_private; review the existing schema.'; end if;
  if exists (select from pg_class where oid=to_regclass('public.civic_report_map')
    and (relkind<>'v' or relowner<>current_user::regrole))
  then raise exception 'Existing public.civic_report_map must be the CivicPulse view owned by this migration role.'; end if;
end;
$preflight$;

create schema if not exists civicpulse_private;
revoke all on schema civicpulse_private from public, anon, authenticated;
grant usage on schema civicpulse_private to authenticated;

-- The owner can read the protected role without recursing into profile policies.
create or replace function civicpulse_private.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin');
$$;
revoke all on function civicpulse_private.is_admin() from public, anon, authenticated;
grant execute on function civicpulse_private.is_admin() to authenticated;

grant select, update (full_name) on public.profiles to authenticated;
create policy profile_self_read on public.profiles for select to authenticated
  using (id = (select auth.uid()));
create policy profile_self_edit on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

grant select (id,name,description) on public.departments to authenticated;
create policy department_directory on public.departments for select to authenticated
  using ((select auth.uid()) is not null);

grant select, insert (user_id,submission_key,title,description,category,latitude,longitude,publication),
  update (department_id,severity,visibility) on public.reports to authenticated;
create policy report_private_read on public.reports for select to authenticated
  using (user_id = (select auth.uid()) or (select civicpulse_private.is_admin()));
create policy report_self_create on public.reports for insert to authenticated
  with check (user_id = (select auth.uid()) and not (select civicpulse_private.is_admin()));
create policy report_admin_triage on public.reports for update to authenticated
  using ((select civicpulse_private.is_admin())) with check ((select civicpulse_private.is_admin()));

-- Intentional owner-rights projection. Fix both row predicate and output columns.
create or replace view public.civic_report_map with (security_barrier = true) as
  select id, reference, category, status, round(latitude::numeric,2) as latitude,
    round(longitude::numeric,2) as longitude
  from public.reports where publication = 'public' and visibility = 'listed';
revoke all on public.civic_report_map from public, anon, authenticated;
revoke all privileges (id,reference,category,status,latitude,longitude)
  on public.civic_report_map from public, anon, authenticated;
grant select on public.civic_report_map to anon, authenticated;

grant select, insert (report_id,user_id) on public.report_votes to authenticated;
create policy vote_private_read on public.report_votes for select to authenticated
  using (user_id = (select auth.uid()) or (select civicpulse_private.is_admin()));
create policy vote_self_active on public.report_votes for insert to authenticated
  with check (user_id = (select auth.uid()) and not (select civicpulse_private.is_admin())
    and exists (select from public.civic_report_map m
      where m.id = report_id and m.status in ('pending','in_progress')));

-- Internal notes and actor identifiers are outside the ordinary timeline grant.
grant select (id,report_id,version,previous_status,status,created_at) on public.status_history to authenticated;
create policy timeline_report_reader on public.status_history for select to authenticated
  using (exists (select from public.reports r where r.id = report_id));
grant select on public.report_images to authenticated;
create policy image_report_reader on public.report_images for select to authenticated
  using (exists (select from public.reports r where r.id = report_id));

-- One writer for the initial and triage history. Any error rolls back the report
-- mutation. Status transitions remain unavailable to client roles.
create or replace function civicpulse_private.advance_report_version() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  new.version := old.version + 1;
  return new;
end;
$$;

create or replace function civicpulse_private.record_report_event() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  actor uuid := auth.uid();
begin
  if actor is null then raise exception 'Report writes require an authenticated actor'; end if;
  if tg_op = 'INSERT' then
    insert into public.status_history(report_id,version,status,changed_by)
      values (new.id,new.version,new.status,actor);
    insert into public.report_votes(report_id,user_id) values (new.id,new.user_id);
  else
    insert into public.status_history(report_id,version,previous_status,status,changed_by,notes)
      values (new.id,new.version,old.status,new.status,actor,
        format('department %s -> %s; severity %s -> %s; visibility %s -> %s',
          old.department_id,new.department_id,old.severity,new.severity,old.visibility,new.visibility));
  end if;
  return null;
end;
$$;
revoke all on function civicpulse_private.advance_report_version(),
  civicpulse_private.record_report_event() from public, anon, authenticated;
drop trigger if exists report_advance_version on public.reports;
create trigger report_advance_version before update on public.reports
  for each row execute function civicpulse_private.advance_report_version();
drop trigger if exists report_record_event on public.reports;
create trigger report_record_event after insert or update on public.reports
  for each row execute function civicpulse_private.record_report_event();

-- Ownership and inherited ACLs can override direct revocations. Abort the
-- whole transaction if either client would still control an internal object.
do $verify$
declare
  client name;
begin
  foreach client in array array['anon','authenticated'] loop
    if has_schema_privilege(client,'civicpulse_private','CREATE')
      or has_table_privilege(client,'public.civic_report_map','INSERT,UPDATE,DELETE,TRUNCATE,TRIGGER,REFERENCES')
      or has_any_column_privilege(client,'public.civic_report_map','INSERT,UPDATE,REFERENCES')
      or has_function_privilege(client,'civicpulse_private.record_report_event()','EXECUTE')
      or has_function_privilege(client,'civicpulse_private.advance_report_version()','EXECUTE')
    then raise exception 'Unexpected inherited write or internal helper privilege for %.',client; end if;
  end loop;
  if has_schema_privilege('anon','civicpulse_private','USAGE')
    or has_function_privilege('anon','civicpulse_private.is_admin()','EXECUTE')
  then raise exception 'Anonymous role inherits access to the private authorization schema.'; end if;
end;
$verify$;

commit;


-- -----------------------------------------------------------------------------
-- MIGRATION: 20261121000300_phase04_auth_profile_sync.sql
-- -----------------------------------------------------------------------------

-- Phase 04: Profile Provisioning and Auth Sync Trigger
-- Ensures every new auth.users record receives a public.profiles record with role 'citizen'.
-- Public registration metadata cannot grant admin access.
begin;

-- Safe function to automatically create profile upon auth.users insertion
create or replace function civicpulse_private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  raw_name text;
  safe_name text;
begin
  -- Extract name from raw_user_meta_data or email
  raw_name := trim(both ' ' from coalesce(new.raw_user_meta_data->>'full_name', ''));
  if raw_name = '' then
    raw_name := trim(both ' ' from split_part(coalesce(new.email, ''), '@', 1));
  end if;
  if raw_name = '' then
    raw_name := 'Citizen';
  end if;

  -- Enforce length between 1 and 120
  safe_name := substr(raw_name, 1, 120);

  -- Always insert role as 'citizen'. User-supplied metadata 'role' is strictly ignored.
  insert into public.profiles (id, full_name, role, created_at, updated_at)
  values (new.id, safe_name, 'citizen', clock_timestamp(), clock_timestamp())
  on conflict (id) do nothing;

  return new;
exception
  when others then
    -- Log warning but do not abort auth.users transaction
    raise warning 'civicpulse_private.handle_new_user failed for user %: %', new.id, sqlerrm;
    return new;
end;
$$;

revoke all on function civicpulse_private.handle_new_user() from public, anon, authenticated;

-- Trigger on auth.users table
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function civicpulse_private.handle_new_user();

-- Secure idempotent repair function callable by authenticated user for missing profiles
create or replace function public.civicpulse_ensure_profile()
returns public.profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_uid uuid;
  found_profile public.profiles;
  user_email text;
  raw_name text;
  safe_name text;
begin
  current_uid := auth.uid();
  if current_uid is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  -- If profile already exists, return it without modifying role or data
  select * into found_profile from public.profiles where id = current_uid;
  if found_profile.id is not null then
    return found_profile;
  end if;

  -- Otherwise fetch email/metadata from auth.users to construct a default citizen profile
  select email, trim(both ' ' from coalesce(raw_user_meta_data->>'full_name', ''))
    into user_email, raw_name
  from auth.users where id = current_uid;

  if raw_name is null or raw_name = '' then
    raw_name := trim(both ' ' from split_part(coalesce(user_email, ''), '@', 1));
  end if;
  if raw_name is null or raw_name = '' then
    raw_name := 'Citizen';
  end if;
  safe_name := substr(raw_name, 1, 120);

  -- Insert profile strictly as citizen
  insert into public.profiles (id, full_name, role, created_at, updated_at)
  values (current_uid, safe_name, 'citizen', clock_timestamp(), clock_timestamp())
  on conflict (id) do update set updated_at = clock_timestamp()
  returning * into found_profile;

  return found_profile;
end;
$$;

revoke all on function public.civicpulse_ensure_profile() from public, anon;
grant execute on function public.civicpulse_ensure_profile() to authenticated;

commit;


-- -----------------------------------------------------------------------------
-- MIGRATION: 20261121000400_phase05_storage.sql
-- -----------------------------------------------------------------------------

-- Phase 05: Supabase Storage Configuration and RLS Policies
-- Bucket: civic-evidence (private, 3 MB limit, image/jpeg, image/png, image/webp)
begin;

do $migration$
begin
  -- 1. Ensure private storage bucket exists
  if to_regclass('storage.buckets') is not null then
    insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    values (
      'civic-evidence',
      'civic-evidence',
      false,
      3145728,
      array['image/jpeg', 'image/png', 'image/webp']::text[]
    )
    on conflict (id) do update set
      public = false,
      file_size_limit = 3145728,
      allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']::text[];
  end if;

  -- 2. Storage RLS Policies on storage.objects
  if to_regclass('storage.objects') is not null then
    -- Drop existing policies if re-applying
    drop policy if exists "citizen_upload_draft" on storage.objects;
    drop policy if exists "citizen_read_draft" on storage.objects;
    drop policy if exists "citizen_delete_draft" on storage.objects;
    drop policy if exists "admin_upload_evidence" on storage.objects;

    -- A. Citizen Draft Upload: only authenticated, in 'civic-evidence', folder 'drafts/<auth.uid()>/...', allowed extensions
    create policy "citizen_upload_draft" on storage.objects
    for insert to authenticated
    with check (
      bucket_id = 'civic-evidence'
      and (storage.foldername(name))[1] = 'drafts'
      and (storage.foldername(name))[2] = (select auth.uid())::text
      and lower(storage.extension(name)) in ('jpg', 'jpeg', 'png', 'webp')
    );

    -- B. Citizen Draft Read: only own draft files
    create policy "citizen_read_draft" on storage.objects
    for select to authenticated
    using (
      bucket_id = 'civic-evidence'
      and (storage.foldername(name))[1] = 'drafts'
      and (storage.foldername(name))[2] = (select auth.uid())::text
    );

    -- C. Citizen Draft Delete: only own draft files (cancellation before report creation)
    create policy "citizen_delete_draft" on storage.objects
    for delete to authenticated
    using (
      bucket_id = 'civic-evidence'
      and (storage.foldername(name))[1] = 'drafts'
      and (storage.foldername(name))[2] = (select auth.uid())::text
    );

    -- D. Admin Resolution Evidence Upload: for future Phase 17 resolution proof
    create policy "admin_upload_evidence" on storage.objects
    for insert to authenticated
    with check (
      bucket_id = 'civic-evidence'
      and (storage.foldername(name))[1] = 'reports'
      and (storage.foldername(name))[3] = 'after'
      and (select civicpulse_private.is_admin())
      and lower(storage.extension(name)) in ('jpg', 'jpeg', 'png', 'webp')
    );
  end if;
end;
$migration$;

commit;


-- -----------------------------------------------------------------------------
-- MIGRATION: 20261121000500_phase06_report_creation.sql
-- -----------------------------------------------------------------------------

-- Phase 06: Citizen Complaint Creation API, Storage Association, and Transaction Safety
-- Migration: 20261121000500_phase06_report_creation.sql
begin;

-- 1. Storage RLS Hardening: Prevent citizens from deleting finalized/linked evidence
do $storage_policy$
begin
  if to_regclass('storage.objects') is not null then
    drop policy if exists "citizen_delete_draft" on storage.objects;
    create policy "citizen_delete_draft" on storage.objects
    for delete to authenticated
    using (
      bucket_id = 'civic-evidence'
      and (storage.foldername(name))[1] = 'drafts'
      and (storage.foldername(name))[2] = (select auth.uid())::text
      -- Block deletion once the draft image is associated with a report
      and not exists (
        select 1 from public.report_images ri where ri.storage_path = storage.objects.name
      )
    );
  end if;
end;
$storage_policy$;

-- 2. Direct RLS Protection on public.report_images: Ensure citizens can only insert 'before' images for own reports
grant insert (report_id, storage_path, type, uploaded_by) on public.report_images to authenticated;

drop policy if exists image_self_create on public.report_images;
create policy image_self_create on public.report_images
for insert to authenticated
with check (
  uploaded_by = (select auth.uid())
  and type = 'before'
  and not (select civicpulse_private.is_admin())
  and exists (
    select 1 from public.reports r
    where r.id = report_id and r.user_id = (select auth.uid())
  )
);

-- 3. Atomic Transactional Complaint Creation Function
-- Provides atomic persistence across reports and report_images with strict server validation.
create or replace function public.civicpulse_create_report(
  p_title text,
  p_description text,
  p_category text,
  p_latitude double precision,
  p_longitude double precision,
  p_image_path text,
  p_severity text default 'medium',
  p_submission_key uuid default gen_random_uuid()
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_uid uuid;
  caller_role text;
  existing_report record;
  new_report_id uuid;
  new_reference text;
  new_created_at timestamptz;
  v_submission_key uuid;
  path_user_id text;
  path_match boolean;
begin
  -- Layer 1: Authentication Guard
  current_uid := auth.uid();
  if current_uid is null then
    raise exception 'UNAUTHORIZED: Authentication required' using errcode = '28000';
  end if;

  -- Layer 2: Profile & Role Verification
  select role into caller_role from public.profiles where id = current_uid;
  if caller_role is null then
    raise exception 'NOT_FOUND: User profile does not exist' using errcode = 'P0002';
  end if;
  if caller_role = 'admin' then
    raise exception 'FORBIDDEN: Administrative accounts cannot submit citizen reports' using errcode = '42501';
  end if;

  -- Layer 3: Idempotency Key Reconciliation
  v_submission_key := coalesce(p_submission_key, gen_random_uuid());
  select id, reference, title, description, category, severity, status, priority_score,
         latitude, longitude, created_at
    into existing_report
    from public.reports
   where user_id = current_uid and submission_key = v_submission_key;

  if existing_report.id is not null then
    -- Return existing complaint for safe idempotent retries
    return jsonb_build_object(
      'id', existing_report.id,
      'reference', existing_report.reference,
      'title', existing_report.title,
      'description', existing_report.description,
      'category', existing_report.category,
      'severity', existing_report.severity,
      'status', existing_report.status,
      'priority_score', existing_report.priority_score,
      'latitude', existing_report.latitude,
      'longitude', existing_report.longitude,
      'image_count', 1,
      'image_path', p_image_path,
      'created_at', existing_report.created_at
    );
  end if;

  -- Layer 4: Storage Draft Ownership Verification
  -- Must match: drafts/<current_uid>/<image_uuid>.<extension>
  path_match := p_image_path ~ ('^drafts/' || current_uid::text || '/[0-9a-fA-F-]{36}\.(jpg|jpeg|png|webp)$');
  if not path_match then
    raise exception 'FORBIDDEN: Evidence image does not belong to authenticated citizen' using errcode = '42501';
  end if;

  -- Layer 5: Duplicate Evidence Check
  if exists (select 1 from public.report_images where storage_path = p_image_path) then
    raise exception 'CONFLICT: This image has already been associated with another report' using errcode = '23505';
  end if;

  -- Layer 6: Storage Object Existence Check (if storage catalog is available)
  if to_regclass('storage.objects') is not null then
    if not exists (select 1 from storage.objects where bucket_id = 'civic-evidence' and name = p_image_path) then
      raise exception 'NOT_FOUND: Evidence image object not found in storage bucket' using errcode = 'P0002';
    end if;
  end if;

  -- Layer 7: Category & Severity Validation
  if p_category not in ('pothole','garbage','water_leakage','streetlight','drainage','damaged_infrastructure','other') then
    raise exception 'VALIDATION_ERROR: Invalid category %', p_category using errcode = '22023';
  end if;
  if p_severity not in ('low','medium','high','critical') then
    raise exception 'VALIDATION_ERROR: Invalid severity %', p_severity using errcode = '22023';
  end if;

  -- Layer 8: Atomic Insert into public.reports
  -- Note: The database trigger report_record_event automatically inserts
  -- status_history (version=1, status='pending') and report_votes (self-vote).
  insert into public.reports (
    submission_key,
    user_id,
    title,
    description,
    category,
    severity,
    status,
    latitude,
    longitude,
    publication,
    visibility,
    priority_score,
    department_id,
    resolved_at
  ) values (
    v_submission_key,
    current_uid,
    p_title,
    p_description,
    p_category,
    coalesce(p_severity, 'medium'),
    'pending',
    p_latitude,
    p_longitude,
    'private',
    'listed',
    0,
    null,
    null
  ) returning id, reference, created_at into new_report_id, new_reference, new_created_at;

  -- Layer 9: Atomic Insert into public.report_images
  insert into public.report_images (
    report_id,
    storage_path,
    type,
    uploaded_by
  ) values (
    new_report_id,
    p_image_path,
    'before',
    current_uid
  );

  -- Layer 10: Return Standardized Complaint DTO
  return jsonb_build_object(
    'id', new_report_id,
    'reference', new_reference,
    'title', p_title,
    'description', p_description,
    'category', p_category,
    'severity', coalesce(p_severity, 'medium'),
    'status', 'pending',
    'priority_score', 0,
    'latitude', p_latitude,
    'longitude', p_longitude,
    'image_count', 1,
    'image_path', p_image_path,
    'created_at', new_created_at
  );
end;
$$;

revoke all on function public.civicpulse_create_report(text, text, text, double precision, double precision, text, text, uuid) from public, anon;
grant execute on function public.civicpulse_create_report(text, text, text, double precision, double precision, text, text, uuid) to authenticated;

commit;


-- -----------------------------------------------------------------------------
-- MIGRATION: 20261121000600_phase07_report_retrieval.sql
-- -----------------------------------------------------------------------------

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


-- -----------------------------------------------------------------------------
-- MIGRATION: 20261121000700_phase08_status_workflow.sql
-- -----------------------------------------------------------------------------

-- Phase 08: Complaint Status Management, Admin Authorization, State Transitions, and Atomic Audit History
-- Migration: 20261121000700_phase08_status_workflow.sql
begin;

-- 1. Grant safe column-level SELECT on status_history to anon (public timeline)
grant select (id, report_id, version, previous_status, status, created_at)
  on table public.status_history to anon;

-- 2. Add RLS policy for anonymous visitors to view public listed complaint timelines
drop policy if exists timeline_public_read on public.status_history;
create policy timeline_public_read on public.status_history for select to anon
  using (exists (
    select 1 from public.reports r
    where r.id = status_history.report_id
      and r.publication = 'public'
      and r.visibility = 'listed'
  ));

-- 3. Enhance audit trigger civicpulse_private.record_report_event()
-- Supports transaction-local custom administrative remarks set via set_config('civicpulse.transition_notes', ...)
create or replace function civicpulse_private.record_report_event() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  actor uuid := auth.uid();
  custom_notes text := nullif(current_setting('civicpulse.transition_notes', true), '');
  final_notes text;
begin
  if actor is null then raise exception 'Report writes require an authenticated actor'; end if;
  if tg_op = 'INSERT' then
    insert into public.status_history(report_id,version,status,changed_by)
      values (new.id,new.version,new.status,actor);
    insert into public.report_votes(report_id,user_id) values (new.id,new.user_id);
  else
    if custom_notes is not null then
      final_notes := custom_notes;
    else
      final_notes := format('department %s -> %s; severity %s -> %s; visibility %s -> %s',
        old.department_id,new.department_id,old.severity,new.severity,old.visibility,new.visibility);
    end if;
    insert into public.status_history(report_id,version,previous_status,status,changed_by,notes)
      values (new.id,new.version,old.status,new.status,actor,final_notes);
  end if;
  return null;
end;
$$;

-- 4. Atomic Status Transition RPC Function
-- Verifies caller is admin, locks target report with FOR UPDATE, verifies state transition matrix,
-- checks expected_status for optimistic concurrency, updates status and resolved_at,
-- and relies on report triggers to atomically advance version and insert immutable status_history.
create or replace function public.civicpulse_transition_report_status(
  p_report_id uuid,
  p_new_status text,
  p_notes text default null,
  p_expected_status text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_uid uuid;
  caller_role text;
  target_report public.reports%rowtype;
  v_notes text;
  v_resolved_at timestamptz;
  new_version integer;
  v_updated_at timestamptz;
  new_history_id uuid;
begin
  -- Layer 1: Authentication Guard
  current_uid := auth.uid();
  if current_uid is null then
    raise exception 'UNAUTHORIZED: Authentication required' using errcode = '28000';
  end if;

  -- Layer 2: Role Verification (Strict Admin Only)
  select role into caller_role from public.profiles where id = current_uid;
  if caller_role is null or caller_role <> 'admin' then
    raise exception 'FORBIDDEN: Administrative privileges required' using errcode = '42501';
  end if;

  -- Layer 3: Validate new_status is canonical
  if p_new_status not in ('pending', 'in_progress', 'resolved') then
    raise exception 'INVALID_PARAMETER: Unknown status %', p_new_status using errcode = '22023';
  end if;

  -- Layer 4: Lock Target Report with Row-Level Lock
  select * into target_report from public.reports where id = p_report_id for update;
  if target_report.id is null then
    raise exception 'NOT_FOUND: Report not found' using errcode = 'P0002';
  end if;

  -- Layer 5: Optimistic Concurrency Check (expected_status)
  if p_expected_status is not null and target_report.status <> p_expected_status then
    raise exception 'STATUS_CONFLICT: Complaint status changed. Expected % but current status is %',
      p_expected_status, target_report.status using errcode = '23514';
  end if;

  -- Layer 6: Same-Status Idempotency / Conflict Check
  if target_report.status = p_new_status then
    raise exception 'STATUS_CONFLICT: Report is already in status %', p_new_status using errcode = '23514';
  end if;

  -- Layer 7: State Transition Matrix (pending -> in_progress -> resolved)
  if not (
    (target_report.status = 'pending' and p_new_status = 'in_progress') or
    (target_report.status = 'in_progress' and p_new_status = 'resolved')
  ) then
    raise exception 'STATUS_CONFLICT: Cannot transition complaint status from % to %',
      target_report.status, p_new_status using errcode = '23514';
  end if;

  -- Layer 8: Notes validation and sanitization
  v_notes := trim(both ' ' from coalesce(p_notes, ''));
  if char_length(v_notes) > 1000 then
    raise exception 'INVALID_PARAMETER: Notes cannot exceed 1000 characters' using errcode = '22023';
  end if;
  if v_notes = '' then
    v_notes := null;
  end if;

  -- Layer 9: Set transaction-local note for record_report_event trigger
  if v_notes is not null then
    perform set_config('civicpulse.transition_notes', v_notes, true);
  else
    perform set_config('civicpulse.transition_notes', '', true);
  end if;

  -- Layer 10: Manage resolved_at timestamp
  if p_new_status = 'resolved' then
    v_resolved_at := clock_timestamp();
  else
    v_resolved_at := null;
  end if;

  -- Layer 11: Execute atomic update (advances version and fires record_report_event trigger)
  update public.reports
  set
    status = p_new_status,
    resolved_at = v_resolved_at,
    updated_at = clock_timestamp()
  where id = p_report_id
  returning version, updated_at into new_version, v_updated_at;

  -- Layer 12: Retrieve newly created status_history id
  select id into new_history_id
  from public.status_history
  where report_id = p_report_id and version = new_version;

  -- Layer 13: Return verified response payload
  return jsonb_build_object(
    'id', p_report_id,
    'previous_status', target_report.status,
    'status', p_new_status,
    'updated_at', v_updated_at,
    'resolved_at', v_resolved_at,
    'history_entry_id', new_history_id,
    'version', new_version
  );
end;
$$;

revoke all on function public.civicpulse_transition_report_status(uuid, text, text, text) from public, anon;
grant execute on function public.civicpulse_transition_report_status(uuid, text, text, text) to authenticated;

-- 5. Privileged Admin Timeline Retrieval Function
-- Accessible only to verified administrators; projects operational notes and actor UUIDs
create or replace function public.civicpulse_get_admin_status_history(p_report_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_uid uuid;
  caller_role text;
  history_records jsonb;
begin
  current_uid := auth.uid();
  if current_uid is null then
    raise exception 'UNAUTHORIZED: Authentication required' using errcode = '28000';
  end if;

  select role into caller_role from public.profiles where id = current_uid;
  if caller_role is null or caller_role <> 'admin' then
    raise exception 'FORBIDDEN: Administrative privileges required' using errcode = '42501';
  end if;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', sh.id,
      'report_id', sh.report_id,
      'version', sh.version,
      'previous_status', sh.previous_status,
      'status', sh.status,
      'changed_by', sh.changed_by,
      'notes', sh.notes,
      'created_at', sh.created_at
    ) order by sh.created_at asc, sh.version asc
  ), '[]'::jsonb)
  into history_records
  from public.status_history sh
  where sh.report_id = p_report_id;

  return history_records;
end;
$$;

revoke all on function public.civicpulse_get_admin_status_history(uuid) from public, anon;
grant execute on function public.civicpulse_get_admin_status_history(uuid) to authenticated;

-- 6. Performance Index for Chronological Timeline Traversal
create index if not exists status_history_report_chronological
  on public.status_history (report_id, created_at asc, version asc);

commit;


-- -----------------------------------------------------------------------------
-- MIGRATION: 20261121000800_phase09_department_assignment.sql
-- -----------------------------------------------------------------------------

-- Phase 09: Department Management, Complaint Assignment, Reassignment, and Audit History
-- Migration: 20261121000800_phase09_department_assignment.sql
begin;

-- 1. Create Dedicated Department Assignment History Table
-- Records every administrative assignment and reassignment with previous/new department IDs and audit actor.
create table if not exists public.department_assignment_history (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.reports(id) on delete restrict,
  previous_department_id uuid references public.departments(id) on delete restrict,
  new_department_id uuid not null references public.departments(id) on delete restrict,
  assigned_by uuid not null references public.profiles(id) on delete restrict,
  reason text check (char_length(reason) <= 1000),
  created_at timestamptz not null default now()
);

-- 2. Configure Row Level Security on department_assignment_history
alter table public.department_assignment_history enable row level security;

revoke all on table public.department_assignment_history from public, anon, authenticated;

grant select (id, report_id, previous_department_id, new_department_id, assigned_by, reason, created_at)
  on table public.department_assignment_history to authenticated;

-- RLS Policy: Only authorized administrators may view assignment audit records
drop policy if exists assignment_history_admin_read on public.department_assignment_history;
create policy assignment_history_admin_read on public.department_assignment_history
  for select to authenticated
  using ((select civicpulse_private.is_admin()));

-- 3. Atomic Department Assignment RPC Function
-- Verifies caller is admin, locks target report with FOR UPDATE, verifies target department,
-- enforces lifecycle constraints (rejects assignment for resolved complaints),
-- validates optimistic concurrency (expected_department_id), prevents duplicate no-op assignments,
-- atomically updates reports.department_id, and writes immutable department_assignment_history.
create or replace function public.civicpulse_assign_department(
  p_report_id uuid,
  p_department_id uuid,
  p_expected_department_id uuid default null,
  p_check_expected boolean default false,
  p_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_uid uuid;
  caller_role text;
  target_report public.reports%rowtype;
  target_dept public.departments%rowtype;
  v_reason text;
  v_updated_at timestamptz;
  new_history_id uuid;
begin
  -- Layer 1: Authentication Guard
  current_uid := auth.uid();
  if current_uid is null then
    raise exception 'UNAUTHORIZED: Authentication required' using errcode = '28000';
  end if;

  -- Layer 2: Role Verification (Strict Admin Only)
  select role into caller_role from public.profiles where id = current_uid;
  if caller_role is null or caller_role <> 'admin' then
    raise exception 'FORBIDDEN: Administrative privileges required' using errcode = '42501';
  end if;

  -- Layer 3: Lock Target Report with Row-Level Lock
  select * into target_report from public.reports where id = p_report_id for update;
  if target_report.id is null then
    raise exception 'NOT_FOUND: Report not found' using errcode = 'P0002';
  end if;

  -- Layer 4: Lifecycle Restriction: Resolved complaints cannot be reassigned
  if target_report.status = 'resolved' then
    raise exception 'ASSIGNMENT_CONFLICT: Cannot reassign a resolved complaint' using errcode = '23514';
  end if;

  -- Layer 5: Validate Target Department Existence
  select * into target_dept from public.departments where id = p_department_id;
  if target_dept.id is null then
    raise exception 'NOT_FOUND: Department not found' using errcode = 'P0002';
  end if;

  -- Layer 6: Duplicate No-Op Protection
  if target_report.department_id = p_department_id then
    raise exception 'ASSIGNMENT_CONFLICT: Report is already assigned to this department' using errcode = '23514';
  end if;

  -- Layer 7: Optimistic Concurrency Check (expected_department_id)
  if p_check_expected then
    if p_expected_department_id is null and target_report.department_id is not null then
      raise exception 'ASSIGNMENT_CONFLICT: Complaint was already assigned to another department. Expected unassigned but found %',
        target_report.department_id using errcode = '23514';
    elsif p_expected_department_id is not null and target_report.department_id is distinct from p_expected_department_id then
      raise exception 'ASSIGNMENT_CONFLICT: Complaint department changed. Expected % but found %',
        p_expected_department_id, coalesce(target_report.department_id::text, 'unassigned') using errcode = '23514';
    end if;
  end if;

  -- Layer 8: Reason Validation and Sanitization
  v_reason := trim(both ' ' from coalesce(p_reason, ''));
  if char_length(v_reason) > 1000 then
    raise exception 'INVALID_PARAMETER: Reason cannot exceed 1000 characters' using errcode = '22023';
  end if;
  if v_reason = '' then
    v_reason := null;
  end if;

  -- Layer 9: Execute Atomic Update on public.reports
  update public.reports
  set
    department_id = p_department_id,
    updated_at = clock_timestamp()
  where id = p_report_id
  returning updated_at into v_updated_at;

  -- Layer 10: Persist Dedicated Assignment Audit History
  insert into public.department_assignment_history (
    report_id,
    previous_department_id,
    new_department_id,
    assigned_by,
    reason,
    created_at
  ) values (
    p_report_id,
    target_report.department_id,
    p_department_id,
    current_uid,
    v_reason,
    clock_timestamp()
  )
  returning id into new_history_id;

  -- Layer 11: Return JSON Response Payload
  return jsonb_build_object(
    'report_id', p_report_id,
    'previous_department_id', target_report.department_id,
    'department', jsonb_build_object(
      'id', target_dept.id,
      'name', target_dept.name
    ),
    'assigned_by', current_uid,
    'assigned_at', v_updated_at,
    'assignment_history_id', new_history_id
  );
end;
$$;

revoke all on function public.civicpulse_assign_department(uuid, uuid, uuid, boolean, text) from public, anon;
grant execute on function public.civicpulse_assign_department(uuid, uuid, uuid, boolean, text) to authenticated;

-- 4. Performance Index on department_assignment_history
create index if not exists dept_assignment_history_report
  on public.department_assignment_history (report_id, created_at desc);

commit;


-- -----------------------------------------------------------------------------
-- MIGRATION: 20261121000900_phase12_duplicate_detection.sql
-- -----------------------------------------------------------------------------

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


-- -----------------------------------------------------------------------------
-- MIGRATION: 20261121001000_phase13_community_support.sql
-- -----------------------------------------------------------------------------

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


-- -----------------------------------------------------------------------------
-- MIGRATION: 20261121001100_phase14_priority_scoring.sql
-- -----------------------------------------------------------------------------

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


-- -----------------------------------------------------------------------------
-- MIGRATION: 20261121001200_phase15_automatic_department_routing.sql
-- -----------------------------------------------------------------------------

-- Phase 15: Automatic Department Routing, Category-to-Department Mapping,
-- Secure Auto-Assignment, Manual Admin Override Precedence, Transactional Audit History
-- Migration: 20261121001200_phase15_automatic_department_routing.sql

begin;

-- 1. Schema Extensions on public.reports
-- Add manual_override and assignment_source columns to track assignment authority durably.
alter table public.reports
  add column if not exists manual_override boolean not null default false,
  add column if not exists assignment_source text not null default 'unassigned'
    check (assignment_source in ('unassigned', 'automatic', 'manual'));

-- Performance index for locating unassigned complaints for backfill / review
create index if not exists reports_routing_unassigned_idx
  on public.reports (department_id, manual_override, status)
  where department_id is null;

-- 2. Schema Extensions on public.department_assignment_history
-- Allow assigned_by to be null for system-generated automatic routing actions (no fabricated user UUIDs).
alter table public.department_assignment_history
  alter column assigned_by drop not null;

-- Add assignment_source and rule_key for explainability and auditing
alter table public.department_assignment_history
  add column if not exists assignment_source text not null default 'manual'
    check (assignment_source in ('manual', 'automatic')),
  add column if not exists rule_key text;

-- 3. Update public.civicpulse_assign_department
-- Ensure manual administrator assignments always mark manual_override = true and assignment_source = 'manual'.
create or replace function public.civicpulse_assign_department(
  p_report_id uuid,
  p_department_id uuid,
  p_expected_department_id uuid default null,
  p_check_expected boolean default false,
  p_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_uid uuid;
  caller_role text;
  target_report public.reports%rowtype;
  target_dept public.departments%rowtype;
  v_reason text;
  v_updated_at timestamptz;
  new_history_id uuid;
begin
  -- Layer 1: Authentication Guard
  current_uid := auth.uid();
  if current_uid is null then
    raise exception 'UNAUTHORIZED: Authentication required' using errcode = '28000';
  end if;

  -- Layer 2: Role Verification (Strict Admin Only)
  select role into caller_role from public.profiles where id = current_uid;
  if caller_role is null or caller_role <> 'admin' then
    raise exception 'FORBIDDEN: Administrative privileges required' using errcode = '42501';
  end if;

  -- Layer 3: Lock Target Report with Row-Level Lock
  select * into target_report from public.reports where id = p_report_id for update;
  if target_report.id is null then
    raise exception 'NOT_FOUND: Report not found' using errcode = 'P0002';
  end if;

  -- Layer 4: Lifecycle Restriction: Resolved complaints cannot be reassigned
  if target_report.status = 'resolved' then
    raise exception 'ASSIGNMENT_CONFLICT: Cannot reassign a resolved complaint' using errcode = '23514';
  end if;

  -- Layer 5: Validate Target Department Existence
  select * into target_dept from public.departments where id = p_department_id;
  if target_dept.id is null then
    raise exception 'NOT_FOUND: Department not found' using errcode = 'P0002';
  end if;

  -- Layer 6: Duplicate No-Op Protection
  if target_report.department_id = p_department_id then
    raise exception 'ASSIGNMENT_CONFLICT: Report is already assigned to this department' using errcode = '23514';
  end if;

  -- Layer 7: Optimistic Concurrency Check (expected_department_id)
  if p_check_expected then
    if p_expected_department_id is null and target_report.department_id is not null then
      raise exception 'ASSIGNMENT_CONFLICT: Complaint was already assigned to another department. Expected unassigned but found %',
        target_report.department_id using errcode = '23514';
    elsif p_expected_department_id is not null and target_report.department_id is distinct from p_expected_department_id then
      raise exception 'ASSIGNMENT_CONFLICT: Complaint department changed. Expected % but found %',
        p_expected_department_id, coalesce(target_report.department_id::text, 'unassigned') using errcode = '23514';
    end if;
  end if;

  -- Layer 8: Reason Validation and Sanitization
  v_reason := trim(both ' ' from coalesce(p_reason, ''));
  if char_length(v_reason) > 1000 then
    raise exception 'INVALID_PARAMETER: Reason cannot exceed 1000 characters' using errcode = '22023';
  end if;
  if v_reason = '' then
    v_reason := null;
  end if;

  -- Layer 9: Execute Atomic Update on public.reports with Manual Override Precedence
  update public.reports
  set
    department_id = p_department_id,
    manual_override = true,
    assignment_source = 'manual',
    updated_at = clock_timestamp()
  where id = p_report_id
  returning updated_at into v_updated_at;

  -- Layer 10: Persist Dedicated Assignment Audit History with assignment_source = 'manual'
  insert into public.department_assignment_history (
    report_id,
    previous_department_id,
    new_department_id,
    assigned_by,
    assignment_source,
    reason,
    created_at
  ) values (
    p_report_id,
    target_report.department_id,
    p_department_id,
    current_uid,
    'manual',
    v_reason,
    clock_timestamp()
  )
  returning id into new_history_id;

  -- Layer 11: Return JSON Response Payload
  return jsonb_build_object(
    'report_id', p_report_id,
    'previous_department_id', target_report.department_id,
    'department', jsonb_build_object(
      'id', target_dept.id,
      'name', target_dept.name
    ),
    'assigned_by', current_uid,
    'assigned_at', v_updated_at,
    'assignment_source', 'manual',
    'manual_override', true,
    'assignment_history_id', new_history_id
  );
end;
$$;

revoke all on function public.civicpulse_assign_department(uuid, uuid, uuid, boolean, text) from public, anon;
grant execute on function public.civicpulse_assign_department(uuid, uuid, uuid, boolean, text) to authenticated;

-- 4. Create public.civicpulse_auto_route_report
-- Deterministically routes a report based on category mapping while strictly respecting manual override precedence.
create or replace function public.civicpulse_auto_route_report(
  p_report_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_uid uuid;
  caller_role text;
  is_svc boolean;
  target_report public.reports%rowtype;
  target_dept public.departments%rowtype;
  v_dept_name text;
  v_rule_key text;
  v_updated_at timestamptz;
  new_history_id uuid;
begin
  -- Layer 1: Authorization Guard (Only service_role or admin callers)
  caller_uid := auth.uid();
  is_svc := (coalesce(auth.role(), '') = 'service_role');

  if not is_svc then
    if caller_uid is null then
      raise exception 'UNAUTHORIZED: Authentication required' using errcode = '28000';
    end if;

    select role into caller_role from public.profiles where id = caller_uid;
    if caller_role is null or caller_role <> 'admin' then
      raise exception 'FORBIDDEN: Administrative or service privileges required' using errcode = '42501';
    end if;
  end if;

  -- Layer 2: Lock Target Report with Row-Level Lock
  select * into target_report from public.reports where id = p_report_id for update;
  if target_report.id is null then
    raise exception 'NOT_FOUND: Report not found' using errcode = 'P0002';
  end if;

  -- Layer 3: Lifecycle Restriction: Resolved complaints are frozen
  if target_report.status = 'resolved' then
    return jsonb_build_object(
      'report_id', p_report_id,
      'routing_status', 'skipped_resolved',
      'assignment_source', target_report.assignment_source,
      'department', case
        when target_report.department_id is not null then
          (select jsonb_build_object('id', id, 'name', name) from public.departments where id = target_report.department_id)
        else null
      end,
      'previous_department_id', target_report.department_id,
      'message', 'Complaint is resolved and cannot be automatically routed'
    );
  end if;

  -- Layer 4: Manual Admin Override Precedence
  -- If manually assigned or unassigned by an admin, automatic routing must skip.
  if target_report.manual_override = true or target_report.assignment_source = 'manual' then
    return jsonb_build_object(
      'report_id', p_report_id,
      'routing_status', 'skipped_manual_override',
      'assignment_source', 'manual',
      'department', case
        when target_report.department_id is not null then
          (select jsonb_build_object('id', id, 'name', name) from public.departments where id = target_report.department_id)
        else null
      end,
      'previous_department_id', target_report.department_id,
      'message', 'Complaint is protected by administrator manual override'
    );
  end if;

  -- Layer 5: Canonical Category-to-Department Mapping
  case target_report.category
    when 'pothole' then v_dept_name := 'Road Maintenance';
    when 'garbage' then v_dept_name := 'Sanitation';
    when 'water_leakage' then v_dept_name := 'Water Supply';
    when 'streetlight' then v_dept_name := 'Electrical';
    when 'drainage' then v_dept_name := 'Drainage';
    when 'damaged_infrastructure' then v_dept_name := 'Public Works';
    else v_dept_name := null;
  end case;

  if v_dept_name is null then
    return jsonb_build_object(
      'report_id', p_report_id,
      'routing_status', 'skipped_unmapped',
      'assignment_source', target_report.assignment_source,
      'department', null,
      'previous_department_id', target_report.department_id,
      'message', 'Category requires manual administrator review'
    );
  end if;

  -- Layer 6: Dynamic Department Resolution from Database
  select * into target_dept from public.departments where name = v_dept_name;
  if target_dept.id is null then
    return jsonb_build_object(
      'report_id', p_report_id,
      'routing_status', 'target_department_missing',
      'assignment_source', target_report.assignment_source,
      'department', null,
      'previous_department_id', target_report.department_id,
      'message', 'Target department ' || v_dept_name || ' does not exist in database directory'
    );
  end if;

  v_rule_key := target_report.category || '_to_' || lower(replace(target_dept.name, ' ', '_'));

  -- Layer 7: Idempotency Check: Already assigned to target department
  if target_report.department_id = target_dept.id then
    return jsonb_build_object(
      'report_id', p_report_id,
      'routing_status', 'skipped_already_assigned',
      'assignment_source', target_report.assignment_source,
      'department', jsonb_build_object('id', target_dept.id, 'name', target_dept.name),
      'previous_department_id', target_report.department_id,
      'rule_key', v_rule_key,
      'message', 'Complaint is already assigned to the target department'
    );
  end if;

  -- Layer 8: Execute Atomic Update on public.reports
  update public.reports
  set
    department_id = target_dept.id,
    assignment_source = 'automatic',
    updated_at = clock_timestamp()
  where id = p_report_id
  returning updated_at into v_updated_at;

  -- Layer 9: Persist Dedicated Assignment Audit History (System Action: assigned_by = null)
  insert into public.department_assignment_history (
    report_id,
    previous_department_id,
    new_department_id,
    assigned_by,
    assignment_source,
    rule_key,
    reason,
    created_at
  ) values (
    p_report_id,
    target_report.department_id,
    target_dept.id,
    null,
    'automatic',
    v_rule_key,
    'Automated routing based on complaint category: ' || target_report.category,
    clock_timestamp()
  )
  returning id into new_history_id;

  -- Layer 10: Return Standardized Routing Result DTO
  return jsonb_build_object(
    'report_id', p_report_id,
    'routing_status', 'assigned',
    'assignment_source', 'automatic',
    'department', jsonb_build_object('id', target_dept.id, 'name', target_dept.name),
    'previous_department_id', target_report.department_id,
    'rule_key', v_rule_key,
    'assignment_history_id', new_history_id,
    'assigned_at', v_updated_at,
    'message', 'Complaint routed successfully'
  );
end;
$$;

revoke all on function public.civicpulse_auto_route_report(uuid) from public, anon;
grant execute on function public.civicpulse_auto_route_report(uuid) to authenticated;

-- 5. Update public.civicpulse_create_report
-- In-transaction automatic routing during citizen complaint submission.
create or replace function public.civicpulse_create_report(
  p_title text,
  p_description text,
  p_category text,
  p_latitude double precision,
  p_longitude double precision,
  p_image_path text,
  p_severity text default 'medium',
  p_submission_key uuid default gen_random_uuid()
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_uid uuid;
  existing_report public.reports%rowtype;
  new_report_id uuid;
  new_reference text;
  new_created_at timestamptz;
  v_submission_key uuid;
  path_match boolean;
  v_target_dept_name text;
  v_target_dept public.departments%rowtype;
  v_dept_id uuid := null;
  v_assignment_src text := 'unassigned';
  v_rule_key text := null;
begin
  -- Layer 1: Authentication Guard
  current_uid := auth.uid();
  if current_uid is null then
    raise exception 'UNAUTHORIZED: Authentication required to submit complaint' using errcode = '28000';
  end if;

  v_submission_key := coalesce(p_submission_key, gen_random_uuid());

  -- Layer 2: Idempotent Submission Check
  select * into existing_report
  from public.reports
  where submission_key = v_submission_key and user_id = current_uid;

  if existing_report.id is null then
    select r.* into existing_report
    from public.reports r
    join public.report_images ri on ri.report_id = r.id
    where ri.storage_path = p_image_path and r.user_id = current_uid;
  end if;

  -- Layer 3: Return Existing Report on Repeat Request
  if existing_report.id is not null then
    return jsonb_build_object(
      'id', existing_report.id,
      'reference', existing_report.reference,
      'title', existing_report.title,
      'description', existing_report.description,
      'category', existing_report.category,
      'severity', existing_report.severity,
      'status', existing_report.status,
      'priority_score', existing_report.priority_score,
      'latitude', existing_report.latitude,
      'longitude', existing_report.longitude,
      'image_count', 1,
      'image_path', p_image_path,
      'department_id', existing_report.department_id,
      'assignment_source', existing_report.assignment_source,
      'created_at', existing_report.created_at
    );
  end if;

  -- Layer 4: Storage Draft Ownership Verification
  path_match := p_image_path ~ ('^drafts/' || current_uid::text || '/[0-9a-fA-F-]{36}\.(jpg|jpeg|png|webp)$');
  if not path_match then
    raise exception 'FORBIDDEN: Evidence image does not belong to authenticated citizen' using errcode = '42501';
  end if;

  -- Layer 5: Duplicate Evidence Check
  if exists (select 1 from public.report_images where storage_path = p_image_path) then
    raise exception 'CONFLICT: This image has already been associated with another report' using errcode = '23505';
  end if;

  -- Layer 6: Storage Object Existence Check (if storage catalog is available)
  if to_regclass('storage.objects') is not null then
    if not exists (select 1 from storage.objects where bucket_id = 'civic-evidence' and name = p_image_path) then
      raise exception 'NOT_FOUND: Evidence image object not found in storage bucket' using errcode = 'P0002';
    end if;
  end if;

  -- Layer 7: Category & Severity Validation
  if p_category not in ('pothole','garbage','water_leakage','streetlight','drainage','damaged_infrastructure','other') then
    raise exception 'VALIDATION_ERROR: Invalid category %', p_category using errcode = '22023';
  end if;
  if p_severity not in ('low','medium','high','critical') then
    raise exception 'VALIDATION_ERROR: Invalid severity %', p_severity using errcode = '22023';
  end if;

  -- Layer 8: Resolve Automatic Department Routing
  case p_category
    when 'pothole' then v_target_dept_name := 'Road Maintenance';
    when 'garbage' then v_target_dept_name := 'Sanitation';
    when 'water_leakage' then v_target_dept_name := 'Water Supply';
    when 'streetlight' then v_target_dept_name := 'Electrical';
    when 'drainage' then v_target_dept_name := 'Drainage';
    when 'damaged_infrastructure' then v_target_dept_name := 'Public Works';
    else v_target_dept_name := null;
  end case;

  if v_target_dept_name is not null then
    select * into v_target_dept from public.departments where name = v_target_dept_name;
    if v_target_dept.id is not null then
      v_dept_id := v_target_dept.id;
      v_assignment_src := 'automatic';
      v_rule_key := p_category || '_to_' || lower(replace(v_target_dept.name, ' ', '_'));
    end if;
  end if;

  -- Layer 9: Atomic Insert into public.reports
  insert into public.reports (
    submission_key,
    user_id,
    title,
    description,
    category,
    severity,
    status,
    latitude,
    longitude,
    publication,
    visibility,
    priority_score,
    department_id,
    manual_override,
    assignment_source,
    resolved_at
  ) values (
    v_submission_key,
    current_uid,
    p_title,
    p_description,
    p_category,
    coalesce(p_severity, 'medium'),
    'pending',
    p_latitude,
    p_longitude,
    'private',
    'listed',
    0,
    v_dept_id,
    false,
    v_assignment_src,
    null
  ) returning id, reference, created_at into new_report_id, new_reference, new_created_at;

  -- Layer 10: Atomic Insert into public.report_images
  insert into public.report_images (
    report_id,
    storage_path,
    type,
    uploaded_by
  ) values (
    new_report_id,
    p_image_path,
    'before',
    current_uid
  );

  -- Layer 11: If automatically assigned, record audit history
  if v_dept_id is not null then
    insert into public.department_assignment_history (
      report_id,
      previous_department_id,
      new_department_id,
      assigned_by,
      assignment_source,
      rule_key,
      reason,
      created_at
    ) values (
      new_report_id,
      null,
      v_dept_id,
      null,
      'automatic',
      v_rule_key,
      'Automated routing based on complaint category: ' || p_category,
      new_created_at
    );
  end if;

  -- Layer 12: Return Standardized Complaint DTO
  return jsonb_build_object(
    'id', new_report_id,
    'reference', new_reference,
    'title', p_title,
    'description', p_description,
    'category', p_category,
    'severity', coalesce(p_severity, 'medium'),
    'status', 'pending',
    'priority_score', 0,
    'latitude', p_latitude,
    'longitude', p_longitude,
    'image_count', 1,
    'image_path', p_image_path,
    'department_id', v_dept_id,
    'department', case
      when v_dept_id is not null then jsonb_build_object('id', v_target_dept.id, 'name', v_target_dept.name)
      else null
    end,
    'assignment_source', v_assignment_src,
    'created_at', new_created_at
  );
end;
$$;

revoke all on function public.civicpulse_create_report(text, text, text, double precision, double precision, text, text, uuid) from public, anon;
grant execute on function public.civicpulse_create_report(text, text, text, double precision, double precision, text, text, uuid) to authenticated;

commit;


-- -----------------------------------------------------------------------------
-- MIGRATION: 20261121001300_phase16_map_viewport.sql
-- -----------------------------------------------------------------------------

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


-- -----------------------------------------------------------------------------
-- MIGRATION: 20261121001400_phase17_realtime_and_resolution.sql
-- -----------------------------------------------------------------------------

-- Phase 17: Supabase Realtime Complaint Tracking, Administrator Resolution Evidence,
-- Before/After Images, Atomic Resolution Workflow, Private Storage Security & Channel Authorization
-- Migration: 20261121001400_phase17_realtime_and_resolution.sql
begin;

-- ============================================================================
-- 1. Hardened Storage RLS: Admin Resolution Evidence Uploads
-- ============================================================================
do $storage_policy$
begin
  if to_regclass('storage.objects') is not null then
    -- Policy: Admins can upload resolution drafts into resolution-drafts/<admin_id>/<report_id>/...
    drop policy if exists "admin_upload_resolution_draft" on storage.objects;
    create policy "admin_upload_resolution_draft" on storage.objects
    for insert to authenticated
    with check (
      bucket_id = 'civic-evidence'
      and (storage.foldername(name))[1] = 'resolution-drafts'
      and (storage.foldername(name))[2] = (select auth.uid())::text
      and exists (
        select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin'
      )
    );

    -- Policy: Admins can delete only unfinalized resolution drafts
    drop policy if exists "admin_delete_unlinked_resolution_draft" on storage.objects;
    create policy "admin_delete_unlinked_resolution_draft" on storage.objects
    for delete to authenticated
    using (
      bucket_id = 'civic-evidence'
      and (storage.foldername(name))[1] = 'resolution-drafts'
      and (storage.foldername(name))[2] = (select auth.uid())::text
      and not exists (
        select 1 from public.report_images ri where ri.storage_path = storage.objects.name
      )
    );
  end if;
end;
$storage_policy$;

-- ============================================================================
-- 2. Direct RLS Protection on public.report_images for 'after' Evidence
-- ============================================================================
drop policy if exists image_admin_create on public.report_images;
create policy image_admin_create on public.report_images
for insert to authenticated
with check (
  uploaded_by = (select auth.uid())
  and type = 'after'
  and (select civicpulse_private.is_admin())
  and exists (
    select 1 from public.reports r
    where r.id = report_id and r.status = 'in_progress'
  )
);

-- ============================================================================
-- 3. Enhanced Atomic Status Transition RPC with Resolution Evidence Support
-- ============================================================================
create or replace function public.civicpulse_transition_report_status(
  p_report_id uuid,
  p_new_status text,
  p_notes text default null,
  p_expected_status text default null,
  p_after_image_path text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_uid uuid;
  caller_role text;
  target_report public.reports%rowtype;
  v_notes text;
  v_resolved_at timestamptz;
  new_version integer;
  v_updated_at timestamptz;
  new_history_id uuid;
  new_image_id uuid;
  path_match boolean;
  clean_after_path text;
begin
  -- Layer 1: Authentication Guard
  current_uid := auth.uid();
  if current_uid is null then
    raise exception 'UNAUTHORIZED: Authentication required' using errcode = '28000';
  end if;

  -- Layer 2: Role Verification (Strict Admin Only)
  select role into caller_role from public.profiles where id = current_uid;
  if caller_role is null or caller_role <> 'admin' then
    raise exception 'FORBIDDEN: Administrative privileges required' using errcode = '42501';
  end if;

  -- Layer 3: Validate new_status is canonical
  if p_new_status not in ('pending', 'in_progress', 'resolved') then
    raise exception 'INVALID_PARAMETER: Unknown status %', p_new_status using errcode = '22023';
  end if;

  -- Layer 4: Lock Target Report with Row-Level Lock
  select * into target_report from public.reports where id = p_report_id for update;
  if target_report.id is null then
    raise exception 'NOT_FOUND: Report not found' using errcode = 'P0002';
  end if;

  -- Layer 5: Optimistic Concurrency Check (expected_status)
  if p_expected_status is not null and target_report.status <> p_expected_status then
    raise exception 'STATUS_CONFLICT: Complaint status changed. Expected % but current status is %',
      p_expected_status, target_report.status using errcode = '23514';
  end if;

  -- Layer 6: Same-Status Idempotency / Conflict Check
  if target_report.status = p_new_status then
    clean_after_path := nullif(trim(both ' ' from coalesce(p_after_image_path, '')), '');
    -- Safe replay: if report is already resolved and the same after_image is associated, return existing state
    if p_new_status = 'resolved' and clean_after_path is not null then
      select id into new_image_id
      from public.report_images
      where report_id = p_report_id and storage_path = clean_after_path and type = 'after';

      if new_image_id is not null then
        select id into new_history_id
        from public.status_history
        where report_id = p_report_id and status = 'resolved'
        order by created_at desc limit 1;

        return jsonb_build_object(
          'id', p_report_id,
          'previous_status', 'in_progress',
          'status', 'resolved',
          'updated_at', target_report.updated_at,
          'resolved_at', target_report.resolved_at,
          'history_entry_id', new_history_id,
          'version', target_report.version,
          'resolution_evidence', jsonb_build_object(
            'image_id', new_image_id,
            'storage_path', clean_after_path,
            'type', 'after'
          )
        );
      end if;
    end if;

    raise exception 'STATUS_CONFLICT: Report is already in status %', p_new_status using errcode = '23514';
  end if;

  -- Layer 7: State Transition Matrix (pending -> in_progress -> resolved)
  if not (
    (target_report.status = 'pending' and p_new_status = 'in_progress') or
    (target_report.status = 'in_progress' and p_new_status = 'resolved')
  ) then
    raise exception 'STATUS_CONFLICT: Cannot transition complaint status from % to %',
      target_report.status, p_new_status using errcode = '23514';
  end if;

  -- Layer 8: Phase 17 Resolution Evidence Validation
  if p_new_status = 'resolved' then
    clean_after_path := nullif(trim(both ' ' from coalesce(p_after_image_path, '')), '');
    if clean_after_path is null then
      raise exception 'RESOLUTION_EVIDENCE_REQUIRED: Resolution requires an administrator-submitted after-repair image' using errcode = '22023';
    end if;

    -- Validate path structure: resolution-drafts/<admin_id>/<report_id>/<uuid>.<ext>
    path_match := clean_after_path ~ ('^resolution-drafts/' || current_uid::text || '/' || p_report_id::text || '/[0-9a-fA-F-]{36}\.(jpg|jpeg|png|webp)$');
    if not path_match then
      raise exception 'FORBIDDEN: Evidence image does not belong to authorized administrator resolution staging for this report' using errcode = '42501';
    end if;

    -- Cross-report reuse protection: ensure image is not linked to any other complaint
    if exists (select 1 from public.report_images where storage_path = clean_after_path and report_id <> p_report_id) then
      raise exception 'CONFLICT: This evidence image has already been associated with another report' using errcode = '23505';
    end if;

    -- Storage catalog existence check (if storage catalog is installed)
    if to_regclass('storage.objects') is not null then
      if not exists (select 1 from storage.objects where bucket_id = 'civic-evidence' and name = clean_after_path) then
        raise exception 'NOT_FOUND: Evidence image object not found in storage bucket' using errcode = 'P0002';
      end if;
    end if;

    -- Atomically insert the after-image record into public.report_images
    insert into public.report_images (report_id, storage_path, type, uploaded_by)
    values (p_report_id, clean_after_path, 'after', current_uid)
    on conflict (storage_path) do nothing
    returning id into new_image_id;

    if new_image_id is null then
      select id into new_image_id from public.report_images where storage_path = clean_after_path;
    end if;
  end if;

  -- Layer 9: Notes validation and sanitization
  v_notes := trim(both ' ' from coalesce(p_notes, ''));
  if char_length(v_notes) > 1000 then
    raise exception 'INVALID_PARAMETER: Notes cannot exceed 1000 characters' using errcode = '22023';
  end if;
  if v_notes = '' then
    v_notes := null;
  end if;

  -- Layer 10: Set transaction-local note for record_report_event trigger
  if v_notes is not null then
    perform set_config('civicpulse.transition_notes', v_notes, true);
  else
    perform set_config('civicpulse.transition_notes', '', true);
  end if;

  -- Layer 11: Manage resolved_at timestamp
  if p_new_status = 'resolved' then
    v_resolved_at := clock_timestamp();
  else
    v_resolved_at := null;
  end if;

  -- Layer 12: Execute atomic update (advances version and fires record_report_event trigger)
  update public.reports
  set
    status = p_new_status,
    resolved_at = v_resolved_at,
    updated_at = clock_timestamp()
  where id = p_report_id
  returning version, updated_at into new_version, v_updated_at;

  -- Layer 13: Retrieve newly created status_history id
  select id into new_history_id
  from public.status_history
  where report_id = p_report_id and version = new_version;

  -- Layer 14: Return verified response payload
  return jsonb_build_object(
    'id', p_report_id,
    'previous_status', target_report.status,
    'status', p_new_status,
    'updated_at', v_updated_at,
    'resolved_at', v_resolved_at,
    'history_entry_id', new_history_id,
    'version', new_version,
    'resolution_evidence', case
      when p_new_status = 'resolved' and new_image_id is not null then
        jsonb_build_object(
          'image_id', new_image_id,
          'storage_path', clean_after_path,
          'type', 'after'
        )
      else null
    end
  );
end;
$$;

revoke all on function public.civicpulse_transition_report_status(uuid, text, text, text, text) from public, anon;
grant execute on function public.civicpulse_transition_report_status(uuid, text, text, text, text) to authenticated;

-- ============================================================================
-- 4. Database-Level Invariant Enforcement: Direct DB Update Trigger
-- ============================================================================
-- Prevents bypass of evidence requirement via direct SQL 'UPDATE public.reports SET status = resolved'
create or replace function public.civicpulse_check_resolution_evidence()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (new.status = 'resolved' and old.status <> 'resolved') then
    if not exists (
      select 1 from public.report_images ri
      where ri.report_id = new.id and ri.type = 'after'
    ) then
      raise exception 'RESOLUTION_EVIDENCE_REQUIRED: Direct update to resolved prohibited without associated after-repair evidence in report_images' using errcode = '22023';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists reports_resolution_evidence_check on public.reports;
create trigger reports_resolution_evidence_check
  before update on public.reports
  for each row
  execute function public.civicpulse_check_resolution_evidence();

-- ============================================================================
-- 5. Realtime Channel Authorization: Private Broadcast Security
-- ============================================================================
do $realtime_auth$
begin
  if to_regclass('realtime.messages') is not null then
    begin
      alter table realtime.messages enable row level security;

      -- Allow subscribers to receive messages only on authorized channels:
      -- 1. 'reports:public' is accessible by anyone
      -- 2. 'report:<uuid>' is accessible if report is public/listed, caller is owner, or caller is admin
      drop policy if exists "realtime_subscriber_auth" on realtime.messages;
      create policy "realtime_subscriber_auth" on realtime.messages
      for select to authenticated, anon
      using (
        topic = 'reports:public'
        or (
          topic ~ '^report:[0-9a-fA-F-]{36}$'
          and exists (
            select 1 from public.reports r
            where r.id = (substring(topic from 8))::uuid
              and (
                (r.publication = 'public' and r.visibility = 'listed')
                or (auth.uid() is not null and r.user_id = auth.uid())
                or (auth.uid() is not null and exists (
                  select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'
                ))
              )
          )
        )
      );

      -- Anti-spoofing guard: strictly forbid client-side broadcast inserts
      drop policy if exists "realtime_client_publish_block" on realtime.messages;
      create policy "realtime_client_publish_block" on realtime.messages
      for insert to authenticated, anon
      with check (false);
    exception when others then
      raise notice 'Realtime messages RLS configuration skipped: %', sqlerrm;
    end;
  end if;
end;
$realtime_auth$;

-- ============================================================================
-- 6. Supabase Realtime Publication Configuration (if publication exists)
-- ============================================================================
do $pub$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'reports'
    ) then
      begin
        alter publication supabase_realtime add table public.reports;
      exception when others then
        raise notice 'Realtime publication update skipped: %', sqlerrm;
      end;
    end if;
  end if;
end;
$pub$;

commit;


-- -----------------------------------------------------------------------------
-- MIGRATION: 20261121001500_phase18_admin_analytics.sql
-- -----------------------------------------------------------------------------

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


-- -----------------------------------------------------------------------------
-- MIGRATION: 20261121001600_phase19_security_hardening.sql
-- -----------------------------------------------------------------------------

-- Phase 19: Ultimate Security Hardening, RLS & RBAC Verification, Function Privilege Lockout, and Audit Protection
-- Migration: 20261121001600_phase19_security_hardening.sql
begin;

-- ============================================================================
-- 1. Direct RLS Hardening on public.report_votes: Forbid Self-Voting
-- ============================================================================
-- Ensure that direct Data API inserts cannot upvote a report created by the caller,
-- aligning direct database access with the application-level self-voting policy.
drop policy if exists vote_self_active on public.report_votes;
create policy vote_self_active on public.report_votes
for insert to authenticated
with check (
  user_id = (select auth.uid())
  and not (select civicpulse_private.is_admin())
  and exists (
    select 1 from public.reports r
    where r.id = report_id
      and r.publication = 'public'
      and r.visibility = 'listed'
      and r.status in ('pending', 'in_progress')
      and r.user_id != (select auth.uid())
  )
);

-- ============================================================================
-- 2. Revoke Public Execution on Database Triggers and Internal Functions
-- ============================================================================
-- Trigger functions must only execute via PostgreSQL trigger dispatch and must
-- not be callable as standalone SQL routines by public, anon, or authenticated roles.
revoke all on function public.civicpulse_check_resolution_evidence() from public, anon;
revoke all on function civicpulse_private.on_vote_recalculate_priority() from public, anon, authenticated;
revoke all on function civicpulse_private.record_report_event() from public, anon, authenticated;
revoke all on function civicpulse_private.advance_report_version() from public, anon, authenticated;

-- Ensure public.find_nearby_reports explicitly revokes from public pseudo-role
revoke all on function public.find_nearby_reports(double precision, double precision, text, double precision, integer) from public;
grant execute on function public.find_nearby_reports(double precision, double precision, text, double precision, integer) to authenticated, anon;

-- ============================================================================
-- 3. Audit History & Immutability Enforcement
-- ============================================================================
-- Ensure client roles cannot insert, update, or delete immutable audit records.
revoke insert, update, delete on table public.status_history from public, anon, authenticated;
revoke insert, update, delete on table public.department_assignment_history from public, anon, authenticated;
revoke update, delete on table public.report_votes from public, anon, authenticated;

-- ============================================================================
-- 4. Storage Defense-in-Depth: Finalized Evidence Protection
-- ============================================================================
do $storage_hardening$
begin
  if to_regclass('storage.objects') is not null then
    -- Verify citizen draft deletion policy strictly excludes finalized report images
    drop policy if exists "citizen_delete_draft" on storage.objects;
    create policy "citizen_delete_draft" on storage.objects
    for delete to authenticated
    using (
      bucket_id = 'civic-evidence'
      and (storage.foldername(name))[1] = 'drafts'
      and (storage.foldername(name))[2] = (select auth.uid())::text
      and not exists (
        select 1 from public.report_images ri where ri.storage_path = storage.objects.name
      )
    );

    -- Verify admin resolution draft deletion policy strictly excludes finalized report images
    drop policy if exists "admin_delete_unlinked_resolution_draft" on storage.objects;
    create policy "admin_delete_unlinked_resolution_draft" on storage.objects
    for delete to authenticated
    using (
      bucket_id = 'civic-evidence'
      and (storage.foldername(name))[1] = 'resolution-drafts'
      and (storage.foldername(name))[2] = (select auth.uid())::text
      and not exists (
        select 1 from public.report_images ri where ri.storage_path = storage.objects.name
      )
    );
  end if;
end;
$storage_hardening$;

-- ============================================================================
-- 5. Service Role Access for Server & Admin SDK
-- ============================================================================
do $service_role_grants$
begin
  if exists (select from pg_roles where rolname = 'service_role') then
    grant all on all tables in schema public to service_role;
    grant all on all sequences in schema public to service_role;
    grant all on all routines in schema public to service_role;
  end if;
end;
$service_role_grants$;

commit;


-- -----------------------------------------------------------------------------
-- MIGRATION: 20261125000100_phase20_public_report_publication.sql
-- -----------------------------------------------------------------------------

-- Phase 20: Support p_publication parameter in civicpulse_create_report RPC
-- Allows citizen-selected visibility ('public' vs 'private') to persist atomically
-- while defaulting safely to 'private' for backward compatibility.
begin;

drop function if exists public.civicpulse_create_report(text, text, text, double precision, double precision, text, text, uuid);

create or replace function public.civicpulse_create_report(
  p_title text,
  p_description text,
  p_category text,
  p_latitude double precision,
  p_longitude double precision,
  p_image_path text,
  p_severity text default 'medium',
  p_submission_key uuid default gen_random_uuid(),
  p_publication text default 'private'
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_uid uuid;
  existing_report public.reports%rowtype;
  new_report_id uuid;
  new_reference text;
  new_created_at timestamptz;
  v_submission_key uuid;
  v_publication text;
  path_match boolean;
  v_target_dept_name text;
  v_target_dept public.departments%rowtype;
  v_dept_id uuid := null;
  v_assignment_src text := 'unassigned';
  v_rule_key text := null;
begin
  -- Layer 1: Authentication Guard
  current_uid := auth.uid();
  if current_uid is null then
    raise exception 'UNAUTHORIZED: Authentication required to submit complaint' using errcode = '28000';
  end if;

  v_submission_key := coalesce(p_submission_key, gen_random_uuid());
  v_publication := case when lower(coalesce(p_publication, 'private')) = 'public' then 'public' else 'private' end;

  -- Layer 2: Idempotent Submission Check
  select * into existing_report
  from public.reports
  where submission_key = v_submission_key and user_id = current_uid;

  if existing_report.id is null then
    select r.* into existing_report
    from public.reports r
    join public.report_images ri on ri.report_id = r.id
    where ri.storage_path = p_image_path and r.user_id = current_uid;
  end if;

  -- Layer 3: Return Existing Report on Repeat Request
  if existing_report.id is not null then
    return jsonb_build_object(
      'id', existing_report.id,
      'reference', existing_report.reference,
      'title', existing_report.title,
      'description', existing_report.description,
      'category', existing_report.category,
      'severity', existing_report.severity,
      'status', existing_report.status,
      'publication', existing_report.publication,
      'priority_score', existing_report.priority_score,
      'latitude', existing_report.latitude,
      'longitude', existing_report.longitude,
      'image_count', 1,
      'image_path', p_image_path,
      'department_id', existing_report.department_id,
      'assignment_source', existing_report.assignment_source,
      'created_at', existing_report.created_at
    );
  end if;

  -- Layer 4: Storage Draft Ownership Verification
  path_match := p_image_path ~ ('^drafts/' || current_uid::text || '/[0-9a-fA-F-]{36}\.(jpg|jpeg|png|webp)$');
  if not path_match then
    raise exception 'FORBIDDEN: Evidence image does not belong to authenticated citizen' using errcode = '42501';
  end if;

  -- Layer 5: Duplicate Evidence Check
  if exists (select 1 from public.report_images where storage_path = p_image_path) then
    raise exception 'CONFLICT: This image has already been associated with another report' using errcode = '23505';
  end if;

  -- Layer 6: Storage Object Existence Check (if storage catalog is available)
  if to_regclass('storage.objects') is not null then
    if not exists (select 1 from storage.objects where bucket_id = 'civic-evidence' and name = p_image_path) then
      raise exception 'NOT_FOUND: Evidence image object not found in storage bucket' using errcode = 'P0002';
    end if;
  end if;

  -- Layer 7: Category & Severity Validation
  if p_category not in ('pothole','garbage','water_leakage','streetlight','drainage','damaged_infrastructure','other') then
    raise exception 'VALIDATION_ERROR: Invalid category %', p_category using errcode = '22023';
  end if;
  if p_severity not in ('low','medium','high','critical') then
    raise exception 'VALIDATION_ERROR: Invalid severity %', p_severity using errcode = '22023';
  end if;

  -- Layer 8: Resolve Automatic Department Routing
  case p_category
    when 'pothole' then v_target_dept_name := 'Road Maintenance';
    when 'garbage' then v_target_dept_name := 'Sanitation';
    when 'water_leakage' then v_target_dept_name := 'Water Supply';
    when 'streetlight' then v_target_dept_name := 'Electrical';
    when 'drainage' then v_target_dept_name := 'Drainage';
    when 'damaged_infrastructure' then v_target_dept_name := 'Public Works';
    else v_target_dept_name := null;
  end case;

  if v_target_dept_name is not null then
    select * into v_target_dept from public.departments where name = v_target_dept_name;
    if v_target_dept.id is not null then
      v_dept_id := v_target_dept.id;
      v_assignment_src := 'automatic';
      v_rule_key := p_category || '_to_' || lower(replace(v_target_dept.name, ' ', '_'));
    end if;
  end if;

  -- Layer 9: Atomic Insert into public.reports
  insert into public.reports (
    submission_key,
    user_id,
    title,
    description,
    category,
    severity,
    status,
    latitude,
    longitude,
    publication,
    visibility,
    priority_score,
    department_id,
    manual_override,
    assignment_source,
    resolved_at
  ) values (
    v_submission_key,
    current_uid,
    p_title,
    p_description,
    p_category,
    coalesce(p_severity, 'medium'),
    'pending',
    p_latitude,
    p_longitude,
    v_publication,
    'listed',
    0,
    v_dept_id,
    false,
    v_assignment_src,
    null
  ) returning id, reference, created_at into new_report_id, new_reference, new_created_at;

  -- Layer 10: Atomic Insert into public.report_images
  insert into public.report_images (
    report_id,
    storage_path,
    type,
    uploaded_by
  ) values (
    new_report_id,
    p_image_path,
    'before',
    current_uid
  );

  -- Layer 11: If automatically assigned, record audit history
  if v_dept_id is not null then
    insert into public.department_assignment_history (
      report_id,
      previous_department_id,
      new_department_id,
      assigned_by,
      assignment_source,
      rule_key,
      reason,
      created_at
    ) values (
      new_report_id,
      null,
      v_dept_id,
      null,
      'automatic',
      v_rule_key,
      'Automated routing based on complaint category: ' || p_category,
      new_created_at
    );
  end if;

  -- Layer 12: Return Standardized Complaint DTO
  return jsonb_build_object(
    'id', new_report_id,
    'reference', new_reference,
    'title', p_title,
    'description', p_description,
    'category', p_category,
    'severity', coalesce(p_severity, 'medium'),
    'status', 'pending',
    'publication', v_publication,
    'priority_score', 0,
    'latitude', p_latitude,
    'longitude', p_longitude,
    'image_count', 1,
    'image_path', p_image_path,
    'department_id', v_dept_id,
    'department', case
      when v_dept_id is not null then jsonb_build_object('id', v_target_dept.id, 'name', v_target_dept.name)
      else null
    end,
    'assignment_source', v_assignment_src,
    'created_at', new_created_at
  );
end;
$$;

revoke all on function public.civicpulse_create_report(text, text, text, double precision, double precision, text, text, uuid, text) from public, anon;
grant execute on function public.civicpulse_create_report(text, text, text, double precision, double precision, text, text, uuid, text) to authenticated;

commit;


