# CivicPulse: Resolution Evidence Security Architecture (Phase 17)

> **Document Version**: 1.0.0  
> **Status**: Verified & Integrated  
> **Backend Branch**: `backend`  

---

## 1. Threat Modeling & Defense-in-Depth Matrix

| Threat Vector | Attack Scenario | Layer 1 (API / Zod) | Layer 2 (Service Logic) | Layer 3 (Database / RLS) |
| :--- | :--- | :--- | :--- | :--- |
| **Non-Admin Evidence Upload** | Citizen attempts `POST /api/admin/reports/:id/resolution-evidence` to forge resolution proof. | `requireAdmin()` rejects with HTTP 403 `FORBIDDEN`. | `uploadAdminResolutionDraftImage` verifies caller session. | Storage RLS policy `admin_upload_resolution_draft` allows only `role = 'admin'`. |
| **Evidence-Free Resolution** | Admin attempts `PATCH /api/reports/:id/status` to `resolved` without photo. | Schema requires valid string. | `updateReportStatus` checks presence and throws 422 `VALIDATION_ERROR`. | RPC checks `p_after_image_path`. Direct SQL `UPDATE` blocked by trigger `reports_resolution_evidence_check`. |
| **Cross-Report Evidence Reuse** | Admin uses same after-photo from Report A to close unrelated Report B. | Schema checks UUID path pattern. | `verifyResolutionDraftPath` verifies report ID matches URL. | Unique constraint `report_images_storage_path_key` and RPC cross-check reject with 409 `CONFLICT`. |
| **Direct Database Bypass** | Attacker executes `UPDATE public.reports SET status = 'resolved'` via direct SQL connection. | N/A (bypasses Next.js). | N/A (bypasses Next.js). | Database trigger `civicpulse_check_resolution_evidence` fires on `BEFORE UPDATE`, raising exception if no `after` image in `report_images`. |
| **Evidence Tampering / Overwrite** | Admin attempts to overwrite existing resolution photo via Storage upload. | Server generates random UUID for file. | Storage upload specifies `upsert: false`. | Storage rejects overwrite with conflict error. |
| **Evidence Deletion** | Malicious actor attempts to delete finalized after-repair photo from storage bucket. | No public delete endpoint. | `deleteOwnedDraftImage` rejects finalized paths. | Storage RLS policy blocks delete if `storage_path` exists in `public.report_images`. |
| **Bearer URL Interception** | Attacker intercepts signed image URL. | Short-lived expiration (15 min default). | URLs not cached in public CDN. | Storage requires valid token; token expires automatically. |

---

## 2. Direct Database Bypass Protection Trigger

```sql
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

create trigger reports_resolution_evidence_check
  before update on public.reports
  for each row
  execute function public.civicpulse_check_resolution_evidence();
```

This trigger guarantees that **even if someone bypasses the Next.js API layer entirely and connects directly to PostgreSQL**, a complaint cannot be updated to `status = 'resolved'` unless an `after` image already exists in `public.report_images`.

---

## 3. Storage Draft Path Isolation

- Citizen Drafts: `drafts/<user_id>/<uuid>.<ext>`
- Administrator Resolution Drafts: `resolution-drafts/<admin_id>/<report_id>/<uuid>.<ext>`

Because the path structure includes both `<admin_id>` and `<report_id>`, the server-side validator verifies both tenant isolation (only the uploading admin) and relational integrity (only the targeted report) before database insertion.
