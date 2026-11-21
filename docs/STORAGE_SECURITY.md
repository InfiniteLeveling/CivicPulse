# CivicPulse Storage Security Architecture · Phase 05

This document details the security posture, access control policies, threat boundaries, and file validation safeguards governing CivicPulse image evidence.

---

## 1. Storage Architecture Overview

CivicPulse uses a dedicated private Supabase Storage bucket for all civic evidence:
- **Bucket ID**: `civic-evidence`
- **Visibility**: `public = false` (private by default)
- **Object Size Limit**: 3,145,728 bytes (3 MB)
- **Allowed MIME Types**: `image/jpeg`, `image/png`, `image/webp`

All uploads are routed through the Next.js server boundary (`POST /api/upload`), ensuring authentication, binary content verification, and server-generated storage paths before objects touch Supabase.

---

## 2. Storage Row Level Security (RLS) Policies

Storage policies are applied directly to `storage.objects` in PostgreSQL migration [20261121000400_phase05_storage.sql](../supabase/migrations/20261121000400_phase05_storage.sql):

```sql
-- 1. Citizen Draft Upload
create policy "citizen_upload_draft" on storage.objects
for insert to authenticated
with check (
  bucket_id = 'civic-evidence'
  and (storage.foldername(name))[1] = 'drafts'
  and (storage.foldername(name))[2] = (select auth.uid())::text
  and lower(storage.extension(name)) in ('jpg', 'jpeg', 'png', 'webp')
);

-- 2. Citizen Draft Read
create policy "citizen_read_draft" on storage.objects
for select to authenticated
using (
  bucket_id = 'civic-evidence'
  and (storage.foldername(name))[1] = 'drafts'
  and (storage.foldername(name))[2] = (select auth.uid())::text
);

-- 3. Citizen Draft Delete (cancellation before complaint creation)
create policy "citizen_delete_draft" on storage.objects
for delete to authenticated
using (
  bucket_id = 'civic-evidence'
  and (storage.foldername(name))[1] = 'drafts'
  and (storage.foldername(name))[2] = (select auth.uid())::text
);

-- 4. Admin Resolution Evidence Upload (future Phase 17 proof)
create policy "admin_upload_evidence" on storage.objects
for insert to authenticated
with check (
  bucket_id = 'civic-evidence'
  and (storage.foldername(name))[1] = 'reports'
  and (storage.foldername(name))[3] = 'after'
  and (select civicpulse_private.is_admin())
  and lower(storage.extension(name)) in ('jpg', 'jpeg', 'png', 'webp')
);
```

### Prohibited Operations
- **No UPDATE policy**: Objects in `civic-evidence` are immutable. Silent overwriting or modifying evidence in-place is blocked at the database level.
- **No Anonymous Access**: The `anon` role has zero grants or policies on `storage.objects` for this bucket.

---

## 3. Threat Model & Mitigations

| Threat | Attack Vector | Implemented Mitigation |
|---|---|---|
| **File Extension Spoofing** | Attacker renames `malware.exe` or `payload.svg` to `photo.jpg` | Magic byte inspection in `validateImageSignature()` verifies binary headers (JPEG `FF D8 FF`, PNG `89 50 4E 47`, WebP `RIFF...WEBP`). SVGs and executables are rejected regardless of file extension or declared MIME type. |
| **Path Traversal** | Attacker specifies `../../etc/passwd` or `../other_user/img.jpg` | Client filenames are discarded. The backend generates `drafts/<user_id>/<random_uuid>.<ext>`. `parseDraftStoragePath()` rejects `..`, `//`, `\`, and leading/trailing slashes. |
| **Cross-User Access** | Citizen A attempts to read or delete Citizen B's uploaded draft | Storage RLS enforces `(storage.foldername(name))[2] = auth.uid()`. `verifyOwnedDraftPath()` checks caller UUID against the path before generating signed URLs. |
| **Privilege Escalation** | Citizen attempts to upload resolution evidence (`purpose=resolution_after`) | The endpoint verifies `user.role === 'admin'`. Citizens are rejected with HTTP 403 `FORBIDDEN`. Storage RLS requires `civicpulse_private.is_admin()`. |
| **Silent Evidence Overwrite** | Attacker uploads with an existing filename | Filenames are cryptographically random UUIDs (`crypto.randomUUID()`) and Supabase upload is executed with `upsert: false`. Collisions trigger HTTP 409 `CONFLICT`. |
| **Denial of Service via File Bomb** | Attacker attempts to flood disk or memory with large files | Serverless body parsing and application-level size enforcement reject files > 3 MB immediately before storage interaction. |
| **Private Metadata Leakage** | Logging file buffers, EXIF data, or signed URL tokens | `logger.ts` serializes only operational counter events (`storage.upload_success`, `storage.access_denied`). Image bytes and URLs are excluded from logs. |

---

## 4. Signed URL Security & Caveats

- **Time-to-Live (TTL)**: Default 15 minutes (900 seconds), bounded between 60 seconds and 3,600 seconds.
- **Bearer Token Nature**: A signed URL grants read access to anyone holding the query parameter until expiration. Logging signed URLs is strictly prohibited.
- **Revocation**: Logging out does not immediately invalidate an already-issued Supabase Storage HMAC signed URL. Hence, short TTLs are enforced.
