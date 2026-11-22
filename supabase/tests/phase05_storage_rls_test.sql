-- SQL Editor: run after Phase 05 migration as project owner.
-- Verifies storage bucket configuration and storage.objects RLS policies.
begin transaction read only;

do $test$
declare
  bucket_rec record;
  policy_count integer;
begin
  if to_regclass('storage.buckets') is not null then
    select * into bucket_rec from storage.buckets where id = 'civic-evidence';
    if bucket_rec.id is null then
      raise exception 'Phase 05 failed: Bucket civic-evidence does not exist';
    end if;
    if bucket_rec.public is not false then
      raise exception 'Phase 05 failed: Bucket civic-evidence must be private';
    end if;
    if bucket_rec.file_size_limit <> 3145728 then
      raise exception 'Phase 05 failed: Bucket file size limit must be 3145728 bytes';
    end if;
  end if;

  if to_regclass('storage.objects') is not null then
    select count(*) into policy_count from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname in ('citizen_upload_draft', 'citizen_read_draft', 'citizen_delete_draft', 'admin_upload_evidence');
    
    if policy_count < 4 then
      raise exception 'Phase 05 failed: Expected 4 storage RLS policies, found %', policy_count;
    end if;
  end if;
end;
$test$;

select 'Phase 05 storage catalog and policy checks passed' as result;

rollback;
