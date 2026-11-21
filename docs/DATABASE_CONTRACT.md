# Database contract for frontend and backend · Phase 02

Use this vocabulary within the shared Next.js app. SQL identifiers are snake_case. GET /api/health remains the only HTTP endpoint. The [access matrix](ACCESS_CONTROL_MATRIX.md) specifies the available database operations. The [frontend security contract](SECURITY_CONTRACT.md) defines safe projections and future error mapping.

## Intake and ownership

| Field | Future form and server contract |
|---|---|
| title, description | Required trimmed strings, 5–120 and 10–1000 characters. Validate on both client and server. SQL rejects surrounding whitespace. |
| category | Required exact value from the routing table below. Translate labels for display only. |
| latitude, longitude | Required finite point confirmed by reporter; latitude −90 to 90 and longitude −180 to 180 inclusive. Manual selection remains available. |
| image reference | Required for the future intake flow. Submit an opaque owner-bound upload handle; server validates ownership, expiry and media constraints before attaching. Clients never submit arbitrary storage paths/URLs. |
| submission_key | One UUID per intended submission. Reuse on retry. The future service must compare immutable input or a saved fingerprint before returning the original receipt for the same key. |
| publication | Optional public/private choice; private default. Administrative visibility defaults to listed. Both public and listed are needed for future community discovery. |
| Server-controlled fields | user_id comes from verified session. Server controls reference, severity (low/medium/high/critical, default medium), status, assignment, version, timestamps, score and role. |

| category | Intended pilot department; assignment service is future work |
|---|---|
| pothole | Road Maintenance |
| garbage | Sanitation |
| water_leakage | Water Supply |
| streetlight | Electrical |
| drainage | Drainage |
| damaged_infrastructure | Public Works |
| other | Unassigned for review |

**Workflow.** Roles are citizen and admin. Status values are pending, in_progress and resolved. Assignment changes nullable department_id independently. Resolution sets resolved_at; an approved reopen returns to in_progress and clears it. Verification and reopen requests need a later review model; neither adds a present status. PostgreSQL stores timestamptz instants; future HTTP responses should serialize ISO 8601 UTC timestamps. priority_score of zero is uncalculated. Phase 14 owns calculation, refresh strategy and ranking.

**Visibility.** Future public projections may expose the reference, category, status, rounded point and aggregate support after scope checks. Private fields include names, user IDs, actor IDs, exact coordinates, user-entered text, storage paths, notes and private images. Keep email in Auth. A user may see their own details; staff reads require server authorization. Public-facing dates or event labels require an explicit safe projection.

**Support.** A report may have the author's initial support once. Additional support is for visible, public, unresolved reports; enforcement belongs to future authorized writes. Count report_votes rows; a duplicate pair is a retry to reconcile. If withdrawal is added, remove only the authenticated voter's eligible row and read the derived count again.

**Images.** The database represents attached metadata only. Map upload purpose intake to before and evidence to after. Phase 05 must implement a private staging object plus owner-, purpose- and expiry-bound handle (or a separate staging relation), verify it on attachment and clean up orphans. Create report_images metadata only with a valid report_id. Validate signatures, size, metadata removal and signed read access in storage/service work. No storage bucket exists in this phase.

## Planned API coverage

| Future operation | Storage dependency and boundary |
|---|---|
| POST /api/reports; GET /api/reports and /api/reports/:id | reports, scoped projections, departments, ordered status_history, vote totals and authorized images. Atomically create intake and initial history. |
| POST /api/upload; POST /api/ai/classify | Private staging in Phase 05; optional later AI analysis of an authorized handle. Neither route exists yet. |
| Duplicate preview | The numbered API spec calls this POST /api/reports/candidates; the Phase 02 brief calls it /api/reports/check-duplicates. Treat the latter as a proposed name pending joint review. Do not wire either path into production UI yet. Both designs use category/status/coordinate filtering. |
| POST /api/reports/:id/upvote | Unique (report_id,user_id) behind the authenticated write. |
| PATCH /api/reports/:id/status; POST /api/admin/assign | Admin-authorized transaction using expected report version, history and nullable department. |
| GET /api/admin/analytics | Authorized, bounded aggregates from reports and status_history. No analytics endpoint or view yet. |

Use the shared ApiResponse envelope. Expect validation errors for bounds/enum violations, a conflict on stale revisions or changed retry payloads, 401 on expired identity, 403 for unauthorized operations and 404 for unavailable records. The API will translate database errors into safe codes; avoid displaying SQLSTATE, raw constraints or provider errors to users. None of these prospective operations is unlocked merely by applying the migration.

## Changes from design proposals

The new brief adds damaged_infrastructure, retains the three-state lifecycle, and limits initial staff access to admin. Use user_id and full_name in storage; votes use a UUID id plus a unique report/user pair. Nullable staged report_images and dynamic-only priority in earlier proposals are superseded by required attachment and a bounded stored score. Historical design examples referring to officer, verified or other column names are planning records. Preserve account identity, exact location and image privacy throughout integration. Recheck branch tips and share this contract with frontend via the reviewed backend-to-main PR.
