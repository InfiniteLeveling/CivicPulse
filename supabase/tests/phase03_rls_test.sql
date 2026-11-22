-- DEVELOPMENT ONLY. Run this whole file after BOTH migrations and the department seed,
-- as the Dashboard database owner. Three fresh passwordless Auth identities, report
-- fixtures and temporary test helpers exist only within this rollback transaction.
begin;
create function pg_temp.check_ok(ok boolean, label text) returns void
language plpgsql security invoker as $$
begin
  if ok is distinct from true then raise exception 'Failed: %', label; end if;
end;
$$;
create function pg_temp.expect_denial(command text, expected text default '42501') returns void
language plpgsql security invoker as $$
begin
  begin
    execute command;
  exception when others then
    if sqlstate = expected then return; end if;
    raise;
  end;
  raise exception 'Expected rejection: %', command;
end;
$$;

-- Set both supported subject representations. PostgreSQL, not a fake JWT
-- verifier, evaluates the policies after the test switches database roles.
create function pg_temp.set_subject(subject uuid) returns void
language plpgsql security invoker as $$
begin
  perform set_config('request.jwt.claim.sub',coalesce(subject::text,''),true);
  perform set_config('request.jwt.claims',
    case when subject is null then '{"role":"anon"}'
         else json_build_object('sub',subject,'role','authenticated')::text end,true);
end;
$$;
grant execute on function pg_temp.check_ok(boolean,text), pg_temp.expect_denial(text,text),
  pg_temp.set_subject(uuid) to anon, authenticated;

do $fixtures$
declare
  label text;
  actor uuid;
begin
  foreach label in array array['a','b','admin'] loop
    actor := gen_random_uuid();
    insert into auth.users(id,email) values(actor,actor::text || '@example.invalid');
    insert into public.profiles(id,full_name,role) values (actor,'Test ' || label,
      case when label = 'admin' then 'admin' else 'citizen' end);
    perform set_config('fixture.' || label, actor::text,true);
  end loop;
end;
$fixtures$;
select pg_temp.check_ok((select count(*) = 6 and bool_and(relrowsecurity) from pg_class
  where relnamespace = 'public'::regnamespace and relname in
  ('profiles','departments','reports','report_votes','status_history','report_images')), 'six RLS tables');
select pg_temp.check_ok((select count(*) = 10 from pg_policies where schemaname='public'
  and tablename in ('profiles','departments','reports','report_votes','status_history','report_images')), 'policy set');
select pg_temp.check_ok((select bool_and(not has_table_privilege('authenticated',oid,'DELETE,TRUNCATE,TRIGGER')
  and not has_any_column_privilege('anon',oid,'SELECT,INSERT,UPDATE,REFERENCES'))
  from pg_class where relnamespace='public'::regnamespace and relname in
  ('profiles','departments','reports','report_votes','status_history','report_images')), 'baseline ACLs');
select pg_temp.check_ok((select count(*) = 2 and bool_and(p.proowner = c.relowner
    and p.proconfig @> array['search_path=""']
    and not has_function_privilege('anon',p.oid,'EXECUTE'))
  from pg_proc p cross join pg_class c where p.pronamespace='civicpulse_private'::regnamespace
    and p.prosecdef and c.oid='public.profiles'::regclass), 'definer owner and anonymous ACL');

-- Prepare other-owner rows. The report trigger sees the fixture actor.
select pg_temp.set_subject(current_setting('fixture.b')::uuid);
insert into public.reports(id,submission_key,user_id,title,description,category,latitude,longitude,publication,status,resolved_at,visibility)
select gen_random_uuid(),gen_random_uuid(),current_setting('fixture.b')::uuid,'Fixture ' || kind,
  'Fixture test description','garbage',12.3456,78.9876,publication,status,
  case when status='resolved' then now() end,visibility
from (values ('active','public','pending','listed'),('private','private','pending','listed'),
  ('hidden','public','pending','hidden'),('closed','public','resolved','listed')) v(kind,publication,status,visibility);
select set_config('fixture.' || split_part(title,' ',2),id::text,true)
  from public.reports where user_id=current_setting('fixture.b')::uuid;
insert into public.report_images(report_id,storage_path,type,uploaded_by)
  values(current_setting('fixture.active')::uuid,current_setting('fixture.active') || '/sample.jpg','before',current_setting('fixture.b')::uuid);

set local role authenticated;
select pg_temp.set_subject(current_setting('fixture.a')::uuid);
select pg_temp.check_ok(not civicpulse_private.is_admin(),'citizen role');
select pg_temp.check_ok((select count(*)=1 and bool_and(id=auth.uid()) from public.profiles),'own profile only');
update public.profiles set full_name='Citizen A' where id=auth.uid();
select pg_temp.check_ok((select full_name='Citizen A' from public.profiles),'profile edit');
select pg_temp.expect_denial('update public.profiles set role=''admin'' where id=auth.uid()');
select pg_temp.expect_denial('insert into public.profiles(id,full_name,role) values(auth.uid(),''Test'',''admin'')');
select pg_temp.check_ok(not has_function_privilege(current_user,'civicpulse_private.record_report_event()','EXECUTE')
  and to_regprocedure('civicpulse_private.is_admin(uuid)') is null,'helper surface');

insert into public.reports(user_id,submission_key,title,description,category,latitude,longitude)
  values(auth.uid(),gen_random_uuid(),'Own report','Owned private report','pothole',10,20);
select pg_temp.check_ok((select count(*)=1 and bool_and(user_id=auth.uid() and priority_score=0 and status='pending')
  from public.reports),'private report and safe defaults');
select pg_temp.expect_denial($q$insert into public.reports(user_id,submission_key,title,description,category,latitude,longitude)
  values(current_setting('fixture.b')::uuid,gen_random_uuid(),'Other case','Test description','pothole',10,20)$q$);
