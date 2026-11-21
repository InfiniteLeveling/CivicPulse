# Internal API specification

All endpoints are proposed. Same-origin browser uses verified Supabase session cookies. Always check origin on mutations. Clients send Accept application/json and Content-Type application/json for bodies except multipart upload (browser sets boundary), and text/csv for export. No body on GET. Only named query parameters are supported. All path IDs and letters in illustrative responses stand for UUIDs. Session identity supplies actor and department. Auth registration, login, recovery, sign-out and session refresh use Supabase Auth; there is no custom password endpoint.

## Representation and common errors

Wrap every success payload shown below as `{"data":<payload>,"request_id":"…"}`. CSV export returns a text/csv attachment directly. An error returns `{"error":{"code":"VALIDATION","message":"Check the marked fields","fields":{"description":"Enter 10–1000 characters"}},"request_id":"…"}`. Include fields only for safe validation details. Use 400 malformed request, 401 missing/expired session, 403 disallowed operation, 404 missing or inaccessible object, 409 stale version/invalid state, 413 too large, 415 unsupported media, 422 invalid input, 429 quota with Retry-After, 503 dependency unavailable. These common errors apply across the catalog. Limits below are proposed per-account starting values, subject to pilot load tests. Use private/no-store caching for user-specific reads.

## Endpoint contracts

### upload · `POST /api/upload`

- **Caller and purpose.** Any authenticated user; staff in scope for evidence. Used by Photo picker / evidence form.
- **Request.** Multipart file, purpose=intake or evidence, report_id required for evidence
- **Validation.** Decode JPEG/PNG/WebP ≤2 MB (2,000,000 bytes), enforce pixel cap and strip metadata; no caller-selected keys.
- **Persistence.** Write private object and staged report_images row; expire after one hour.
- **Success payload.** `201 {"image_id":"I","purpose":"intake"}`
- **Quota and operation errors.** 10/hour; 413,415,422.

### classify · `POST /api/ai/classify`

- **Caller and purpose.** Citizen owning staged intake. Used by Intake suggestion panel.
- **Request.** {"image_id":"I","consent":true}
- **Validation.** Require affirmative consent and unexpired own image; validate provider output.
- **Persistence.** Read image and private bytes; no automatic report change.
- **Success payload.** `200 {"category":"streetlight","severity":"medium","description":"Lamp housing appears damaged.","needs_review":true}`
- **Quota and operation errors.** 5/hour; 422,429,503.

### candidates · `POST /api/reports/candidates`

- **Caller and purpose.** Citizen. Used by Duplicate cards.
- **Request.** {"category":"streetlight","latitude":12.0,"longitude":77.0}
- **Validation.** Validate coordinates and category; same category, active, public, listed, ≤100 m; return max five, coarse distance bands.
- **Persistence.** Read reports with bounded prefilter then Haversine.
- **Success payload.** `200 {"items":[{"id":"R","category":"streetlight","distance_band":"within 100 m"}]}`
- **Quota and operation errors.** 10/min; 422.

### create · `POST /api/reports`

- **Caller and purpose.** Citizen. Used by Intake review.
- **Request.** {"submission_key":"K","image_id":"I","title":"Broken path light","publication":"public","confirmed_separate_from_ids":[],"category":"streetlight","description":"Lamp fails after sunset","latitude":12.0,"longitude":77.0}
- **Validation.** Validate owned intake, title, publication choice, position and text. At P1 recheck candidates; return 409 with new matches unless the user confirmed separate filing. Identical key and payload replay original; changed payload conflicts.
- **Persistence.** Transaction inserts reports and initial author vote, binds image, appends created history, optionally routes.
- **Success payload.** `201 {"id":"R","reference":"CP-1042","status":"pending","version":1}`
- **Quota and operation errors.** 10/hour; 409,422; replay 200.

### list · `GET /api/reports`

- **Caller and purpose.** Public for community view; otherwise signed in; staff view requires officer or admin. Used by Map, dashboard, search, queue.
- **Request.** Query view=mine, supported, community or staff; optional id,status,category,department_id,bbox,sort,cursor,limit,overdue
- **Validation.** Default view mine (visitors must request community), limit 20 max 50. bbox west,south,east,north. Staff-only sort=priority and overdue=true. Validate cursor against filters.
- **Persistence.** Query scoped reports and counts; filter approximate peer points. Compute score for staff when requested.
- **Success payload.** `200 {"items":[{"id":"R","category":"streetlight","status":"pending","latitude":12.0,"longitude":77.0}],"next_cursor":null}`
- **Quota and operation errors.** 60/min; 403,422.

