-- =============================================================================
-- CivicPulse: Cleanup Legacy Prototype Schema Objects
-- =============================================================================
-- Run this in Supabase SQL Editor if you have leftover tables from an old prototype
-- (e.g. complaints, authority_members, or legacy status_history).
-- =============================================================================

drop table if exists public.status_history cascade;
drop table if exists public.complaints cascade;
drop table if exists public.authority_members cascade;
drop function if exists public.advance_complaint cascade;
