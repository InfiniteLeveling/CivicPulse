# CivicPulse | Backend Implementation Specification

**Version:** 1.0 · Companion: `PRD.md`, `frontend.md`  
**Owner:** Member B (backend), Member C (AI and algorithms)  
**Stack:** Next.js Route Handlers (Node.js runtime), TypeScript, Zod, Supabase Auth/PostgreSQL/Storage, Gemini API, Vercel.

## 1. Architecture and responsibilities

Use a modular monolith. The API layer authenticates, authorizes and validates; services implement business rules; database transactions enforce integrity. The frontend consumes sanitized DTOs, never raw sensitive database rows. Supabase is the identity provider and managed database; do not add Express, Redis, Docker or a separate ML server for the MVP.

```
Browser → Next.js REST API → validation + verified session + role check
                             ├─ report / support / status services
                             ├─ duplicate / priority / analytics services
                             ├─ Supabase database + private storage
                             └─ Gemini classification (server only)
```

## 2. Repository layout

```
src/
  app/api/
    uploads/route.ts
    ai/classify/route.ts
    reports/route.ts
    reports/duplicates/route.ts
    reports/[id]/route.ts
    reports/[id]/support/route.ts
    reports/[id]/feedback/route.ts            # P1
    admin/reports/[id]/triage/route.ts
    admin/reports/[id]/status/route.ts
    admin/reports/[id]/review/route.ts        # P1
    admin/departments/route.ts
    stats/route.ts
  services/
    auth.service.ts       # verified user and trusted role
    report.service.ts     # query, create, sanitized DTO
    upload.service.ts     # staging, metadata, signed URLs
    ai.service.ts         # Gemini and response validation
    duplicate.service.ts  # category + bounds + Haversine
    priority.service.ts   # pure scoring function
    support.service.ts    # unique support records
    admin.service.ts      # triage, transitions, audit
    analytics.service.ts  # aggregate counts
  lib/
    supabase/client.ts    # public/publishable client
    supabase/server.ts    # session-bound client
    supabase/admin.ts     # server-only privileged client, if needed
    gemini.ts             # server only
  validators/ report.schema.ts, upload.schema.ts, admin.schema.ts
  types/ domain.ts, api.ts
  utils/ haversine.ts, api-response.ts
supabase/
  migrations/             # version controlled SQL in order
  seed.sql                # departments + non-sensitive demo records
scripts/ seed-demo-users.ts # server-only; credentials from local env
tests/                    # unit and API/security tests
.env.example
.env.local                 # ignored by git
```

Use server-only imports for credentials. Configure authentication with the Supabase SSR SDK and verified server sessions. Do not authorize using a client-supplied user ID or untrusted user metadata.

## 3. Data model

All IDs UUID unless specified; UTC `timestamptz` for dates. Use explicit CHECK constraints or enums; FK indexes; default `created_at = now()`. Database snake_case, API camelCase. The following is a schema specification, not an executable migration.

| Table | Columns and constraints |
|---|---|
| `profiles` | `id` PK references `auth.users(id)`; `full_name` text; `role` enum citizen/admin default citizen; `created_at`. No redundant email column required. |
| `departments` | `id` PK; `name` unique; `category` unique nullable; `description`; `created_at`. Seed Road Maintenance, Sanitation, Water Supply, Electrical, Drainage. |
| `reports` | `id` PK; `reference` unique generated CP-style reference; `user_id` FK profiles; `department_id` nullable FK; `title` 5–120 chars; `description` 10–1000 chars; `category`, `severity` default medium; `severity_reviewed` boolean default false; `status` default pending; `visibility` default public; `latitude` [-90,90]; `longitude` [-180,180]; `created_at`, `updated_at`, `resolved_at` nullable; `version` positive int default 1. |
| `report_votes` | `report_id` FK reports; `user_id` FK profiles; `created_at`; composite PK (`report_id`,`user_id`). Initial reporter counts as first support; private issue only has reporter support in MVP. |
| `report_images` | `id` PK; `owner_id` FK profiles; `report_id` nullable FK reports; `purpose` issue/resolution; `storage_path` unique; `mime_type`; `size_bytes`; `created_at`. Unattached image is private staging. Attach once. |
| `status_history` | `id` PK; `report_id` FK; `actor_id` FK profiles; `event_type` submitted/triaged/status_changed/feedback_reviewed; `old_status`, `new_status` nullable; `public_remark` nullable; `created_at`. Actor identity excluded from public DTO. |
| `ai_analyses` | `id` PK; `image_id` FK report_images; `owner_id` FK profiles; `category`; `severity`; `description`; `is_civic_issue` boolean; `created_at`. Records validated AI result server-side; owner access only. |
| `resolution_feedback` (P1) | `id` PK; `report_id` FK; `user_id` FK; `resolution_version` int; `decision` confirmed/review_requested; `reason` nullable; `review_state` pending/accepted/declined; `created_at`; unique (`report_id`,`user_id`,`resolution_version`). |

