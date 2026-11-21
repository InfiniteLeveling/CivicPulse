# CivicPulse Image Evidence Lifecycle · Phase 05

This document describes the complete lifecycle of photographic evidence in CivicPulse—from citizen capture to draft staging, complaint association, AI classification, administrative resolution, and retention.

---

## 1. Lifecycle State Machine

```mermaid
stateDiagram-v2
    [*] --> LocalSelected : Citizen selects photo
    LocalSelected --> ClientPreview : URL.createObjectURL()
    ClientPreview --> ServerValidating : POST /api/upload
    ServerValidating --> DraftStaged : Magic bytes OK, RLS upload
    DraftStaged --> ReportAssociated : Phase 06 Complaint Submission
    ReportAssociated --> AIAnalyzed : Phase 11 Gemini Classification
    ReportAssociated --> UnderTriage : Staff Investigation
    UnderTriage --> ResolutionProofUploaded : Phase 17 Admin Upload ('after')
    ResolutionProofUploaded --> VerifiedResolved : Citizen / System verification
    VerifiedResolved --> [*] : Archival Retention

    ServerValidating --> UploadRejected : Size / Format Violation
    DraftStaged --> OrphanCleaned : Unsubmitted draft expired
```

---

## 2. Sequence Diagram: Upload & Phase 06 Association

```mermaid
sequenceDiagram
    autonumber
    actor Citizen
    participant Frontend as Frontend Browser
    participant API as /api/upload (Next.js)
    participant Storage as Supabase Storage (civic-evidence)
    participant DB as PostgreSQL (public.reports / report_images)

    Citizen->>Frontend: Selects photo from device
    Frontend->>Frontend: Creates local preview (createObjectURL)
    Frontend->>API: POST /api/upload (multipart/form-data)
    Note over API: requireUser() checks SSR session
    Note over API: validateImageFile() checks magic bytes & size <= 3MB
    API->>Storage: upload(drafts/USER_ID/IMAGE_ID.jpg, upsert=false)
    Storage-->>API: 201 Created
    API-->>Frontend: 201 { image: { storage_path, bucket, status: "temporary" } }
    
    Note over Frontend: User fills complaint details (title, category, coords)
    
    rect rgb(240, 248, 255)
    Note over Frontend, DB: Phase 06 Complaint Creation
    Frontend->>API: POST /api/reports (with storage_path & submission_key)
    Note over API: verifyOwnedDraftPath(user.id, storage_path)
    API->>DB: INSERT into public.reports
    API->>DB: INSERT into public.report_images (type: 'before', storage_path)
    API-->>Frontend: 201 Report created (CP-XXXXX)
    end
```

---

## 3. Phase Boundaries & Future Responsibilities

### Phase 05 (Current)
- Staging uploaded photos in `drafts/<user_id>/<image_id>.<ext>`.
- Enforcing 3 MB size limit and JPEG/PNG/WebP signatures.
- Returning an authorized storage reference to the frontend.
- Zero fake rows inserted into `public.report_images`.

### Phase 06 (Complaint Creation - Implemented)
- Receives `storage_path` in `POST /api/reports` complaint submission payload.
- Verifies storage ownership via `verifyOwnedDraftPath(user.id, storage_path)` to ensure the draft belongs to the reporter.
- Verifies uniqueness: prevents linking an already-associated image to another report (`409 CONFLICT`).
- Links the image to the new report in `public.report_images` (`type = 'before'`) within an atomic database transaction.
- Updates Storage RLS `citizen_delete_draft`: blocks citizens from deleting any storage object once it is linked in `public.report_images`.

### Phase 11 (Gemini Analysis)
- The backend retrieves the raw image bytes server-side using the verified `storage_path`.
- Extracts infrastructure issue characteristics to suggest category/severity.

### Phase 17 (Administrative Resolution)
- Authorized administrator uploads repair proof with `purpose = 'resolution_after'`.
- Uploads to `reports/<report_id>/after/<image_id>.<ext>`.
- Links to `public.report_images` with `type = 'after'`.

---

## 4. Retention & Orphan Cleanup Strategy

- **Temporary Drafts**: Files located in `drafts/*` that are not associated with a `public.report_images` record after 48 hours are considered orphaned drafts.
- **Cleanup Automation**: In production, a scheduled Supabase cron job or Edge Function compares `storage.objects` paths with `public.report_images.storage_path` and deletes unreferenced drafts older than 48 hours.
- **Evidence Immutability**: Once an image is referenced in `public.report_images`, the database foreign key constraint (`ON DELETE RESTRICT`) and Storage RLS protect it from accidental or unauthorized deletion.
