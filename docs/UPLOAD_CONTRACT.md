# CivicPulse Frontend Upload Integration Contract · Phase 05

This document defines the exact integration contract for image uploads between the `frontend` branch and the backend API on the `backend` branch.

---

## 1. Selected Upload Architecture

CivicPulse uses a **Server-Mediated Multipart Upload** architecture:
- **Client** submits standard `multipart/form-data` to `POST /api/upload`.
- **Backend**:
  1. Revalidates caller session via SSR cookies (`requireUser()`).
  2. Inspects magic bytes (preventing file extension spoofing, active content, SVGs, and executables).
  3. Enforces 3 MB file size boundary.
  4. Generates an unguessable user-scoped path (`drafts/<user_id>/<uuid>.<ext>`).
  5. Uploads directly into the private Supabase Storage bucket `civic-evidence` with `upsert: false`.
  6. Returns a structured storage reference for later association with the complaint in Phase 06.

---

## 2. Endpoints

| Method | Endpoint | Authentication | Purpose |
|---|---|---|---|
| `POST` | `/api/upload` | Required (Citizen / Admin) | Uploads photo evidence to private temporary draft storage |
| `POST` | `/api/upload/access` | Required (Citizen / Admin) | Generates a short-lived signed URL to preview/view an owned draft image |

---

## 3. Upload Request Contract (`POST /api/upload`)

- **Method**: `POST`
- **Path**: `/api/upload`
- **Content-Type**: `multipart/form-data`

### Form Fields

| Field | Type | Required | Constraints / Description |
|---|---|---|---|
| `file` | File / Binary | Yes | Exactly one file. Max size 3 MB (3,145,728 bytes). Formats: JPEG, PNG, WebP. |
| `purpose` | String | No | Enum: `complaint_before` (default) or `resolution_after`. Citizens can only submit `complaint_before`. Submitting `resolution_after` requires an `admin` role. |

---

## 4. Upload Success Response (HTTP 201)

Header: `Cache-Control: no-store`

```json
{
  "success": true,
  "data": {
    "image": {
      "bucket": "civic-evidence",
      "storage_path": "drafts/4a1f6a1a-4934-4b47-975a-063a56cf988f/e92b3c4d-8812-4011-9fa0-123456789abc.jpg",
      "mime_type": "image/jpeg",
      "size_bytes": 1048576,
      "status": "temporary"
    }
  },
  "message": "Image uploaded successfully"
}
```

> [!IMPORTANT]
> The frontend **must retain** the returned `storage_path` in local component state. When the user submits the complaint form in Phase 06, this `storage_path` is passed into the report creation endpoint.

---

## 5. Upload Error Contract

All failures follow the standard CivicPulse envelope:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Image size (4.20 MB) exceeds the 3 MB limit."
  }
}
```

### Supported Error Codes

| HTTP Status | Error Code | Trigger Condition | Frontend Guidance |
|---|---|---|---|
| 401 | `UNAUTHORIZED` | Session expired or missing cookies | Prompt user to sign in |
| 403 | `FORBIDDEN` | Citizen attempted `purpose=resolution_after` | Display permission denied |
| 422 | `VALIDATION_ERROR` | Empty file, multiple files, SVG/PDF/EXE file, size > 3 MB | Show specific field validation alert |
| 409 | `CONFLICT` | Storage path collision | Retry submission |
| 503 | `SERVICE_UNAVAILABLE`| Storage bucket unreachable | Show temporary service error |
| 500 | `INTERNAL_SERVER_ERROR`| Uncaught server exception | Show generic error |

---

## 6. Draft Image Access / Preview Contract (`POST /api/upload/access`)

Because the storage bucket is strictly private, files cannot be loaded via public URLs.

- **Method**: `POST`
- **Path**: `/api/upload/access`
- **Content-Type**: `application/json`

### Request Body
```json
{
  "storage_path": "drafts/4a1f6a1a-4934-4b47-975a-063a56cf988f/e92b3c4d-8812-4011-9fa0-123456789abc.jpg",
  "expires_in_seconds": 900
}
```

### Success Response (HTTP 200)
```json
{
  "success": true,
  "data": {
    "signed_url": "https://<project-ref>.supabase.co/storage/v1/object/sign/civic-evidence/drafts/...?token=...",
    "expires_in_seconds": 900
  },
  "message": "Authorized URL generated successfully"
}
```

---

## 7. Recommended Frontend Implementation Pattern

```tsx
"use client";

import { useState } from "react";

export function CivicImagePicker() {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadedPath, setUploadedPath] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 1. Instant local preview before network upload
    const localUrl = URL.createObjectURL(file);
    setPreviewUrl(localUrl);
    setErrorMsg(null);

    // 2. Perform upload
    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("purpose", "complaint_before");

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const result = await res.json();

      if (!result.success) {
        setErrorMsg(result.error.message);
        setPreviewUrl(null);
      } else {
        setUploadedPath(result.data.image.storage_path);
      }
    } catch {
      setErrorMsg("Network error during image upload. Please retry.");
      setPreviewUrl(null);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div>
      <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleFileChange} />
      {isUploading && <p>Uploading evidence photo...</p>}
      {errorMsg && <p className="text-red-600">{errorMsg}</p>}
      {previewUrl && <img src={previewUrl} alt="Preview" className="max-w-xs rounded" />}
    </div>
  );
}
```