`reports` does not persist a mutable priority score or support count for the MVP: aggregate votes and compute priority at read time. Use `version` for optimistic concurrency on admin actions. Keep old evidence and history after reopen. Compute `resolution_version` from report version at the resolved state or a dedicated resolution counter; store it consistently in feedback.

### Relationships

```
auth.users 1─1 profiles 1─N reports N─1 departments
profiles 1─N report_votes N─1 reports
profiles 1─N report_images N─1 reports (nullable while staged)
reports 1─N status_history
report_images 1─N ai_analyses
reports 1─N resolution_feedback (P1)
```

### Indexes and integrity

- `reports(user_id, created_at desc)`, `reports(status, category)`, `reports(department_id, status)`, `reports(visibility, created_at desc)`; index latitude/longitude for bounded candidate query when useful.
- Index `report_images(report_id, purpose)` and `status_history(report_id, created_at)`; votes composite PK starts with `report_id`, add `report_votes(user_id, report_id)` for supported lists.
- Generate unique public reference using database sequence or collision-safe unique identifier; never derive from row count.
- Use DB transaction/RPC for report creation + initial support + image attachment + history; and for triage/status change + image attachment + history. Lock report row or use version check. Ensure resolved status has `resolved_at`; clear on reopen. Validate evidence before resolving.
- Create citizen profiles on signup using a controlled trigger/function. Ignore any incoming `role`. Admin roles set only via trusted provisioning. Do not let profile edits modify role.

## 4. Business logic

### 4.1 Validation and AI

Enums: categories `pothole`, `garbage`, `water_leakage`, `streetlight`, `drainage`, `other`; severity `low`, `medium`, `high`, `critical`; status `pending`, `in_progress`, `resolved`; visibility `public`, `private`.

Gemini receives an authorized uploaded image from private staging, not an arbitrary remote URL. Ask for only structured JSON with `category`, `severity`, `description`, `isCivicIssue`. Use a supported multimodal model configured through `GEMINI_MODEL`. Validate response with Zod; treat image content and model output as untrusted, never as instructions or authorization. No identity inference. Do not return fabricated numeric confidence. On invalid/failed response return recoverable `AI_UNAVAILABLE`; let citizen report manually. Store valid analysis under image owner; use `analysisId` linked to that image at creation. AI severity remains provisional until reviewed by admin. If no valid analysis, default severity medium. Suggest department from confirmed category, with admin assignment independent. `isCivicIssue=false` is a suggestion, not automatic rejection.

### 4.2 Duplicate service

1. Filter same confirmed category, active status, visible-to-caller reports. Private reports are not disclosed to unrelated users; for private submissions only consider caller's own private reports or public issues (support of a public issue is an explicit alternative, never automatic disclosure).
2. Filter approximate bounding box around location, then calculate exact Haversine distance. Use pagination or enforce a safe bound and disclose/handle overflow rather than silently claiming no matches.
3. Return nearest five candidates within configurable radius 100 m. Recheck during create, `409` if unconfirmed candidates appear. Require user choice; no automatic merge. A candidate-match does not prove identity.

```ts
export function distanceMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
  const rad = (n: number) => n * Math.PI / 180;
  const a = Math.sin(rad(lat2-lat1)/2)**2 +
    Math.cos(rad(lat1))*Math.cos(rad(lat2))*Math.sin(rad(lon2-lon1)/2)**2;
  return 2 * 6371000 * Math.asin(Math.sqrt(Math.min(1, Math.max(0,a))));
}
```

PostGIS and stronger concurrency-safe spatial deduplication are future improvements; do not claim perfect duplicate detection. Handle antimeridian/polar edge cases if deploying globally; MVP assumes a single city.

### 4.3 Priority service

