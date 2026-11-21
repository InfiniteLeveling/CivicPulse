# CivicPulse API contract · Phase 10 Core Backend Integration

Phase 02 supplies the [database contract](DATABASE_CONTRACT.md), Phase 03 supplies the [authorization contract](SECURITY_CONTRACT.md), Phase 04 supplies the [authentication architecture](AUTH_ARCHITECTURE.md), Phase 05 supplies the [upload contract](UPLOAD_CONTRACT.md) and [storage security architecture](STORAGE_SECURITY.md), Phase 06 supplies the [report creation contract](REPORT_CREATION_CONTRACT.md), Phase 07 supplies the [report retrieval contract](REPORT_RETRIEVAL_CONTRACT.md), Phase 08 supplies the [status workflow contract](STATUS_WORKFLOW_CONTRACT.md), Phase 09 supplies the [department assignment contract](DEPARTMENT_ASSIGNMENT_CONTRACT.md), and Phase 10 supplies the [complete frontend handoff guide](FRONTEND_BACKEND_HANDOFF.md) and [integration report](PHASE10_INTEGRATION_REPORT.md).

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

## 7. POST /api/reports

| Property | Contract |
|---|---|
| Purpose | Submits a validated citizen civic complaint and associates evidence photo |
| Authentication | Authenticated citizen session required via SSR cookies (`requireUser()`) |
| Request Type | `application/json` |
| Body Fields | `title` (5-120 chars), `description` (10-1000 chars), `category` (canonical 7), `latitude` (-90 to 90), `longitude` (-180 to 180), `image_path` (draft storage path), optional `severity` (low/medium/high/critical), optional `submission_key` (UUID) |
| Success | HTTP 201, JSON, `Cache-Control: no-store` |
| Validation Error| HTTP 400/422, JSON (`VALIDATION_ERROR`) if fields missing, malformed, or out of range |
| Unauthorized | HTTP 401, JSON (`UNAUTHORIZED`) if unauthenticated |
| Forbidden | HTTP 403, JSON (`FORBIDDEN`) if admin account or cross-user image reference |
| Conflict | HTTP 409, JSON (`CONFLICT`) if image already associated with another report |

### Success Example (HTTP 201)
```json
{
  "success": true,
  "data": {
    "id": "77777777-7777-4777-8777-777777777777",
    "reference": "CP-77777777-7777-4777-8777-777777777777",
    "title": "Large pothole on Park Street",
    "description": "A deep crater is causing severe vehicular disruption near the college entrance.",
    "category": "pothole",
    "severity": "medium",
    "status": "pending",
    "priority_score": 0,
    "latitude": 22.5726,
    "longitude": 88.3639,
    "image_count": 1,
    "image_path": "drafts/11111111-1111-4111-8111-111111111111/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa.jpg",
    "created_at": "2026-11-21T13:20:00.000Z"
  },
  "message": "Complaint submitted successfully"
}
```

---

## 8. GET /api/reports

| Property | Contract |
|---|---|
| Purpose | Retrieves paginated and filtered complaints (Public feed, Personal history, or Administrative queue) |
| Authentication | Public feed: Optional. Personal history (`?mine=true`): Required (`requireUser()`). Admin feed (`?scope=admin`): Required (`requireAdmin()`). |
| Query Parameters | `page` (default 1), `limit` (default 20, max 50), `category`, `status`, `severity`, `sort` (`newest`, `oldest`, `priority_high`, `priority_low`), `search` (max 100 chars), `mine` (boolean), `scope` (`admin`) |
| Forbidden | Sending `?user_id=...` parameter is strictly rejected with HTTP 422 (`VALIDATION_ERROR`). |
| Success | HTTP 200, JSON, `Cache-Control: no-store` |