### detail · `GET /api/reports/:id`

- **Caller and purpose.** Author, scoped staff or visitor viewing a public, listed case. Used by Citizen and staff detail.
- **Request.** Path report UUID
- **Validation.** Check visibility and return role-specific DTO.
- **Persistence.** Read reports, history, images and vote count; authorize private media per read.
- **Success payload.** `200 {"id":"R","status":"pending","version":1,"history":[{"version":1,"event_type":"created","to_status":"pending"}],"images":[]}`
- **Quota and operation errors.** 60/min; 404.

### upvote · `POST /api/reports/:id/upvote`

- **Caller and purpose.** Citizen. Used by Support button.
- **Request.** Empty body
- **Validation.** Visible active canonical issue; bind voter to session. Repeated vote returns existing state.
- **Persistence.** Insert report_votes on unique key, return count.
- **Success payload.** `200 {"supported":true,"votes":2}`
- **Quota and operation errors.** 20/hour; 404,409.

### status · `PATCH /api/reports/:id/status`

- **Caller and purpose.** Scoped staff for work; author for verification. Used by Transition and verification dialogs.
- **Request.** {"version":1,"status":"in_progress"}; note required on resolve, optional evidence_image_id on resolve
- **Validation.** pending → in_progress → resolved by staff; resolved → verified by author. Resolution note 10–1000 chars. Evidence must be staged for this report and uploader.
- **Persistence.** Lock report, check version, attach optional evidence and append event.
- **Success payload.** `200 {"id":"R","status":"in_progress","version":2}`
- **Quota and operation errors.** 30/hour; 403,409,422.

### assign · `POST /api/admin/assign`

- **Caller and purpose.** Admin. Used by Assignment selector.
- **Request.** {"report_id":"R","department_id":"D","version":1}
- **Validation.** Active department and active canonical report.
- **Persistence.** Update department and version, append assignment event in transaction.
- **Success payload.** `200 {"id":"R","department_id":"D","version":2}`
- **Quota and operation errors.** 30/hour; 403,409,422.

### departments · `GET /api/departments`

- **Caller and purpose.** Signed in. Used by Department management, assignment.
- **Request.** No parameters
- **Validation.** Only active catalog; no staff roster.
- **Persistence.** Read departments ordered by name.
- **Success payload.** `200 {"items":[{"id":"D","code":"lighting","name":"Campus lighting"}]}`
- **Quota and operation errors.** 60/min; 401.

### severity · `PATCH /api/reports/:id/severity`

- **Caller and purpose.** Scoped staff. Used by Severity and hazard review.
- **Request.** {"version":1,"severity":"critical","reason":"Fixture visibly unstable","acknowledge":false}
- **Validation.** Allowed severity, reason 10–1000 chars; acknowledgment requires critical review. Reset acknowledgment when newly critical.
- **Persistence.** Update severity and critical_ack_at, append review event.
- **Success payload.** `200 {"id":"R","severity":"critical","critical_ack_at":null,"version":2}`
- **Quota and operation errors.** 30/hour; 403,409,422.

### reopen · `POST /api/reports/:id/reopen`

- **Caller and purpose.** Source author. Used by Reopen dialog.
- **Request.** {"reason":"Lamp still fails after sunset","version":3}
- **Validation.** Resolved or verified, unique pending review; reason 10–1000 chars.
- **Persistence.** Insert reopen_requests, append event and increment version.
- **Success payload.** `201 {"request_id":"Q","state":"pending","version":4}`
- **Quota and operation errors.** 5/hour; 409,422.

### review reopen · `PATCH /api/admin/reopen/:id`

- **Caller and purpose.** Admin. Used by Staff review.
- **Request.** {"decision":"approved","reason":"Follow-up visit needed","version":4}
- **Validation.** Request pending, report at version; allow approved or denied.
- **Persistence.** Update review, append event; approval changes status to in_progress.
- **Success payload.** `200 {"request_id":"Q","state":"approved","status":"in_progress","version":5}`
- **Quota and operation errors.** 30/hour; 403,409,422.

### duplicate nomination · `POST /api/reports/:id/duplicate`

- **Caller and purpose.** Source author. Used by Compare and nominate.
- **Request.** {"target_id":"T","version":1}
- **Validation.** Distinct active source and target, visible target, same category within 100 m; user explicitly confirms.
- **Persistence.** Insert duplicate_requests, append event on source.
- **Success payload.** `201 {"request_id":"Q","state":"pending","version":2}`
- **Quota and operation errors.** 5/hour; 409,422.