```ts
type Severity = 'low' | 'medium' | 'high' | 'critical';
export function priority(severity: Severity, supportCount: number, createdAt: string, end = Date.now()) {
  const severityPoints = {low:15, medium:30, high:50, critical:70}[severity];
  const supportPoints = Math.min(3 * Math.max(0, supportCount), 20);
  const days = Math.max(0, Math.floor((end - Date.parse(createdAt)) / 86400000));
  const agePoints = Math.min(2 * days, 10);
  const score = severityPoints + supportPoints + agePoints;
  return {score, severityPoints, supportPoints, agePoints, urgent: severity === 'critical' || score >= 70};
}
```

Use valid timestamps and counts from DB. For resolved issues use `resolved_at` as `end`. Active queue sorts critical first, score desc, then created_at asc; urgent flag includes both score and critical severity. For MVP small dataset, make sort before pagination over the complete bounded active dataset, or implement SQL score expression. Do not sort per page. Critical issues need human review regardless of votes. Score is a heuristic and can be biased by unequal reporting participation.

### 4.4 Support, triage and status

- Only signed-in citizens/admins may support unresolved public reports; ensure unique row with `ON CONFLICT DO NOTHING` and return current count. Reporter support already exists. Private reports cannot gain extra support.
- Admin alone may correct severity/category, assign department, change visibility and publish remark. Set `severity_reviewed=true` on explicit severity review. Changing category can reset suggested department; assigned department remains explicit. Changing public to private removes from public queries immediately (already shared URLs may persist until expiration).
- Valid transitions pending → in_progress → resolved. Require resolution image owned by admin, staged for resolution, and remark. Optional P1 approved review reopens resolved → in_progress. For each mutation update version and append history atomically. P1 feedback only by original reporter, not any public viewer.

## 5. REST API contract

Use JSON `{ "data": ... }` for success and `{ "error": { "code": "...", "message": "...", "details": ... } }` for errors. `details` optional and safe. ISO 8601 timestamps. No client-supplied user IDs/roles. HTTP status: 200 read/update, 201 create/upload, 400 validation, 401 unauthenticated, 403 forbidden, 404 unavailable/non-visible resource, 409 conflict, 413 oversized, 415 media type, 429 rate limit, 503 external failure, 500 generic error. Public endpoints return 404 for private records when unauthorized.

| Method and endpoint | Access | Request and response data |
|---|---|---|
| `POST /api/uploads` | Signed in; resolution admin only | Multipart `file`, `purpose=issue|resolution` → `{imageId, previewUrl}` |
| `POST /api/ai/classify` | Signed in; own staged issue image | `{imageId}` → `{analysisId, category, severity, description, isCivicIssue}` |
| `POST /api/reports/duplicates` | Signed in | `{category, latitude, longitude, visibility}` → `{candidates: [{id, reference, title, category, status, distanceMeters, supportCount, imageUrl}]}` |
| `POST /api/reports` | Signed in | Create payload below → `{report: ReportSummary}`; 409 duplicate candidates if needed |
| `GET /api/reports` | Public for public scope; signed in for mine/supported; admin for admin scope | Filters below → `{items: ReportSummary[], total, page, pageSize}` |
| `GET /api/reports/:id` | Public or authorized owner/admin | `{report: ReportSummary, history, resolutionImages, canGiveFeedback, version}` |
| `POST /api/reports/:id/support` | Signed in | No body → `{supportCount, viewerHasSupported, priority}` (idempotent) |
| `PATCH /api/admin/reports/:id/triage` | Admin | `{version, departmentId?, severity?, category?, visibility?, remark?}` → `{report, version}` |
| `PATCH /api/admin/reports/:id/status` | Admin | `{version, status, remark?, resolutionImageId?}` → `{report, version}` |
| `GET /api/admin/departments` | Admin | `{items: [{id, name, category}]}`; P1 include counts |
| `GET /api/stats?scope=mine|admin` | Signed in / admin | `{total, pending, inProgress, resolved, criticalActive, resolutionRate}`; P1 category/trend fields |
| `POST /api/reports/:id/feedback` (P1) | Original reporter | `{version, decision: confirmed|review_requested, reason?}` → `{feedbackId, reviewState}` |
| `POST /api/admin/reports/:id/review` (P1) | Admin | `{version, feedbackId, action: reopen|decline, remark}` → `{report, version}` |

Login, registration, logout and optional password reset use Supabase Auth SDK, not custom password endpoints.

### Create issue example

