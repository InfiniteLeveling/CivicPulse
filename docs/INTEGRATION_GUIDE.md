# Connecting the frontend to CivicPulse

## Phase 18 Administrative Analytics Engine, Performance KPIs & Workload Analytics

Before implementing administrative analytics dashboards, charts, and operational views, consult the developer guides:
1. [ADMIN_ANALYTICS_CONTRACT.md](ADMIN_ANALYTICS_CONTRACT.md): Integration contract for `GET /api/admin/analytics/overview`, `trends`, `categories`, `departments`, `performance`, `priorities`, query parameter definitions, and response schemas.
2. [ANALYTICS_ARCHITECTURE.md](ANALYTICS_ARCHITECTURE.md): Architectural design, PostgreSQL Stored Procedures, continuous zero-filled time-series pattern, composite indexing, and dual execution strategy.
3. [ANALYTICS_METRICS_DICTIONARY.md](ANALYTICS_METRICS_DICTIONARY.md): Authoritative mathematical formulas, division-by-zero handling, and operational definitions for all metrics.
4. [ANALYTICS_SECURITY.md](ANALYTICS_SECURITY.md): Threat model, RBAC policies, parameter tampering rejection, and data privacy safeguards.
5. [PHASE18_VERIFICATION_REPORT.md](PHASE18_VERIFICATION_REPORT.md): Verification report confirming all mathematical properties, endpoint integrations, and automated tests.
6. [REALTIME_CONTRACT.md](REALTIME_CONTRACT.md): Integration contract for Supabase Realtime Private Broadcast (`report:<id>`, `reports:public`), event types (`status_changed`, `department_changed`, `resolution_completed`, `report_created`), payload schema, and React hook example.
2. [REALTIME_ARCHITECTURE.md](REALTIME_ARCHITECTURE.md): Architectural design, sequence diagram, decoupled signaling pattern, and failure recovery.
3. [REALTIME_SECURITY.md](REALTIME_SECURITY.md): Threat model, channel authorization policies on `realtime.messages`, anti-spoofing lockout, and data minimization.
4. [RESOLUTION_EVIDENCE_CONTRACT.md](RESOLUTION_EVIDENCE_CONTRACT.md): Contract for admin resolution evidence upload (`POST /api/admin/reports/:id/resolution-evidence`), mandatory evidence resolution (`PATCH /api/reports/:id/status`), before/after evidence retrieval (`GET /api/reports/:id/evidence`), and comparison display guidelines.
5. [RESOLUTION_EVIDENCE_SECURITY.md](RESOLUTION_EVIDENCE_SECURITY.md): Defense-in-depth security model, path isolation, atomic RPC guarantees, and direct database bypass prevention trigger.
6. [MAP_API_CONTRACT.md](MAP_API_CONTRACT.md): Contract for `GET /api/reports/map`, Leaflet viewport bounds calculation, antimeridian handling, marker fields, and debouncing.
7. [MAP_QUERY_ARCHITECTURE.md](MAP_QUERY_ARCHITECTURE.md): Database spatial query architecture, over-fetching strategy, partial spatial indexing, and coordinate conventions.
8. [MAP_SECURITY.md](MAP_SECURITY.md): Location privacy, anti-scraping viewport bounds, PostgREST filter injection defense, and RLS enforcement.
9. [AUTO_ROUTING_CONTRACT.md](AUTO_ROUTING_CONTRACT.md): Integration contract for automatic category-to-department routing, manual override precedence, routing retry endpoint (`POST /api/admin/route`), and frontend UI guidelines.
10. [AUTO_ROUTING_ARCHITECTURE.md](AUTO_ROUTING_ARCHITECTURE.md): Architectural design, concurrency model, transactional audit events, dynamic entity resolution, and idempotent backfill.
11. [AUTO_ROUTING_SECURITY.md](AUTO_ROUTING_SECURITY.md): Security analysis, RPC guards, anti-spoofing of system audit records, and RLS defense-in-depth.
12. [PRIORITY_SCORING_CONTRACT.md](PRIORITY_SCORING_CONTRACT.md): Contract for `GET /api/reports/:id/priority`, canonical formula, severity points, community support points, age points, sorting tie-breakers, and React Query hook example.
13. [PRIORITY_ENGINE_SECURITY.md](PRIORITY_ENGINE_SECURITY.md): Security architecture, anti-tampering defenses, RLS, column protection, voter privacy, and concurrency guarantees.
14. [PRIORITY_ENGINE_ARCHITECTURE.md](PRIORITY_ENGINE_ARCHITECTURE.md): Technical architecture blueprint, hybrid model rationale, lifecycle triggers, and index optimization.
15. [COMMUNITY_SUPPORT_CONTRACT.md](COMMUNITY_SUPPORT_CONTRACT.md): Contract for `POST /api/reports/:id/upvote` and `GET /api/reports/:id/support`, optimistic UI updates, One-User-One-Vote enforcement, duplicate advisory integration, and error handling.
16. [COMMUNITY_SUPPORT_SECURITY.md](COMMUNITY_SUPPORT_SECURITY.md): Security architecture, RLS data privacy guarantees, voter anonymity, anti-enumeration, and database constraints.
17. [DUPLICATE_DETECTION_CONTRACT.md](DUPLICATE_DETECTION_CONTRACT.md): Contract for `POST /api/reports/check-duplicates`, Haversine 100-meter proximity matching, category filtering, advisory notice rendering, and citizen override workflow.
18. [DUPLICATE_DETECTION_SECURITY.md](DUPLICATE_DETECTION_SECURITY.md): Security architecture, RLS compatibility, location privacy guarantees, and anti-enumeration protections.
19. [AI_CLASSIFICATION_CONTRACT.md](AI_CLASSIFICATION_CONTRACT.md): Contract for `POST /api/ai/classify`, multimodal image analysis, smart suggestions (title, description, category, severity, department), consent requirements, and fallback handling.
20. [AI_ARCHITECTURE.md](AI_ARCHITECTURE.md): Architecture of Google Gemini integration, `@google/genai` SDK, tenant isolation, and prompt injection defenses.
21. [FRONTEND_BACKEND_HANDOFF.md](FRONTEND_BACKEND_HANDOFF.md): Master developer guide for connecting the frontend to all backend APIs, authentication flows, storage uploads, report queries, administrative department assignment, status timeline tracking, and live subscriptions.
22. [PHASE10_INTEGRATION_REPORT.md](PHASE10_INTEGRATION_REPORT.md): Complete backend integration verification report covering endpoints, sequence traces, database consistency, and security regression results.
23. [DEPARTMENT_ASSIGNMENT_CONTRACT.md](DEPARTMENT_ASSIGNMENT_CONTRACT.md): Contract for `GET /api/departments` and `POST /api/admin/assign`.
24: [STATUS_WORKFLOW_CONTRACT.md](STATUS_WORKFLOW_CONTRACT.md): Contract for `PATCH /api/reports/:id/status` and `GET /api/reports/:id/history`.
25. [REPORT_RETRIEVAL_CONTRACT.md](REPORT_RETRIEVAL_CONTRACT.md): Query parameters, sorting, pagination, and data projection for `GET /api/reports` and `GET /api/reports/:id`.
26. [REPORT_CREATION_CONTRACT.md](REPORT_CREATION_CONTRACT.md): Full endpoint contract for `POST /api/reports`.
27. [UPLOAD_CONTRACT.md](UPLOAD_CONTRACT.md): Upload endpoint requests, responses, and draft image storage paths.
28. [AUTH_INTEGRATION_GUIDE.md](AUTH_INTEGRATION_GUIDE.md): Client authentication and session management.

