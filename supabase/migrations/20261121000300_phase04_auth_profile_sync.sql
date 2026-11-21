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