```json
{
  "title": "Large pothole near main road",
  "description": "Road surface damaged near the bus stop.",
  "category": "pothole",
  "latitude": 22.5726,
  "longitude": 88.3639,
  "visibility": "public",
  "imageId": "11111111-1111-4111-8111-111111111111",
  "analysisId": "22222222-2222-4222-8222-222222222222",
  "confirmedSeparateFromIds": []
}
```

`analysisId` nullable/omitted if manual. `confirmedSeparateFromIds` lists candidate IDs user explicitly declined. Revalidate staged image ownership and AI analysis link; derive severity server-side. Location example is illustrative, not an actual complaint. Return `409 DUPLICATE_CANDIDATES` with `details.candidates` in same preview shape if not confirmed. Avoid duplicate issue creation on retry by enforcing single use of image attachment; if same user's already-attached issue image is retried, return that existing issue rather than creating a second issue.

### ReportSummary (shared with frontend)

```ts
type ReportSummary = {
  id: string; reference: string; title: string; description: string;
  category: Category; severity: Severity; severityReviewed: boolean;
  status: Status; visibility: Visibility; latitude: number; longitude: number;
  department: {id: string; name: string} | null;
  supportCount: number;
  priority: {score: number; severityPoints: number; supportPoints: number; agePoints: number; urgent: boolean};
  createdAt: string; updatedAt: string; resolvedAt: string | null;
  imageUrl: string | null; viewerHasSupported: boolean;
};
```

Enums defined in section 4. Anonymous callers have `viewerHasSupported=false`. For detail, `history` entries are `{id, eventType, oldStatus, newStatus, remark, createdAt}` (nullable statuses/remark); `resolutionImages` entries `{id, imageUrl, createdAt}`; `canGiveFeedback` true only for eligible reporter if P1 enabled; `version` concurrency token. Exclude actor IDs, reporter IDs, emails, storage paths and private notes. Admin UI doesn't need contact details for MVP. Signed URLs generated only after visibility authorization.

### List filtering and stats

`GET /api/reports?scope=public|mine|supported|admin&category=pothole&status=pending&departmentId=...&q=...&sort=recent|priority&page=1&pageSize=20`. Defaults public, recent, page 1, size 20; cap size 100. `mine` filters reporter; `supported` filters own vote rows excluding own original reports and any no-longer-visible private issues; admin list unrestricted by visibility. Priority sort excludes resolved issues unless the caller explicitly selects resolved (then use recent sort). Search title/reference with bounded query; validate filters. Stats: mine counts original reports, admin counts all; resolution rate = resolved/total ×100 or null if total zero. P1 analytics use consistent scopes/date ranges and UTC timestamps; don't hardcode data.

## 6. Auth, database policies and upload security

### Authorization matrix

| Action | Anonymous | Citizen | Admin |
|---|---|---|---|
| Read public sanitized report | Yes | Yes | Yes |
| Read private report | No | Own only | Yes |
| Create report | No | Yes | Yes |
| Support active public report | No | Yes | Yes |
| Assign, review severity, change visibility/status | No | No | Yes |
| Upload resolution proof | No | No | Yes |
| Access private image | No | Authorized own/visible report only | Yes |
| Change own role | No | No | No (provisioning only) |

### RLS and safe reads/writes

- Enable RLS on all tables and storage objects. Default-deny raw table access to browser roles; expose only necessary profile self-read and safe department data. Use server endpoints for public report DTOs (never allow raw public reads of reporter IDs). For fast MVP, privileged server client can execute vetted queries after explicit authorization checks; browser has no privileged credentials. If using session-bound DB access/RPC, grant carefully and enforce identical ownership rules inside DB. Do not rely on RLS to protect a service-role client: it bypasses RLS.
- Do not grant general client writes for reports, votes, history, images, roles or analysis. Restrict SQL RPC execution to server role where using privileged calls; use fixed search_path and reviewed functions. Validate auth and role server-side at each protected endpoint and verify object ownership, visibility and allowed fields.
- Profile row owner can read own name/role; use secure endpoint for edits, allow only display name. Role provisioned by trusted seed/admin script. Never use self-editable metadata for authorization.
- Rate limit AI/uploads/creation/support per user; use durable database-backed limit or provider feature (not memory-only on serverless). Add same-origin/CSRF protection for mutation endpoints where cookies authenticate requests. Return 403 for citizen admin actions even if UI hides them.

### Storage and media