### Key Integration Points for Frontend
- **Administrative Analytics Dashboard (`/admin/analytics`)**: Call `GET /api/admin/analytics/overview`, `trends`, `categories`, `departments`, `performance`, and `priorities`. Returns server-aggregated operational metrics, continuous zero-filled time-series, canonical category breakdowns, active department workloads, and turnaround statistics. Requires administrator session.
- **Live Realtime Tracking (`report:<id>`)**: Subscribe to private broadcast channel on report detail page. On `status_changed`, `department_changed`, or `resolution_completed`, invalidate React Query caches to trigger authorized refetch. On reconnect, refetch `GET /api/reports/:id`.
- **Admin Resolution Workflow (`POST /api/admin/reports/:id/resolution-evidence` & `PATCH /api/reports/:id/status`)**: To resolve an `in_progress` complaint, admins upload an after-repair photo, receive a `storage_path`, then submit the resolution with `after_image_path`. Missing evidence is rejected with 422 `VALIDATION_ERROR`.
- **Before/After Evidence Retrieval (`GET /api/reports/:id/evidence`)**: Fetches citizen original before images and administrator after images with short-lived signed URLs and truthful attribution notice.
- **Interactive Map Viewport Queries (`GET /api/reports/map`)**: Call on Leaflet `moveend` with `south`, `west`, `north`, `east`. Returns lightweight map markers within the bounding box with `has_more` overflow indicator. Supports antimeridian crossing (`west > east`), category, status, severity, and department filtering.
- **Automatic Department Routing (`POST /api/reports` & `POST /api/admin/route`)**: Mapped categories (`pothole`, `garbage`, `water_leakage`, `streetlight`, `drainage`, `damaged_infrastructure`) are automatically assigned to their respective departments at creation time with `assignment_source: "automatic"`. The category `other` remains unassigned (`department_id: null`) for manual staff review.
- **Manual Administrator Override Precedence**: Any assignment or unassignment executed by an administrator via `POST /api/admin/assign` sets `manual_override: true`. Automatic routing respects this flag and will never overwrite human administrative decisions.
- **Priority Scoring & Queue Ranking (`GET /api/reports/:id/priority` & `sort=priority_high`)**: Fetches transparent 0–100 priority breakdown (`severity_points`, `support_points`, `age_points`). Use `sort=priority_high` in feeds and admin queues to return the globally highest-priority unresolved complaints first.
- **Community Upvoting & Support (`POST /api/reports/:id/upvote` & `GET /api/reports/:id/support`)**: Allows citizens to support existing complaints. Enforces One-User-One-Vote, self-voting prevention (HTTP 403), active status checks (`pending`, `in_progress`), and idempotent repeat voting (HTTP 200). Use in public feeds, detail pages, and duplicate advisory notice cards so citizens can upvote existing duplicates rather than filing new ones.
- **Duplicate Checking (`POST /api/reports/check-duplicates`)**: Call when a citizen selects coordinates and category. Server enforces 100-meter Haversine radius, active status filter (`pending`, `in_progress`), and returns up to 5 nearest matches. Strictly advisory: if matches exist, present a notice card allowing the citizen to view an existing report or proceed with new report creation.
- **Department Directory (`GET /api/departments`)**: Call to populate administrative assignment dropdowns and filter lists. Publicly accessible; returns `id`, `name`, `description`.
- **Complaint Assignment (`POST /api/admin/assign`)**: Call to assign or reassign a complaint to a department. Supply `report_id`, `department_id`, optional `expected_department_id` (null if expecting unassigned), and optional `reason`. Requires verified admin account. On HTTP 409 conflict, notify administrator and refetch.
- **Public Feed (`/dashboard`, `/map`)**: Call `GET /api/reports?page=1&limit=20`. Filter by `category`, `status`, `severity`, `sort` (`newest`, `oldest`, `priority_high`, `priority_low`), or `search`. Returns safe public fields including assigned department (`id`, `name`).
- **Personal Complaints (`/my-reports`)**: Call `GET /api/reports?mine=true&page=1&limit=20`. Returns citizen's own complaints with complete status, assigned department, and image metadata. Requires active session.
- **Complaint Details (`/reports/[id]`)**: Call `GET /api/reports/:id`. Contextual: returns full details for owners/admins, safe public details for public complaints, and 404 for missing/private complaints. Includes assigned `department: { id, name }` or `null`.
- **Complaint Status Timeline (`/reports/[id]`)**: Call `GET /api/reports/:id/history`. Displays chronological progress milestones. Sensitive administrative remarks and actor UUIDs are omitted for public viewers and citizens, but included for admins.
- **Admin Status Actions (`/admin/complaints/[id]`)**: Call `PATCH /api/reports/:id/status` with `{ status, notes, expected_status }`.
- **Pagination Structure**: All list endpoints return `{ items, pagination: { page, limit, total, total_pages, has_next_page, has_previous_page } }`.

Use the existing public Supabase URL and publishable-key variables on both branches. Follow the [security contract](SECURITY_CONTRACT.md) for permitted fields, operations and error handling.

The frontend and Route Handlers run in one Next.js App Router application. After the reviewed backend foundation reaches the frontend branch through main, run `npm ci` and `npm run dev` from the repository root. Pages and API requests use the same origin, port and cookies.
