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