- One private bucket `report-media`, paths like `staged/{userId}/{imageId}.{ext}` (opaque path after attachment may remain; authorization comes from DB metadata). Deny direct client listing/download/write if server handles uploads.
- File types JPEG/PNG/WebP only; validate magic bytes and actual image decode, max 2 MB and reasonable pixel dimensions. Strip EXIF via server re-encoding even if browser did compression; reject SVG/executables. Store trusted MIME and safe generated names.
- Private staging: ownership required for analysis/attach; signed preview URL only for uploader/admin. Short-lived signed URLs for authorized report readers (e.g. five minutes). Public report images can be accessed by anyone with a current URL; warn users and avoid sensitive content. Never sign private image for unrelated requester.
- Ask reporter for consent before sending photo to external AI, offer manual alternative. Avoid faces/license plates, optionally private visibility; allow admins to hide unsafe public reports. Cleanup abandoned staged objects by periodic maintenance or manual demo cleanup; don't delete attached evidence. Handle upload failure by removing orphan objects where possible.

## 7. Environment and deployment

`.env.example` (placeholders only):

```dotenv
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY=
GEMINI_API_KEY=
GEMINI_MODEL=
DUPLICATE_RADIUS_METERS=100
```

Use the appropriate Supabase publishable/anon and server secret/service-role credentials supplied by your project; variable names above are application conventions. Never prefix server credentials with `NEXT_PUBLIC_`. Commit `.env.example` and ignore `.env.local`. Provision demo accounts by trusted script, not hardcoded client auth. Configure auth redirect URLs, environment variables and production deployment. Run migrations and seed departments before demo. Check Gemini and hosting quotas and OSM tile policies; keep manual AI path and map/list fallback.

External services: [Supabase docs](https://supabase.com/docs), [Next.js docs](https://nextjs.org/docs), [Gemini API docs](https://ai.google.dev/gemini-api/docs), [Zod](https://zod.dev/), [OSM tile policy](https://operations.osmfoundation.org/policies/tiles/). Model names, API pricing and quotas intentionally not pinned without account verification.

## 8. Error and test plan

| Test | Expected behavior |
|---|---|
| Missing auth on report create | 401; no row created |
| Citizen requests admin status change | 403; no change/history |
| Unrelated user requests private report/image | 404 or denied; no signed URL |
| Invalid coordinates/title/category | 400 validation |
| Oversized/mislabeled file | 413/415 or 400; no valid image record |
| Image owner mismatch / reuse | 403 or safe idempotent return for same owner's original issue |
| Gemini malformed output / timeout | 503 recoverable; manual reporting works |
| Duplicate within 100 m, same category/active | Candidate returned; create needs confirmation |
| Nearby different category / resolved / far | Not a duplicate candidate |
| Two simultaneous support calls | One unique vote; current count returned |
| Critical severity with low votes | Urgent; ranked above noncritical active reports |
| Priority high, 5 votes, 3 days | 50+15+6 = 71 |
| Resolve without evidence or invalid transition | 400/409; no status change |
| Stale admin version / concurrent update | 409; reload latest |
| Valid resolve | Status + timestamp + proof + history atomic |
| Public response contains private identity | Test fails; sanitize DTO |
| Stats total zero | Resolution rate null |

Run unit tests for Haversine (same point, within/outside radius), scoring edge cases and transitions. Use Postman or automated integration tests with citizen A, citizen B, admin and anonymous sessions. Test raw Supabase access separately to catch RLS bypass. Seed only synthetic complaints with clearly identified sample photographs or rights-cleared media. If P1 Realtime is enabled, avoid raw public report/vote subscriptions that expose IDs; prefer authorized sanitized events or refetch after changes. Otherwise polling/manual refresh is enough.

## 9. Build order and definition of done

1. Create Supabase project, migrations, RLS, private bucket, demo roles and departments.
2. Implement session helpers, validation and sanitized DTOs; publish endpoint contract to frontend developer.
3. Implement uploads, report creation/detail/list, initial vote and history transaction.
4. Integrate Gemini, duplicate detection, score and support endpoints.
5. Implement admin triage/status/evidence transaction, basic stats and security checks.
6. Test full two-citizen/admin flow; deploy early. Add P1 charts/realtime/feedback only after successful P0 smoke tests.

**Done when:** all P0 endpoints return consistent payloads and errors, the database rejects unauthorized direct access, the demo works on deployed and local setups, and core state transitions and failure modes have been tested. This is a design specification, not a tested backend implementation; migrations, API source, credentials and deployment must still be built by the team.