select pg_temp.check_ok(not has_column_privilege(current_user,'public.reports','status','INSERT,UPDATE')
  and not has_column_privilege(current_user,'public.reports','priority_score','INSERT,UPDATE')
  and not has_column_privilege(current_user,'public.reports','department_id','INSERT'),'protected fields');
select pg_temp.expect_denial('update public.reports set status=''resolved'' where user_id=auth.uid()');
select pg_temp.expect_denial($q$insert into public.reports(user_id,submission_key,title,description,category,
  latitude,longitude,priority_score) values(auth.uid(),gen_random_uuid(),'Fixture report','Fixture test description',
  'pothole',10,20,100)$q$);
with changed as (update public.reports set severity='critical'
  where user_id in (auth.uid(),current_setting('fixture.b')::uuid) returning id)
select pg_temp.check_ok(count(*)=0,'citizen cannot triage any report') from changed;
select pg_temp.expect_denial('delete from public.reports where user_id=auth.uid()');
select pg_temp.check_ok(exists(select id from public.departments where lower(name)='electrical'),'directory');
select pg_temp.check_ok(not has_any_column_privilege(current_user,'public.departments','INSERT,UPDATE')
  and not has_table_privilege(current_user,'public.departments','DELETE'),'directory fixed');
select pg_temp.expect_denial('insert into public.departments(name) values (''Fixture directory entry'')');
select pg_temp.expect_denial('update public.departments set name=''Fixture directory entry'' where name=''Electrical''');
select pg_temp.expect_denial('delete from public.departments where name=''Electrical''');

insert into public.report_votes(report_id,user_id) values(current_setting('fixture.active')::uuid,auth.uid());
select pg_temp.expect_denial($q$insert into public.report_votes(report_id,user_id)
  values(current_setting('fixture.active')::uuid,auth.uid())$q$,'23505');
select pg_temp.expect_denial($q$insert into public.report_votes(report_id,user_id)
  values(current_setting('fixture.active')::uuid,current_setting('fixture.b')::uuid)$q$);
do $votes$
declare k text;
begin
  foreach k in array array['private','hidden','closed'] loop
    perform pg_temp.expect_denial(format('insert into public.report_votes(report_id,user_id) values(%L,auth.uid())',
      current_setting('fixture.' || k)));
  end loop;
end;
$votes$;
select pg_temp.check_ok((select count(*)=2 and bool_and(user_id=auth.uid()) from public.report_votes),'own support rows');
select pg_temp.check_ok(not has_table_privilege(current_user,'public.report_votes','DELETE')
  and not has_any_column_privilege(current_user,'public.report_votes','UPDATE'),'vote immutability');

select pg_temp.check_ok((select count(report_id)=1 from public.status_history),'own timeline');
select pg_temp.expect_denial('select notes from public.status_history');
select pg_temp.expect_denial('insert into public.status_history(report_id,status) values(gen_random_uuid(),''resolved'')');
select pg_temp.expect_denial('delete from public.status_history');
select pg_temp.check_ok((select count(*)=0 from public.report_images),'peer image privacy');
select pg_temp.expect_denial($q$insert into public.report_images(report_id,type,storage_path,uploaded_by)
  values(current_setting('fixture.active')::uuid,'after','fixture/image.jpg',auth.uid())$q$);

select pg_temp.set_subject(current_setting('fixture.b')::uuid);
select pg_temp.check_ok((select count(*)=1 from public.report_images where report_id=current_setting('fixture.active')::uuid),'owner image metadata');

select pg_temp.set_subject(current_setting('fixture.admin')::uuid);
select pg_temp.check_ok(civicpulse_private.is_admin(),'admin authoritative role');
update public.reports set department_id=(select id from public.departments where lower(name)='electrical'),
  severity='high' where id=current_setting('fixture.active')::uuid;
select pg_temp.check_ok(exists(select from public.reports where id=current_setting('fixture.active')::uuid
  and severity='high' and version=2 and department_id is not null),'admin triage');
select pg_temp.check_ok(exists(select report_id from public.status_history where report_id=current_setting('fixture.active')::uuid
  and version=2),'admin timeline');
select pg_temp.check_ok(exists(select from public.report_images where report_id=current_setting('fixture.active')::uuid),'admin image metadata');
select pg_temp.expect_denial('update public.profiles set role=''admin''');
select pg_temp.expect_denial('update public.status_history set notes=''changed''');

reset role;
select pg_temp.check_ok(exists(select from public.status_history where report_id=current_setting('fixture.active')::uuid
  and version=2 and changed_by=current_setting('fixture.admin')::uuid and notes is not null),'attributed audit');
set local role anon;
select pg_temp.set_subject(null);
select pg_temp.expect_denial('select * from public.profiles');
select pg_temp.expect_denial('select latitude from public.reports');
select pg_temp.expect_denial('select civicpulse_private.is_admin()');
select pg_temp.expect_denial('insert into public.reports default values');
select pg_temp.check_ok(exists(select from public.civic_report_map where id=current_setting('fixture.active')::uuid
  and latitude=12.35 and longitude=78.99),'coarse map point');
select pg_temp.check_ok(not exists(select from public.civic_report_map where id in
  (current_setting('fixture.hidden')::uuid,current_setting('fixture.private')::uuid)), 'hidden/private absent');
select pg_temp.check_ok((select array_agg(column_name::text order by ordinal_position)
  = array['id','reference','category','status','latitude','longitude'] from information_schema.columns
  where table_schema='public' and table_name='civic_report_map'), 'map allowlist');
reset role;
rollback;
select 'Phase 03 role checks passed' as result;
