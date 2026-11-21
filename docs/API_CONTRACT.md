# CivicPulse API contract · Phase 05

Phase 02 supplies the [database contract](DATABASE_CONTRACT.md), Phase 03 supplies the [authorization contract](SECURITY_CONTRACT.md), Phase 04 supplies the [authentication architecture](AUTH_ARCHITECTURE.md), and Phase 05 supplies the [upload contract](UPLOAD_CONTRACT.md) and [storage security architecture](STORAGE_SECURITY.md).

Paths are relative to the origin serving the Next.js app. Shared response helpers serialize `ApiResponse<T>` with `Cache-Control: no-store`.

---

## 1. GET /api/health

| Property | Contract |
|---|---|
| Purpose | Confirms the application process can serve a request |
| Authentication | Public. No cookies, bearer token, Supabase settings or Gemini key required |
| Inputs | No path parameters, query parameters or body |
| Success | HTTP 200, JSON, `Cache-Control: no-store` |
| Response | `{"success":true,"data":{"status":"ok","service":"civicpulse-backend"}}` |

---

## 2. GET /api/auth/me

| Property | Contract |
|---|---|
| Purpose | Returns the verified authenticated user and their authoritative profile role |
| Authentication | Authenticated session required via SSR cookies (`requireUser()`) |
| Inputs | None |
| Success | HTTP 200, JSON, `Cache-Control: no-store` |
| Unauthorized | HTTP 401, JSON (`UNAUTHORIZED`) |
| Missing Profile | HTTP 404, JSON (`NOT_FOUND`) if profile is absent and repair fails |

---

## 3. POST /api/auth/logout

| Property | Contract |
|---|---|
| Purpose | Signs out the current Supabase Auth session and clears SSR session cookies |
| Authentication | Public / Authenticated |
| Inputs | None |
| Success | HTTP 200, JSON, with cleared cookie headers |

---

## 4. GET /auth/confirm

| Property | Contract |
|---|---|
| Purpose | Route handler for email verification and password recovery links |
| Authentication | Public (validates one-time token or PKCE code) |
| Inputs | Query parameters: `token_hash`, `type` (`signup`, `recovery`, etc.), `code`, `next` |
| Success | HTTP 307/308 redirect to sanitized `next` path (`/dashboard` or `/reset-password`) |
| Failure | HTTP 307/308 redirect to `/login?error=invalid_or_expired_token` |

---

## 5. POST /api/upload

| Property | Contract |
|---|---|
| Purpose | Uploads a validated photograph to private temporary draft storage |
| Authentication | Authenticated session required via SSR cookies (`requireUser()`) |
| Request Type | `multipart/form-data` |
| Form Fields | `file` (File, max 3 MB, JPEG/PNG/WebP), `purpose` (optional: `complaint_before` or `resolution_after`) |
| Success | HTTP 201, JSON, `Cache-Control: no-store` |
| Forbidden | HTTP 403, JSON (`FORBIDDEN`) if a citizen submits `purpose=resolution_after` |
| Validation Error| HTTP 422, JSON (`VALIDATION_ERROR`) if file missing, multiple files, oversized, or invalid signature |

### Success Example (HTTP 201)
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

---

## 6. POST /api/upload/access

| Property | Contract |
|---|---|
| Purpose | Generates a short-lived signed URL for an authorized draft image |
| Authentication | Authenticated session required via SSR cookies (`requireUser()`) |
| Request Type | `application/json` |
| Body Fields | `storage_path` (string, required), `expires_in_seconds` (number, 60-3600, default 900) |
| Success | HTTP 200, JSON, `Cache-Control: no-store` |
| Forbidden | HTTP 403, JSON (`FORBIDDEN`) if caller attempts to access another user's draft |
| Not Found | HTTP 404, JSON (`NOT_FOUND`) if object does not exist |

### Success Example (HTTP 200)
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

## Shared JSON Types

Import `ApiResponse<T>`, `HealthData` from `@/types/api`, `AuthMeData`, `UserProfile` from `@/types/auth`, and `UploadResponseData`, `SignedUrlResponseData` from `@/types/storage`.

| HTTP status | Code supported by the error helper |
|---|---|
| 401 | UNAUTHORIZED |
| 403 | FORBIDDEN |
| 404 | NOT_FOUND |
| 409 | CONFLICT |
| 422 | VALIDATION_ERROR |
| 429 | RATE_LIMITED |
| 500 | INTERNAL_SERVER_ERROR |
| 503 | SERVICE_UNAVAILABLE |