### Success Example (HTTP 200)
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "77777777-7777-4777-8777-777777777777",
        "reference": "CP-77777777-7777-4777-8777-777777777777",
        "title": "Large pothole on Park Street",
        "category": "pothole",
        "severity": "medium",
        "status": "pending",
        "priority_score": 0,
        "latitude": 22.5726,
        "longitude": 88.3639,
        "department_name": "Road Maintenance",
        "image_count": 1,
        "created_at": "2026-11-21T13:20:00.000Z",
        "updated_at": "2026-11-21T13:20:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 1,
      "total_pages": 1,
      "has_next_page": false,
      "has_previous_page": false
    }
  },
  "message": "Reports retrieved successfully"
}
```

---

## 9. GET /api/reports/:id

| Property | Contract |
|---|---|
| Purpose | Retrieves detailed complaint data by UUID |
| Authentication | Optional, contextual: Owner & Admin see full details; Public visitors see public reports; Private reports conceal existence from unauthorized callers. |
| Path Parameter | `id` (UUID string) |
| Success | HTTP 200, JSON, `Cache-Control: no-store` |
| Not Found | HTTP 404 (`NOT_FOUND`) if complaint does not exist or is private/unauthorized |
| Validation Error| HTTP 400/422 (`VALIDATION_ERROR`) if `id` is not a valid UUID |

---

## 10. PATCH /api/reports/:id/status

| Property | Contract |
|---|---|
| Purpose | Updates complaint status through the linear state machine with concurrency guard and audit history |
| Authentication | Required (`requireAdmin()`). Throws 401 if unauthenticated, 403 if citizen. |
| Path Parameter | `id` (UUID string) |
| Request Type | `application/json` |
| Body Fields | `status` (canonical `in_progress` or `resolved`), optional `notes` (max 1000 chars), optional `expected_status` (optimistic concurrency lock) |
| Forbidden Fields | Client-supplied `changed_by`, `user_id`, `role`, `resolved_at`, `priority_score`, `department_id` are rejected with HTTP 422 |
| Success | HTTP 200, JSON, `Cache-Control: no-store` |
| Conflict | HTTP 409 (`CONFLICT`) if invalid transition, same-state request, or stale `expected_status` |
| Not Found | HTTP 404 (`NOT_FOUND`) if report does not exist |

### Success Example (HTTP 200)
```json
{
  "success": true,
  "data": {
    "id": "77777777-7777-4777-8777-777777777777",
    "previous_status": "pending",
    "status": "in_progress",
    "updated_at": "2026-11-21T13:45:00.000Z",
    "resolved_at": null,
    "history_entry_id": "88888888-8888-4888-8888-888888888888",
    "version": 2
  },
  "message": "Complaint status updated successfully"
}
```

---

## 11. GET /api/reports/:id/history

| Property | Contract |
|---|---|
| Purpose | Retrieves chronological status audit events for a complaint |
| Authentication | Contextual: Public listed reports viewable anonymously; Private reports viewable only by owner and admin. |
| Path Parameter | `id` (UUID string) |
| Privacy Projection | Public visitors and citizens receive status, version, and timestamps only (notes and actor UUIDs omitted). Admins receive operational notes and actor UUIDs. |
| Success | HTTP 200, JSON, `Cache-Control: no-store` |
| Not Found | HTTP 404 (`NOT_FOUND`) if report missing or unauthorized |

### Success Example (HTTP 200 - Public View)
```json
{
  "success": true,
  "data": {
    "report_id": "77777777-7777-4777-8777-777777777777",
    "current_status": "in_progress",
    "history": [
      {
        "id": "11111111-1111-4111-8111-111111111111",
        "report_id": "77777777-7777-4777-8777-777777777777",
        "version": 1,
        "previous_status": null,
        "status": "pending",
        "changed_at": "2026-11-21T12:00:00.000Z"
      },
      {
        "id": "22222222-2222-4222-8222-222222222222",
        "report_id": "77777777-7777-4777-8777-777777777777",
        "version": 2,
        "previous_status": "pending",
        "status": "in_progress",
        "changed_at": "2026-11-21T13:45:00.000Z"
      }
    ]
  },
  "message": "Status history retrieved successfully"
}
```

---

## 12. GET /api/departments

| Property | Contract |
|---|---|
| Purpose | Retrieves approved directory of municipal departments for UI selection controls |
| Authentication | Optional / Public |
| Sorting | Alphabetical by `name` ascending |
| Projection | `id`, `name`, `description` |
| Success | HTTP 200, JSON, `Cache-Control: no-store` |

### Success Example (HTTP 200)
```json
{
  "success": true,
  "data": {
    "departments": [
      {
        "id": "88888888-8888-4888-8888-888888888888",
        "name": "Road Maintenance",
        "description": "Campus paths and road surfaces"
      },
      {
        "id": "99999999-9999-4999-8999-999999999999",
        "name": "Sanitation",
        "description": "Waste collection and cleanup"
      }
    ]
  },
  "message": "Departments retrieved successfully"
}
```

---

## 13. POST /api/admin/assign

| Property | Contract |
|---|---|
| Purpose | Assigns or reassigns a complaint to an operational department with concurrency guard |
| Authentication | Required (`requireAdmin()`). Throws 401 if unauthenticated, 403 if citizen. |
| Request Type | `application/json` |
| Body Fields | `report_id` (UUID), `department_id` (UUID), optional `expected_department_id` (UUID or null for optimistic concurrency lock), optional `reason` (max 1000 chars) |
| Forbidden Fields | Client-supplied `assigned_by`, `user_id`, `role`, `status`, `priority_score`, `resolved_at` are rejected with HTTP 422 |
| Success | HTTP 200, JSON, `Cache-Control: no-store` |
| Conflict | HTTP 409 (`CONFLICT`) if stale `expected_department_id`, same-department no-op, or resolved complaint |
| Not Found | HTTP 404 (`NOT_FOUND`) if report or department does not exist |

### Success Example (HTTP 200)
```json
{
  "success": true,
  "data": {
    "report_id": "44444444-4444-4444-8444-444444444444",
    "previous_department_id": null,
    "department": {
      "id": "88888888-8888-4888-8888-888888888888",
      "name": "Road Maintenance"
    },
    "assigned_by": "33333333-3333-4333-8333-333333333333",
    "assigned_at": "2026-11-21T14:30:00.000Z",
    "assignment_history_id": "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"
  },
  "message": "Department assigned successfully"
}
```

---

## 14. POST /api/ai/classify

| Property | Contract |
|---|---|
| Purpose | Analyzes an authenticated citizen's uploaded draft evidence photograph using Google Gemini and suggests complaint metadata |
| Authentication | Required (`requireUser()`). Citizen or admin session via SSR cookies |
| Request Type | `application/json` |
| Body Fields | `image_path` (string, must match `^drafts/<user_id>/<uuid>.<ext>$`), `consent_to_ai_processing` (boolean, must be `true`), optional `description_hint` (string, max 1000 chars) |
| Forbidden Fields | Client-supplied `user_id`, `role`, `priority_score`, `status`, `assigned_by`, `department_id` are rejected with HTTP 422 |
| Success | HTTP 200, JSON, `Cache-Control: no-store` |
| Response | `{ "category", "severity", "title_suggestion", "description_suggestion", "department_suggestion", "evidence_summary", "confidence_level", "needs_manual_review", "uncertainty_reason" }` |
| Fallback | If Gemini is unconfigured or rate-limited, returns HTTP 503 or 429 with guidance to proceed manually |

### Success Example (HTTP 200)
```json
{
  "success": true,
  "data": {
    "category": "pothole",
    "severity": "medium",
    "title_suggestion": "Deep pothole on Main Street vehicular lane",
    "description_suggestion": "The photograph shows a significant asphalt depression in the roadway that may pose a hazard to vehicles.",
    "department_suggestion": "Road Maintenance",
    "evidence_summary": "Visible circular asphalt depression with broken edges.",
    "confidence_level": "high",
    "needs_manual_review": false,
    "uncertainty_reason": null
  },
  "message": "AI suggestions generated successfully"
}
```

---

## 15. POST /api/reports/check-duplicates

| Property | Contract |
|---|---|
| Purpose | Discovers potential duplicate complaints within a server-controlled 100-meter radius using the Haversine formula |
| Authentication | Required (`requireUser()`). Citizen or admin session via SSR cookies |
| Request Type | `application/json` |
| Body Fields | `latitude` (number in [-90, 90]), `longitude` (number in [-180, 180]), `category` (canonical enum), optional `title_hint` (max 120 chars), optional `description_hint` (max 1000 chars) |
| Forbidden Fields | Client-supplied `radius_meters`, `user_id`, `role`, `status`, `priority_score` are strictly rejected with HTTP 422 |
| Radius | Fixed server-side at 100 meters (`DUPLICATE_RADIUS_METERS = 100`). Unrounded distance evaluated against threshold. |
| Status Filter | Active complaints only: `pending` and `in_progress`. `resolved` complaints excluded. |
| Ranking | Nearest first (`distance_meters ASC`), newer on tie (`created_at DESC`), ID tie-breaker (`id ASC`). Capped at 5 matches. |
| Success | HTTP 200, JSON, `Cache-Control: no-store` |
| Response | `{ "has_potential_duplicates": boolean, "radius_meters": 100, "match_policy": string, "matches": DuplicateMatchItem[] }` |
| Operation | Read-only discovery. Never mutates, auto-merges, deletes, or auto-upvotes complaints. |

### Success Example – Potential Matches Found (HTTP 200)
```json
{
  "success": true,
  "data": {
    "has_potential_duplicates": true,
    "radius_meters": 100,
    "match_policy": "same_category_within_100m",
    "matches": [
      {
        "id": "a1b2c3d4-e5f6-47a8-b9c0-123456789abc",
        "title": "Deep pothole near college gate",
        "category": "pothole",
        "status": "pending",
        "distance_meters": 34,
        "created_at": "2026-11-20T10:15:30.000Z"
      }
    ]
  },
  "message": "Potential nearby complaints found"
}
```

### Success Example – No Potential Matches (HTTP 200)
```json
{
  "success": true,
  "data": {
    "has_potential_duplicates": false,
    "radius_meters": 100,
    "match_policy": "same_category_within_100m",
    "matches": []
  },
  "message": "No potential nearby duplicates found"
}
```

---

## 16. POST /api/reports/:id/upvote

| Property | Contract |
|---|---|
| Purpose | Allows authenticated citizens to express community support (upvote) for an eligible civic complaint |
| Authentication | Required (`requireUser()`). Authenticated citizen session via SSR cookies |
| Path Parameters | `id` (UUID v4) |
| Request Type | `application/json` (empty object `{}` or omitted body) |
| Forbidden Fields | Client-supplied `user_id`, `vote_count`, `role`, `status`, `priority_score` are strictly rejected with HTTP 422 |
| Role Check | Citizen only. Administrative accounts receive HTTP 403 `FORBIDDEN` |
| Self-Voting | Creator cannot upvote own complaint. Enforces HTTP 403 `FORBIDDEN` (`SELF_SUPPORT_NOT_ALLOWED`) |
| Eligibility | Complaint status must be `pending` or `in_progress`. `resolved` returns HTTP 409 `CONFLICT` |
| Idempotency | First support: HTTP 201 (`already_supported: false`). Repeat support: HTTP 200 (`already_supported: true`, count unchanged). |
| Concurrency | Handled via PostgreSQL `UNIQUE(report_id, user_id)` constraint and conflict resolution |
| Success | HTTP 201 (new) or HTTP 200 (already supported), JSON, `Cache-Control: no-store` |
| Response | `{"success": true, "data": {"report_id": string, "supported": true, "already_supported": boolean, "support_count": number}, "message": string}` |

### Success Example – First Support (HTTP 201)
```json
{
  "success": true,
  "data": {
    "report_id": "a1b2c3d4-e5f6-47a8-b9c0-123456789abc",
    "supported": true,
    "already_supported": false,
    "support_count": 14
  },
  "message": "Community support recorded successfully"
}
```

### Success Example – Repeat Support (HTTP 200)
```json
{
  "success": true,
  "data": {
    "report_id": "a1b2c3d4-e5f6-47a8-b9c0-123456789abc",
    "supported": true,
    "already_supported": true,
    "support_count": 14
  },
  "message": "Community support already recorded"
}
```

---

## 17. GET /api/reports/:id/support

| Property | Contract |
|---|---|
| Purpose | Retrieves community support summary (total count and contextual support flags) without exposing voter identities |
| Authentication | Public / Optional Authenticated. Returns contextual flags when authenticated |
| Path Parameters | `id` (UUID v4) |
| Query Parameters | None |
| Privacy Guarantee | Strictly projects aggregate count and current user boolean. Never exposes voter user IDs, emails, or timestamps |
| Visibility Check | Returns HTTP 404 for non-existent reports or private reports belonging to another user |
| Success | HTTP 200, JSON, `Cache-Control: no-store` |
| Response | `{"success": true, "data": {"report_id": string, "support_count": number, "current_user_supported": boolean, "can_support": boolean}, "message": string}` |

### Success Example – Authenticated Eligible Citizen (HTTP 200)
```json
{
  "success": true,
  "data": {
    "report_id": "a1b2c3d4-e5f6-47a8-b9c0-123456789abc",
    "support_count": 14,
    "current_user_supported": false,
    "can_support": true
  },
  "message": "Community support summary retrieved"
}
```

### Success Example – Anonymous Visitor (HTTP 200)
```json
{
  "success": true,
  "data": {
    "report_id": "a1b2c3d4-e5f6-47a8-b9c0-123456789abc",
    "support_count": 14,
    "current_user_supported": false,
    "can_support": false
  },
  "message": "Community support summary retrieved"
}
```

---

## 18. GET /api/reports/:id/priority

| Property | Contract |
|---|---|
| Purpose | Retrieves the authoritative, explainable priority score breakdown for a civic complaint |
| Authentication | Public / Contextual (Optional authenticated session) |
| Path Parameters | `id` (UUID v4) |
| Query Parameters | None |
| Privacy Guarantee | Strictly projects scalar points and counts. Never exposes individual voter identities |
| Visibility Check | Returns HTTP 404 for nonexistent complaints or private complaints belonging to other users |
| Success | HTTP 200, JSON, `Cache-Control: no-store` |
| Response | `{"success": true, "data": {"report_id": string, "priority_score": number, "priority_breakdown": PriorityBreakdown, "calculated_at": string, "is_active": boolean}, "message": string}` |

### Success Example (HTTP 200)
```json
{
  "success": true,
  "data": {
    "report_id": "55555555-5555-4555-8555-555555555555",
    "priority_score": 68,
    "priority_breakdown": {
      "severity": "high",
      "severity_points": 50,
      "support_count": 4,
      "support_points": 12,
      "days_unresolved": 3,
      "age_points": 6,
      "priority_score": 68,
      "max_score": 100
    },
    "calculated_at": "2026-11-21T18:30:00.000Z",
    "is_active": true
  },
  "message": "Priority breakdown retrieved successfully"
}
```

---

## 19. POST /api/admin/route

| Property | Contract |
|---|---|
| Purpose | Privileged endpoint to retry or re-evaluate automatic routing for a complaint |
| Authentication | Required (`requireAdmin`) |
| Authorization | Admin role only |
| Body Schema | `{"report_id": string (UUID v4), "expected_department_id"?: string (UUID v4) \| null}` |
| Precedence Rule | Cannot overwrite manual admin assignments or unassignments (`manual_override = true`) |
| Concurrency Guard | Validates `expected_department_id` when provided; yields 409 CONFLICT on mismatch |
| Idempotency | Returns existing assignment without creating duplicate audit records if already routed |
| Success | HTTP 200, JSON, `Cache-Control: no-store` |
| Response | `{"success": true, "data": RoutingResult, "message": string}` |

### Success Example (HTTP 200)
```json
{
  "success": true,
  "data": {
    "report_id": "77777777-7777-4777-8777-777777777777",
    "routing_status": "assigned",
    "assignment_source": "automatic",
    "department": {
      "id": "11111111-0000-4000-8000-000000000001",
      "name": "Road Maintenance"
    },
    "previous_department_id": null,
    "rule_key": "pothole_to_road_maintenance",
    "assignment_history_id": "88888888-8888-4888-8888-888888888888",
    "assigned_at": "2026-11-22T00:15:00.000Z",
    "message": "Complaint routed successfully"
  },
  "message": "Complaint routed successfully"
}
```

---

## 20. GET /api/reports/map

| Property | Contract |
|---|---|
| Purpose | Retrieves map-ready complaint markers strictly within the requested geographic viewport |
| Authentication | Optional / Contextual (Public, Authenticated Citizen, or Admin) |
| Query Parameters | `south`, `west`, `north`, `east` (required); `category`, `status`, `severity`, `department_id`, `limit`, `sort` (optional) |
| Spatial Guarantee | Bounding-box filtering executed inside PostgreSQL with International Date Line (antimeridian) wraparound support |
| Privacy Guarantee | Projects minimal preview fields only; strictly excludes user profiles, emails, voter identities, and storage paths |
| Result Limits | Default limit 200, max 300. Includes accurate `has_more` overflow indicator |
| Success | HTTP 200, JSON, `Cache-Control: no-store` |
| Response | `{"success": true, "data": MapResponseData, "message": string}` |

### Success Example (HTTP 200)
```json
{
  "success": true,
  "data": {
    "markers": [
      {
        "id": "77777777-7777-4777-8777-777777777777",
        "latitude": 22.5726,
        "longitude": 88.3639,
        "title": "Large pothole near campus entrance",
        "category": "pothole",
        "status": "pending",
        "severity": "high",
        "priority_score": 68,
        "department": {
          "id": "11111111-0000-4000-8000-000000000001",
          "name": "Road Maintenance"
        },
        "created_at": "2026-11-21T10:00:00.000Z"
      }
    ],
    "viewport": {
      "south": 22.50,
      "west": 88.30,
      "north": 22.70,
      "east": 88.50,
      "crosses_antimeridian": false
    },
    "returned_count": 1,
    "limit": 200,
    "has_more": false
  },
  "message": "Map reports retrieved successfully"
}
```

---

## 21. POST /api/admin/reports/:id/resolution-evidence

| Property | Contract |
|---|---|
| Purpose | Dedicated administrator endpoint to upload after-repair evidence for complaints in `in_progress` status |
| Authentication | Required (`requireAdmin`) |
| Authorization | Admin role only (citizens rejected with 403 FORBIDDEN) |
| Request Type | `multipart/form-data` with binary field `file` |
| File Constraints | JPEG, PNG, or WebP; maximum 3 MB (3,145,728 bytes) |
| Target Validation | Target report must exist and be currently in `in_progress` status (otherwise 409 CONFLICT) |
| Storage Staging | Isolated in `resolution-drafts/<admin_id>/<report_id>/<uuid>.<ext>` |
| Lifecycle Rule | Staged as temporary draft; does NOT automatically resolve complaint |
| Success | HTTP 201, JSON, `Cache-Control: no-store` |
| Response | `{"success": true, "data": UploadedImageRef, "message": string}` |

### Success Example (HTTP 201)
```json
{
  "success": true,
  "data": {
    "bucket": "civic-evidence",
    "storage_path": "resolution-drafts/22222222-2222-4222-8222-222222222222/44444444-4444-4444-8444-444444444444/3a7b9c1d-8e2f-4a5b-9c3d-1e2f3a4b5c6d.jpg",
    "mime_type": "image/jpeg",
    "size_bytes": 1048576,
    "status": "temporary"
  },
  "message": "Resolution evidence uploaded successfully"
}
```

---

## 22. GET /api/reports/:id/evidence

| Property | Contract |
|---|---|
| Purpose | Retrieves verified before and after photographs for a complaint with short-lived signed URLs |
| Authentication | Optional / Contextual |
| Authorization | Public listed complaints: viewable by all. Private/unlisted: owner or admin only (otherwise 404 NOT_FOUND) |
| Query Parameters | `expires_in` (optional integer, min 60, max 3600, default 900 seconds) |
| Data Models | Categorized into `before_images` (citizen submission) and `after_images` (admin resolution) |
| Attribution Rule | Includes explicit notice: `"Marked resolved by an administrator with after-repair evidence."` |
| Success | HTTP 200, JSON, `Cache-Control: no-store` |
| Response | `{"success": true, "data": ReportEvidenceResponseData, "message": string}` |

### Success Example (HTTP 200)
```json
{
  "success": true,
  "data": {
    "report_id": "44444444-4444-4444-8444-444444444444",
    "status": "resolved",
    "resolved_at": "2026-11-21T18:30:00.000Z",
    "attribution_notice": "Marked resolved by an administrator with after-repair evidence.",
    "before_images": [
      {
        "id": "img-before-1",
        "storage_path": "drafts/11111111-1111-4111-8111-111111111111/abc.jpg",
        "type": "before",
        "created_at": "2026-11-20T10:00:00.000Z",
        "signed_url": "https://...supabase.co/storage/v1/object/sign/civic-evidence/drafts/...?token=..."
      }
    ],
    "after_images": [
      {
        "id": "img-after-1",
        "storage_path": "resolution-drafts/22222222-2222-4222-8222-222222222222/44444444-4444-4444-8444-444444444444/3a7b9c1d.jpg",
        "type": "after",
        "created_at": "2026-11-21T18:30:00.000Z",
        "signed_url": "https://...supabase.co/storage/v1/object/sign/civic-evidence/resolution-drafts/...?token=..."
      }
    ]
  },
  "message": "Report evidence retrieved successfully"
}
```

---

## 21. GET /api/admin/analytics/overview

| Property | Contract |
|---|---|
| Purpose | Retrieves high-level operational municipal KPIs and snapshot counts |
| Authentication | Authenticated administrator session required (`requireAdmin()`) |
| Request Type | Query Parameters |
| Query Fields | `start` (optional `YYYY-MM-DD`), `end` (optional `YYYY-MM-DD`, default: today UTC). Default span: 30 days |
| Security | Rejects forbidden client parameters (`role`, `is_admin`, etc.) with HTTP 422 |
| Success | HTTP 200, JSON, `Cache-Control: no-store` |
| Response | `{"success": true, "data": AnalyticsOverviewData}` |

### Success Example (HTTP 200)
```json
{
  "success": true,
  "data": {
    "period": { "start": "2026-10-23", "end": "2026-11-21", "timezone": "UTC" },
    "all_time_total_reports": 1240,
    "created_in_period": 142,
    "resolved_in_period": 98,
    "current_pending": 34,
    "current_in_progress": 56,
    "current_resolved": 1150,
    "current_active_backlog": 90,
    "current_unassigned_active": 12,
    "creation_cohort_resolution_rate_percent": 69.01
  }
}
```

---

## 22. GET /api/admin/analytics/trends

| Property | Contract |
|---|---|
| Purpose | Retrieves continuous time-series trend aggregation of complaints created vs. resolved |
| Authentication | Authenticated administrator session required (`requireAdmin()`) |
| Query Fields | `start` (optional `YYYY-MM-DD`), `end` (optional `YYYY-MM-DD`), `granularity` (`"day"` \| `"week"` \| `"month"`, default `"day"`) |
| Invariant | Guaranteed continuous zero-filled buckets for intervals with zero events |
| Success | HTTP 200, JSON, `Cache-Control: no-store` |
| Response | `{"success": true, "data": AnalyticsTrendsData}` |

---

## 23. GET /api/admin/analytics/categories

| Property | Contract |
|---|---|
| Purpose | Retrieves complaint distribution across all 7 canonical categories |
| Authentication | Authenticated administrator session required (`requireAdmin()`) |
| Query Fields | `start` (optional `YYYY-MM-DD`), `end` (optional `YYYY-MM-DD`) |
| Success | HTTP 200, JSON, `Cache-Control: no-store` |
| Response | `{"success": true, "data": AnalyticsCategoriesData}` |

---

## 24. GET /api/admin/analytics/departments

| Property | Contract |
|---|---|
| Purpose | Retrieves active complaint workload grouped by department plus unassigned backlog |
| Authentication | Authenticated administrator session required (`requireAdmin()`) |
| Success | HTTP 200, JSON, `Cache-Control: no-store` |
| Response | `{"success": true, "data": AnalyticsDepartmentsData}` |

---

## 25. GET /api/admin/analytics/performance

| Property | Contract |
|---|---|
| Purpose | Retrieves resolution duration turnaround metrics (average, exact median) and backlog aging |
| Authentication | Authenticated administrator session required (`requireAdmin()`) |
| Query Fields | `start` (optional `YYYY-MM-DD`), `end` (optional `YYYY-MM-DD`) |
| Metrics | Sample size, average hours, median hours via `percentile_cont(0.5)`, backlog aging > 7 days |
| Success | HTTP 200, JSON, `Cache-Control: no-store` |
| Response | `{"success": true, "data": AnalyticsPerformanceData}` |

---

## 26. GET /api/admin/analytics/priorities

| Property | Contract |
|---|---|
| Purpose | Retrieves top active complaints ranked by priority score for operational dispatch |
| Authentication | Authenticated administrator session required (`requireAdmin()`) |
| Query Fields | `limit` (optional integer, min 1, max 20, default 5) |
| Success | HTTP 200, JSON, `Cache-Control: no-store` |
| Response | `{"success": true, "data": AnalyticsPrioritiesData}` |

---

## Shared JSON Types

Import `ApiResponse<T>`, `HealthData` from `@/types/api`, `AuthMeData`, `UserProfile` from `@/types/auth`, `UploadResponseData`, `SignedUrlResponseData` from `@/types/storage`, `CreateReportInput`, `CreateReportResponseData`, `PublicReportItem`, `OwnerReportItem`, `ReportDetailItem`, `ReportListResponse`, `ReportPagination`, `ReportQueryFilter`, `ReportSort` from `@/types/report`, `UpdateStatusInput`, `UpdateStatusResponseData`, `StatusHistoryItem`, `StatusHistoryResponseData` from `@/types/status`, `DepartmentItem`, `DepartmentListResponseData`, `AssignDepartmentInput`, `AssignDepartmentResponseData`, `DepartmentAssignmentHistoryItem` from `@/types/department`, `AIClassifyInput`, `AIClassificationData` from `@/types/ai`, `CheckDuplicatesInput`, `DuplicateMatchItem`, `CheckDuplicatesResponseData`, `CheckDuplicatesResponse` from `@/types/duplicate`, `SupportReportResponseData`, `ReportSupportSummary`, `SupportReportResponse`, `ReportSupportSummaryResponse` from `@/types/support`, `PriorityBreakdown`, `ReportPriorityData`, `ReportPriorityResponse` from `@/types/priority`, `RoutingStatus`, `AssignmentSource`, `RoutingDecision`, `RoutingResult`, `AdminRouteReportInput`, `AdminRouteReportResponse`, `BackfillResult` from `@/types/routing`, `MapMarker`, `MapViewport`, `MapQueryFilter`, `MapResponseData`, `MapApiResponse` from `@/types/map`, `EvidenceImageItem`, `ReportEvidenceResponseData`, `ResolutionEvidenceRef`, `RealtimeReportEventPayload`, `RealtimeChangeType` from `@/types/evidence` and `@/types/realtime`, and `AnalyticsOverviewData`, `AnalyticsTrendsData`, `AnalyticsCategoriesData`, `AnalyticsDepartmentsData`, `AnalyticsPerformanceData`, `AnalyticsPrioritiesData` from `@/types/analytics`.

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
