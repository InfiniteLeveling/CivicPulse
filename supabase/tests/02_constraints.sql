-- DEVELOPMENT ONLY. Run the entire file as the Dashboard database owner after the seed.
-- Generate a passwordless Auth fixture inside the rollback transaction. Works
-- before and after Phase 03; no signup, pre-existing user, or key is required.
begin;
create function pg_temp.expect_failure(statement text, expected text) returns void
language plpgsql as $$
begin
  begin
    execute statement;
  exception when others then
    if sqlstate = any(string_to_array(expected, ',')) then return; end if;
    raise;
  end;
  raise exception 'Expected SQLSTATE % for %', expected, statement;
end;
$$;

do $test$
declare
  actor uuid := gen_random_uuid();
  report uuid;
  dept uuid;
  created timestamptz;
  first_updated timestamptz;
  expr text;
begin
  insert into auth.users(id,email) values(actor,actor::text || '@example.invalid');
  perform set_config('request.jwt.claim.sub',actor::text,true);
  perform set_config('request.jwt.claims',json_build_object('sub',actor,'role','authenticated')::text,true);
  insert into public.profiles (id, full_name) values (actor, 'Phase Two Fixture');
  if (select role from public.profiles where id = actor) <> 'citizen' then raise exception 'Role default'; end if;
  perform pg_temp.expect_failure(format('update public.profiles set role = %L where id = %L','officer',actor),'23514');
  perform pg_temp.expect_failure(format('insert into public.profiles(id,full_name) values (%L,%L)',actor,'Duplicate'),'23505');
  perform pg_temp.expect_failure('insert into public.profiles(id,full_name) values (gen_random_uuid(),''Missing Auth'')','23503');
  perform pg_temp.expect_failure('insert into public.departments(name) values (''road maintenance'')','23505');
  perform pg_temp.expect_failure('insert into public.departments(name) values (''   '')','23514');
  select id into strict dept from public.departments where lower(name) = 'electrical';
  insert into public.reports(user_id,submission_key,title,description,category,latitude,longitude)
    values(actor,gen_random_uuid(),'Broken light','The path light is broken','streetlight',90,-180)
    returning id,created_at,updated_at into report,created,first_updated;
  if not exists(select from public.reports where id = report and status = 'pending' and severity = 'medium'
    and priority_score = 0 and department_id is null and publication = 'private' and resolved_at is null
    and reference = 'CP-' || id::text and created_at is not null) then raise exception 'Report defaults'; end if;
  foreach expr in array array[
    'category = ''Water Leakage''','severity = ''urgent''','status = ''assigned''',
    'latitude = 90.01','latitude = -90.01','longitude = 180.01','longitude = -180.01',
    'latitude = ''NaN''','priority_score = -1','priority_score = 101','title = '' ''',
    'description = ''short''','status = ''resolved''','resolved_at = now()'
  ] loop
    perform pg_temp.expect_failure(format('update public.reports set %s where id = %L',expr,report),'23514');
  end loop;
  perform pg_temp.expect_failure(format('update public.reports set department_id=gen_random_uuid() where id=%L',report),'23503');
  update public.reports set department_id = dept, created_at = now() - interval '2 days' where id = report;
  if not exists(select from public.reports where id = report and updated_at > first_updated and created_at = created)
    then raise exception 'Timestamp trigger'; end if;
  -- Phase 03 automatically creates initial support and history. The same
  -- constraints are exercised on either side of that migration.
  if to_regclass('public.civic_report_map') is null then
    insert into public.report_votes(report_id,user_id) values(report,actor);
    insert into public.status_history(report_id,version,status,changed_by) values(report,1,'pending',actor);
  end if;
  perform pg_temp.expect_failure(format('insert into public.report_votes(report_id,user_id) values(%L,%L)',report,actor),'23505');
  perform pg_temp.expect_failure(format('insert into public.status_history(report_id,version,status,changed_by)
    values(%L,1,''pending'',%L)',report,actor),'23505');
  perform pg_temp.expect_failure(format('insert into public.status_history(report_id,version,status,changed_by)
    values(%L,2,''verified'',%L)',report,actor),'23514');
  perform pg_temp.expect_failure(format('insert into public.status_history(report_id,version,status,changed_by)
    values(gen_random_uuid(),1,''pending'',%L)',actor),'23503');
  insert into public.report_images(report_id,storage_path,type,uploaded_by)
    values(report,report::text || '/fixture.jpg','before',actor);
  foreach expr in array array['type = ''unknown''','storage_path = ''https://example.com/photo''','storage_path = ''../photo'''] loop
    perform pg_temp.expect_failure(format('update public.report_images set %s where report_id = %L',expr,report),'23514');
  end loop;
  perform pg_temp.expect_failure(format('update public.report_images set report_id = null where report_id=%L',report),'23502');
  perform pg_temp.expect_failure(format('update public.report_images set report_id = gen_random_uuid() where report_id=%L',report),'23503');
  perform pg_temp.expect_failure(format('insert into public.report_images(report_id,storage_path,type,uploaded_by)
    select report_id,storage_path,type,uploaded_by from public.report_images where report_id=%L',report),'23505');
  -- PostgreSQL versions report either foreign_key_violation or restrict_violation here.
  perform pg_temp.expect_failure(format('delete from public.reports where id=%L',report),'23503,23001');
  update public.reports set status = 'resolved', resolved_at = now(), priority_score = 100 where id = report;
  update public.reports set status = 'in_progress', resolved_at = null where id = report;
end;
$test$;
rollback;
select 'Phase 02 constraint checks passed' as result;
