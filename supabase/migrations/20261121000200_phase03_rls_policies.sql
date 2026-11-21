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
    ('departments', array['department_directory']),
    ('reports', array['report_private_read','report_self_create','report_admin_triage']),
    ('report_votes', array['vote_private_read','vote_self_active']),
    ('status_history', array['timeline_report_reader']),
    ('report_images', array['image_report_reader'])
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
    and (proname not in ('is_admin','advance_report_version','record_report_event')
      or pronargs<>0 or proowner<>current_user::regrole))
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
