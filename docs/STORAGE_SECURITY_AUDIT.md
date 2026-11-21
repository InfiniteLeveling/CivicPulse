# CivicPulse – Storage Security Audit (Phase 19)

**Document Version:** 1.0.0  
**Status:** AUDITED & VERIFIED  
**Scope:** Supabase Storage Bucket `report-images`, Storage Path Generation, File Signature Validation, and Object Immutability

---

## 1. Storage Architecture Overview

CivicPulse utilizes a secure object storage design for civic complaint imagery and administrative resolution evidence.
All storage operations are governed by private bucket configuration, path-scoped user ownership validation, file signature magic byte inspection, and database-level immutability.

```
[ Client Upload ] ──( Magic Bytes + Size <= 3MB )──> [ /api/upload ]
                                                            │
                                        ( Enforce Path Scoping )
                                                            ▼
                                   [ drafts/<user_id>/<image_id>.<ext> ]
                                                            │
                            [ /api/reports ] (Move/Finalize on Submit)
                                                            ▼
                                   [ reports/<report_id>/<image_id>.<ext> ]
                                                            │
                                              ( Permanent & Immutable )
```

---

## 2. Bucket Configuration & Privacy

| Configuration Property | Value | Security Impact |
|---|---|---|
| **Bucket Name** | `report-images` | Dedicated bucket for civic reporting imagery |
| **Public Access** | `FALSE` (Private) | Prevents direct anonymous object enumeration or unauthorized scraping |
| **Allowed File Size** | Maximum 3,145,728 bytes (3MB) | Mitigates storage exhaustion and DoS attacks |
| **Permitted MIME Types** | `image/jpeg`, `image/png`, `image/webp` | Rejects executable formats, PDFs, and SVGs (XSS vectors) |
| **Access Control** | Row Level Security (`storage.objects`) | Strict path-based ownership checks |

---

## 3. Path Scoping & Traversal Prevention

Storage paths are strictly validated and generated through `src/utils/storage-path.ts`:

### 3.1 Draft Paths (Citizen Complaint Submissions)
- **Path Pattern:** `drafts/<user_id>/<random_uuid>.<extension>`
- **Validation Rules:**
  - `user_id` must be a valid RFC 4122 UUID matching `auth.uid()`.
  - Filename must be a newly generated random UUID.
  - Extension must be one of `jpg`, `jpeg`, `png`, `webp`.
  - Directory traversal sequences (`..`, `//`, `\`, leading/trailing `/`) are rejected immediately.

### 3.2 Resolution Draft Paths (Admin Evidence)
- **Path Pattern:** `resolution-drafts/<admin_id>/<report_id>/<random_uuid>.<extension>`
- **Validation Rules:**
  - `admin_id` must match `auth.uid()` of an authenticated administrator.
  - `report_id` must be a valid UUID of an existing complaint.
  - Validated by `parseResolutionDraftStoragePath()`.

### 3.3 Finalized Report Storage Paths
- **Path Pattern:** `reports/<report_id>/<random_uuid>.<extension>`
- **Finalization Invariance:** Moved from draft staging to report directory during atomic complaint creation or status resolution.

---

## 4. File Signature & Magic Byte Validation

CivicPulse does NOT trust client-supplied `Content-Type` headers. Every uploaded buffer is inspected at the binary level using magic bytes:

| Declared MIME Type | Expected Magic Bytes (Hex) | Accepted Extensions | XSS / Polyglot Mitigations |
|---|---|---|---|
| `image/jpeg` | `FF D8 FF` | `.jpg`, `.jpeg` | Strips metadata, rejects HTML payloads |
| `image/png` | `89 50 4E 47 0D 0A 1A 0A` | `.png` | Validates chunk structure |
| `image/webp` | `52 49 46 46 ... 57 45 42 50` | `.webp` | Validates RIFF/WEBP header |
| `image/svg+xml` | N/A (Text / XML) | **REJECTED** | Strictly blocked due to script execution / XSS vulnerability |
| `application/pdf` | `25 50 44 46` | **REJECTED** | Strictly blocked (civic photos must be raster images) |
| Executable (`.exe`) | `4D 5A` | **REJECTED** | Strictly blocked |

---

## 5. Storage Immutability & Deletion Protection

1. **Draft Deletion:** Draft files may only be deleted or cleaned up by their uploader before complaint submission.
2. **Finalized Immutability:** Once an image record is inserted into `public.report_images` or `public.report_evidence`, database foreign keys and storage RLS deny `DELETE` operations to all client roles.
3. **Signed URLs:** Client downloads and image views utilize short-lived signed URLs generated server-side with an expiry TTL (default: 3600 seconds).

---

## 6. Audit Conclusion
Supabase storage isolation, path generation algorithms, and file signature verifications have passed all automated tests (`tests/phase05_storage.test.ts` and `tests/phase19_security.test.ts`), confirming zero vulnerabilities to path traversal, storage cross-contamination, or MIME spoofing.