### duplicate · `PATCH /api/admin/duplicates/:id`

- **Caller and purpose.** Admin. Used by Duplicate review.
- **Request.** {"decision":"approved","source_version":2,"target_version":1}
- **Validation.** Revalidate both versions, author nomination, distance and no cycle; approved or denied.
- **Persistence.** Close duplicate_requests, set source duplicate_of on approval and append source event.
- **Success payload.** `200 {"request_id":"Q","state":"approved","duplicate_of":"T","version":3}`
- **Quota and operation errors.** 30/hour; 403,409,422.

### moderate · `PATCH /api/admin/reports/:id/visibility`

- **Caller and purpose.** Admin. Used by Moderation dialog.
- **Request.** {"visibility":"hidden","reason":"Identifying details visible","version":1}
- **Validation.** Allow listed or hidden, reason 10–1000 chars.
- **Persistence.** Update reports, append moderation_events and safe history event.
- **Success payload.** `200 {"id":"R","visibility":"hidden","version":2}`
- **Quota and operation errors.** 30/hour; 403,409,422.

### analytics · `GET /api/admin/analytics`

- **Caller and purpose.** Admin. Used by Analytics and heatmap.
- **Request.** Query from,to as UTC dates; optional department_id
- **Validation.** Half-open interval max 90 days. Suppress heat cells with fewer than five cases.
- **Persistence.** Aggregate reports created in interval and resolution history; group by department.
- **Success payload.** `200 {"created":1,"resolved":0,"median_hours":null,"heat_cells":[]}`
- **Quota and operation errors.** 10/min; 403,422.

### export · `GET /api/admin/export`

- **Caller and purpose.** Admin. Used by Export button.
- **Request.** Query from,to and optional department_id
- **Validation.** Same period and scope as analytics, aggregate-only, neutralize spreadsheet formulas.
- **Persistence.** Read grouped counts and generate CSV attachment.
- **Success payload.** `200 department_code,created_count followed by lighting,1 on its own line`
- **Quota and operation errors.** 3/hour; 403,422.

### inbox · `GET /api/notifications`

- **Caller and purpose.** Signed-in recipient. Used by Notification list.
- **Request.** Query cursor and limit (1–50, default 20)
- **Validation.** Scope recipient to session.
- **Persistence.** Read notifications ordered by created_at and id.
- **Success payload.** `200 {"items":[{"id":"N","history_id":"H","read_at":null}],"next_cursor":null}`
- **Quota and operation errors.** 60/min; 422.

### mark read · `PATCH /api/notifications/:id`

- **Caller and purpose.** Recipient. Used by Inbox row.
- **Request.** {"read":true}
- **Validation.** Only own notice, idempotently set first read time.
- **Persistence.** Update notifications.read_at if null.
- **Success payload.** `200 {"id":"N","read":true}`
- **Quota and operation errors.** 30/min; 404,422.

### preferences · `PATCH /api/preferences`

- **Caller and purpose.** Own authenticated account. Used by Profile settings.
- **Request.** {"locale":"en","enhanced_readability":true}
- **Validation.** Allow only supported locale and boolean; reject protected properties.
- **Persistence.** Update own profiles preference columns.
- **Success payload.** `200 {"locale":"en","enhanced_readability":true}`
- **Quota and operation errors.** 10/hour; 422.

## Read models and pagination

List item minimum fields: id UUID, reference text, category enum, status enum, latitude and longitude numbers (approximate in peer view). Staff and author projections also include version, created_at, updated_at, severity and nullable department_id. Staff priority rows include integer severity_points, community_points, waiting_points, score and critical review state. The default order is newest creation first, then id; priority order is critical first, then score descending, oldest first, then id. Cursor encodes filter set, sort values and final id. An absent next_cursor signals the last page. Re-read changing priority queues on refresh.

Detail adds ordered safe history (version, event_type, to_status, created_at), vote count, canonical reference when visible and an array of authorized images (id, purpose, short-lived signed URL). Include original description, exact location and authorized notes only for author and responsible staff. Omit internal moderation reasons from author timeline. Include pending review IDs and versions for authorized reviewers. Never serialize raw repository rows.

Creation retry compares normalized payload including title, publication choice and image ID against the original committed intake, performs replay lookup before staged-image checks and returns the original receipt. Retain immutable creation inputs in the created event's private changes data for comparison. Never expose this snapshot to peers. See [schema](09-DATABASE-DESIGN.md) and [acceptance tests](15-TESTING-STRATEGY.md).
