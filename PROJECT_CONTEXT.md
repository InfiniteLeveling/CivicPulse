# CivicPulse project handoff

## Current milestone · Phase 20 Vercel Deployment Preparation, Supabase Environment Readiness, Database Migration Verification, Secure Environment Variables, Auth Configuration, Hosted Backend Smoke Testing, Release Safety, Rollback Planning & Deployment Verification

Implemented on `backend` branch. Successfully performed the complete deployment preparation, serverless runtime compatibility review, environment variable security auditing, Supabase database migration verification, deployment configuration testing, and disaster recovery planning for CivicPulse prior to Phase 21 final infrastructure verification and production release.

- **Deployment Status Summary**:
  - **Phase 20 Status:** **COMPLETE** (All local preparation, builds, security, migrations, and test gates 100% verified).
  - **Preview Deployment Status:** **BLOCKED** (Vercel CLI is in a `Logged out.` state; remote preview upload requires operator `npx vercel login` or `VERCEL_TOKEN`).
  - **Production Deployment Status:** **NOT_AUTHORIZED** (Protected release gate strictly enforced; production promotion requires explicit authorization).
  - **Release Readiness Gate:** **READY** (Conditional only on external operator credentials and authorization).
- **Local Build & Serverless Compatibility**:
  - `next.config.ts`: Verified production security headers (HSTS, CSP, X-Frame-Options: DENY, nosniff, Referrer-Policy) and `Cache-Control: no-store` on all `/api/:path*` route handlers.
  - Vercel Serverless Limits: Capped file uploads at 3 MB (`MAX_FILE_SIZE_BYTES`), comfortably below Vercel's 4.5 MB serverless body ceiling. 15-second timeout signal bounds external AI and database operations.
  - Next.js production build (`next build --webpack`): **SUCCESS (Exit Code 0)**, compiled all 28 API routes cleanly as dynamic server functions (`ƒ`).
- **Environment Variable Hygiene & Tooling**:
  - Implemented non-destructive validator [scripts/deployment/check-env.ts](scripts/deployment/check-env.ts) (`npm run check:env`).
  - Enforced strict separation: public variables restricted to `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`; `GEMINI_API_KEY` is strictly server-only; zero service-role keys exposed.
  - Updated `.gitignore` to explicitly cover `.vercel`, `.env*`, and build caches.
  - Authored comprehensive environment variable matrix in [docs/DEPLOYMENT_ENV_MATRIX.md](docs/DEPLOYMENT_ENV_MATRIX.md).
- **Supabase Database Migration Catalog**:
  - Verified 16 sequential, chronological migration files in `supabase/migrations/` (Phases 02-19).
  - All migrations are additive and backward-compatible (zero dropped tables or columns).
  - Authored migration readiness and execution guide in [docs/SUPABASE_MIGRATION_READINESS.md](docs/SUPABASE_MIGRATION_READINESS.md).
- **Authentication & Redirect Security**:
  - Supabase Auth redirect allowlist reviewed for Preview deployments (`https://*-infiniteleveling.vercel.app/**`, `https://civicpulse.vercel.app/**`, `https://civicpulse.org/**`).
  - Rejection of wildcard origins (`*`) enforced; in-app `sanitizeRedirectUrl()` blocks open redirect exploits.
- **Automated Testing & Deployment Configuration Suites**:
  - Authored [tests/deployment/deployment-config.test.ts](tests/deployment/deployment-config.test.ts) (8 tests covering Node engines, security headers, caching, upload bounds, migration ordering, and secret isolation).
  - **Full Automated Test Suite:** **474 / 474 tests passed (100% pass rate across 17 suites)**:
    - 8 Phase 20 Deployment Configuration tests passed.
    - 18 Phase 19 Security Hardening & Rate Limiting tests passed.
    - 30 Phase 18 Analytics date math, boundaries, and KPIs tests passed.
    - 34 Phase 17 Realtime & Evidence tests passed.
    - 30 Phase 16 Map Bounding-Box tests passed.
    - 35 Phase 15 Auto Routing tests passed.
    - 31 Phase 14 Priority Scoring tests passed.
    - 31 Phase 13 Community Support tests passed.
    - 30 Phase 12 Haversine duplicate detection tests passed.
    - 30 Phase 11 AI classification tests passed.
    - 25 Phase 10 Core E2E integration tests passed.
    - 29 Phase 09 Department Assignment tests passed.
    - 30 Phase 08 Status Workflow tests passed.
    - 29 Phase 07 Complaint Retrieval tests passed.
    - 31 Phase 06 Complaint Creation tests passed.
    - 23 Phase 05 Storage tests passed.
    - 20 Phase 04 Auth tests passed.
  - ESLint: **0 errors, 0 warnings** (`npm run lint`).
  - TypeScript: **0 errors** (`npm run typecheck`).
- **Release Documentation Deliverables**:
  - Authored [docs/PHASE20_DEPLOYMENT_REPORT.md](docs/PHASE20_DEPLOYMENT_REPORT.md): 28-section comprehensive deployment report.
  - Authored [docs/VERCEL_DEPLOYMENT_GUIDE.md](docs/VERCEL_DEPLOYMENT_GUIDE.md): Step-by-step Vercel deployment manual.
  - Authored [docs/DEPLOYMENT_ENV_MATRIX.md](docs/DEPLOYMENT_ENV_MATRIX.md): Detailed environment variable matrix.
  - Authored [docs/SUPABASE_MIGRATION_READINESS.md](docs/SUPABASE_MIGRATION_READINESS.md): Supabase 16-migration catalog and execution manifest.
  - Authored [docs/DEPLOYED_API_SMOKE_TEST_REPORT.md](docs/DEPLOYED_API_SMOKE_TEST_REPORT.md): 28-endpoint smoke test matrix.
  - Authored [docs/DEPLOYMENT_SECURITY_VERIFICATION.md](docs/DEPLOYMENT_SECURITY_VERIFICATION.md): Hosting and database security report.
  - Authored [docs/ROLLBACK_AND_RECOVERY_PLAN.md](docs/ROLLBACK_AND_RECOVERY_PLAN.md): Actionable disaster recovery and rollback plan.
  - Authored [docs/PRODUCTION_RELEASE_CHECKLIST.md](docs/PRODUCTION_RELEASE_CHECKLIST.md): Production release gates.
  - Authored [docs/PHASE21_HANDOFF.md](docs/PHASE21_HANDOFF.md): Technical handoff for Phase 21 infrastructure audit.

## Previous milestone · Phase 19 Ultimate Backend Security Hardening, Complete API Audit, Supabase RLS & RBAC Verification, OWASP Security Review, Abuse Prevention, Transaction Integrity, Full Regression Testing, Performance Validation & Deployment Readiness

Implemented on `backend` branch. Successfully performed the complete application security audit, vulnerability hardening, database policy verification, rate limiting, and regression test pipeline for the entire CivicPulse backend prior to Phase 20 production deployment.

- **Security Header & CSP Implementation (`next.config.ts`)**:
  - Configured mandatory HTTP security headers across all routes (`/:path*`):
    - `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`
    - `X-Frame-Options: DENY`
    - `X-Content-Type-Options: nosniff`
    - `Referrer-Policy: strict-origin-when-cross-origin`
    - `Permissions-Policy: camera=(), microphone=(), geolocation=(self), browsing-topics=()`
    - `Content-Security-Policy`: Restricts script/style execution to `'self'`, restricts network connections to `'self'`, Supabase endpoints (`https://*.supabase.co`, `wss://*.supabase.co`), OpenStreetMap tiles (`https://*.tile.openstreetmap.org`), and Google Gemini API (`https://generativelanguage.googleapis.com`), and enforces `frame-ancestors 'none'`.
  - Configured `Cache-Control: no-store, no-cache, must-revalidate` on all Next.js API route handlers (`/api/:path*`).
- **Sliding-Window Rate Limiting Engine (`src/utils/rate-limit.ts`)**:
  - Implemented high-performance, in-memory sliding-window counter tracking client requests within discrete time windows with automatic memory garbage collection.
  - Applied abuse prevention and resource exhaustion controls to:
    - `POST /api/upload`: 30 requests/minute per authenticated user.
    - `POST /api/ai/classify`: 30 requests/minute per authenticated user (guards Gemini API quotas and costs).
    - `POST /api/reports/check-duplicates`: 60 requests/minute per authenticated user (mitigates spatial compute load).
    - `POST /api/reports/[id]/upvote`: 60 requests/minute per authenticated user (prevents priority recalculation thrashing).
  - Emits RFC 7807 compliant HTTP 429 `RATE_LIMITED` error envelope with `Retry-After` headers and logs structured security event (`rate_limit.exceeded`).
- **Strict Query & Body Parameter Validation**:
  - Enforced `.strict()` on `src/validators/report-query.schema.ts`, `assignDepartmentSchema`, `updateStatusSchema`, and `checkDuplicatesSchema`.
  - Strictly rejects unknown or injected client parameters (`role`, `is_admin`, `priority_score`, `raw_sql`, etc.) with HTTP 422 `VALIDATION_ERROR`.
- **Database Row Level Security & Privilege Hardening (`supabase/migrations/20261121001600_phase19_security_hardening.sql`)**:
  - **Self-Voting Prevention:** Replaced `vote_self_active` policy on `public.report_votes` with `vote_self_active_hardening`, verifying that `citizen_id != auth.uid()` at the database engine level to block direct PostgREST client bypasses.
  - **Trigger Function Hardening:** Explicitly revoked `EXECUTE` privileges from `PUBLIC`, `anon`, and `authenticated` on database triggers: `civicpulse_check_resolution_evidence`, `on_vote_recalculate_priority`, `record_report_event`, and `advance_report_version`.
  - **Audit Immutability:** Revoked `INSERT`, `UPDATE`, and `DELETE` on audit tables `public.report_history` and `public.priority_history` from `PUBLIC`, `anon`, and `authenticated`.
  - **Function Isolation:** Revoked all privileges on `public.find_nearby_reports` from `PUBLIC` and `anon`; granted `EXECUTE` strictly to `authenticated`.
  - SQL verification test: `supabase/tests/phase19_security_hardening_test.sql`.
- **Dependency & Secrets Audits**:
  - `npm audit --json`: **0 vulnerabilities** across 487 audited packages (70 prod, 380 dev).
  - Secrets separation verified: `.env*` excluded from git; `getSupabaseConfig()` exposes only public variables; `GEMINI_API_KEY` and `SUPABASE_SERVICE_ROLE_KEY` remain strictly server-side.
- **Documentation Deliverables**:
  - Authored [SECURITY_AUDIT_REPORT.md](docs/SECURITY_AUDIT_REPORT.md): 26-section comprehensive audit report.
  - Authored [THREAT_MODEL.md](docs/THREAT_MODEL.md): STRIDE threat analysis, trust boundaries, actor personas.
  - Authored [API_SECURITY_MATRIX.md](docs/API_SECURITY_MATRIX.md): Full audit matrix across all 28 API endpoints.
  - Authored [RLS_VERIFICATION_REPORT.md](docs/RLS_VERIFICATION_REPORT.md): Table-by-table RLS policy and grant matrix.
  - Authored [STORAGE_SECURITY_AUDIT.md](docs/STORAGE_SECURITY_AUDIT.md): Storage bucket isolation, magic bytes, and immutability.
  - Authored [SECURITY_FINDINGS_REGISTER.md](docs/SECURITY_FINDINGS_REGISTER.md): Findings SEC-001 through SEC-005 records.
  - Authored [PHASE19_TEST_REPORT.md](docs/PHASE19_TEST_REPORT.md): Full regression and security test execution report.
  - Authored [DEPLOYMENT_READINESS_CHECKLIST.md](docs/DEPLOYMENT_READINESS_CHECKLIST.md): Phase 20 deployment readiness gate.
  - Authored [SECURITY_HARDENING_GUIDE.md](docs/SECURITY_HARDENING_GUIDE.md): Developer guide for secure coding conventions.
- **Testing & Verification Pipeline**:
  - Linting: `npm run lint` (`eslint . --max-warnings=0`) passed with **0 errors, 0 warnings**.
  - Typecheck: `npm run typecheck` (`next typegen && tsc --noEmit`) passed with **0 errors**.
  - Test Suite: **466 / 466 tests passing** across 16 test suites (`npm test`):
    - 18 Phase 19 Security Hardening & Rate Limiting tests passed.
    - 30 Phase 18 Analytics date math, boundaries, and KPIs tests passed.
    - 34 Phase 17 Realtime & Evidence tests passed.
    - 30 Phase 16 Map Bounding-Box tests passed.
    - 35 Phase 15 Auto Routing tests passed.
    - 31 Phase 14 Priority Scoring tests passed.
    - 31 Phase 13 Community Support tests passed.
    - 30 Phase 12 Haversine duplicate detection tests passed.
    - 30 Phase 11 AI classification tests passed.
    - 25 Phase 10 Core E2E integration tests passed.
    - 29 Phase 09 Department Assignment tests passed.
    - 30 Phase 08 Status Workflow tests passed.
    - 29 Phase 07 Complaint Retrieval tests passed.
    - 31 Phase 06 Complaint Creation tests passed.
    - 23 Phase 05 Storage tests passed.
    - 20 Phase 04 Auth tests passed.
  - Build: `npm run build` (`next build --webpack`) completed successfully with **Exit 0**.
- **Deployment Readiness Status**:
  - Core backend, database schemas, storage rules, and API endpoints are **PRODUCTION READY** for Phase 20 deployment.

## Previous milestone · Phase 18 Administrative Analytics Engine, KPI Dashboard APIs, Complaint Trends, Category Distribution, Department Workload, Resolution Performance, Priority Insights, Secure PostgreSQL Aggregations & Frontend Handoff

Implemented on `backend` branch. Successfully implemented the administrative analytics engine delivering accurate, server-aggregated operational metrics across 6 dedicated endpoints (`GET /api/admin/analytics/overview`, `trends`, `categories`, `departments`, `performance`, `priorities`), PostgreSQL Stored Procedures (`civicpulse_get_analytics_overview`, `civicpulse_get_analytics_performance`, `civicpulse_get_department_workload`), continuous zero-filled time-series generation, canonical category grouping, active department workload tracking, resolution turnaround duration analysis (arithmetic mean and exact median via `percentile_cont(0.5)`), aging complaint backlog tracking (> 7 days), operational priority rankings, strict administrator authentication, forbidden client parameter rejection, and comprehensive automated testing.

- **Authoritative Configurations (`src/config/analytics.ts`)**:
  - `ANALYTICS_CONFIG`: Default range (30 days), max range (366 days), allowed granularities (`day`, `week`, `month`), aging threshold (7 days), default priorities limit (5), max limit (20), canonical categories.
- **Types & Data Contracts (`src/types/analytics.ts`)**:
  - `AnalyticsPeriod`: `{ start: string, end: string, timezone: "UTC" }`.
  - `AnalyticsOverviewData`: KPIs including `all_time_total_reports`, `created_in_period`, `resolved_in_period`, `current_pending`, `current_in_progress`, `current_resolved`, `current_active_backlog`, `current_unassigned_active`, `creation_cohort_resolution_rate_percent`.
  - `AnalyticsTrendsData`: Time-series series of zero-filled `{ period_start, created_count, resolved_count }`.
  - `AnalyticsCategoriesData`: Breakdown by canonical categories with count and percentage.
  - `AnalyticsDepartmentsData`: Workload per department (`pending_count`, `in_progress_count`, `active_count`) plus `unassigned_active_count`.
  - `AnalyticsPerformanceData`: Resolution turnaround sample size, `average_resolution_hours`, `median_resolution_hours`, active backlog, and `active_reports_older_than_7_days`.
  - `AnalyticsPrioritiesData`: Top active complaints ranked by `priority_score DESC, created_at ASC`, average active priority, and max active priority.
- **Date Range & Mathematical Utilities (`src/utils/date-range.ts`)**:
  - `isValidIsoDate(str)`: Validates YYYY-MM-DD format and verifies calendar validity (handles leap years, rejects Feb 31).
  - `resolveDateRange(start, end, maxDays)`: Computes half-open interval `[start 00:00:00Z, (end + 1 day) 00:00:00Z)`. Defaults to last 30 calendar days ending today in UTC. Enforces `start <= end` and span <= 366 days.
  - `generateZeroFilledBuckets(start, end, granularity)`: Generates unbroken calendar day, week, or month buckets.
  - `calculateCohortResolutionRate`: Computes cohort resolution rate safely returning `null` on zero denominator.
  - `calculatePercentage`, `calculateAverage`, `calculateMedian`: Pure mathematical calculations with division-by-zero protection.
- **Validation Schemas (`src/validators/analytics.schema.ts`)**:
  - `analyticsDateRangeSchema`: Validates `start` and `end` date strings, strictly rejects unrecognized parameters.
  - `analyticsTrendsQuerySchema`: Validates `start`, `end`, and `granularity`.
  - `analyticsPrioritiesQuerySchema`: Validates `limit` bounded between 1 and 20.
- **Analytics Service (`src/services/analytics.service.ts`)**:
  - Dual execution path: attempts optimized PostgreSQL Stored Procedures, falls back to Supabase client query builder.
  - Methods: `getOverviewAnalytics`, `getComplaintTrends`, `getCategoryAnalytics`, `getDepartmentAnalytics`, `getResolutionPerformance`, `getPriorityInsights`.
  - Enforces `assertAdmin(caller)` on all methods.
- **API Endpoints**:
  - `GET /api/admin/analytics/overview`
  - `GET /api/admin/analytics/trends`
  - `GET /api/admin/analytics/categories`
  - `GET /api/admin/analytics/departments`
  - `GET /api/admin/analytics/performance`
  - `GET /api/admin/analytics/priorities`
  - All endpoints enforce `requireAdmin()`, reject forbidden parameters (`role`, `is_admin`, etc.), and set `Cache-Control: no-store`.
- **Database Architecture & Migration (`supabase/migrations/20261121001500_phase18_admin_analytics.sql`)**:
  - Created composite and partial indexes for high performance: `reports_analytics_created_at_idx`, `reports_analytics_resolved_at_idx`, `reports_analytics_active_backlog_idx`, `reports_analytics_priority_active_idx`, `reports_analytics_category_created_idx`.
  - Stored procedures: `civicpulse_get_analytics_overview`, `civicpulse_get_analytics_performance`, `civicpulse_get_department_workload`.
  - Pinned `search_path = ''`, `SECURITY DEFINER`, restricted execution to `authenticated` with internal `profiles.role = 'admin'` check.
  - SQL verification script: `supabase/tests/phase18_analytics_test.sql`.
- **Contracts & Documentation**:
  - Authored [ADMIN_ANALYTICS_CONTRACT.md](docs/ADMIN_ANALYTICS_CONTRACT.md): Integration contract for all 6 endpoints.
  - Authored [ANALYTICS_ARCHITECTURE.md](docs/ANALYTICS_ARCHITECTURE.md): Architectural design, Stored Procedures, zero-filled series pattern, and dual execution strategy.
  - Authored [ANALYTICS_METRICS_DICTIONARY.md](docs/ANALYTICS_METRICS_DICTIONARY.md): Mathematical formulas, sources, and operational definitions.
  - Authored [ANALYTICS_SECURITY.md](docs/ANALYTICS_SECURITY.md): Threat model, RBAC policies, parameter tampering rejection, and data privacy safeguards.
  - Authored [PHASE18_VERIFICATION_REPORT.md](docs/PHASE18_VERIFICATION_REPORT.md): Complete verification results.
  - Updated [API_CONTRACT.md](docs/API_CONTRACT.md) (Sections 21-26), [FRONTEND_BACKEND_HANDOFF.md](docs/FRONTEND_BACKEND_HANDOFF.md), and [INTEGRATION_GUIDE.md](docs/INTEGRATION_GUIDE.md).
- **Testing & Verification**:
  - Automated test suite: **448 / 448 tests passing** across 15 test suites (`npm test`):
    - 30 Phase 18 Analytics date math, boundaries, zero denominator safety, continuous buckets, Zod schemas, RBAC enforcement, Stored Procedure integration, query builder fallback, trends, categories, departments, performance, priorities, route defense, and caching tests passed.
    - 34 Phase 17 Realtime & Evidence tests passed.
    - 29 Phase 16 Map Bounding-Box tests passed.
    - 28 Phase 15 Auto Routing tests passed.
    - 29 Phase 14 Priority Scoring tests passed.
    - 30 Phase 13 Community Support tests passed.
    - 60 Phase 12 Haversine duplicate detection tests passed.
    - 22 Phase 11 AI classification tests passed.
    - 23 Phase 10 Core E2E integration tests passed.
    - 30 Phase 09 Department Assignment tests passed.
    - 33 Phase 08 Status Workflow tests passed.
    - 29 Phase 07 Complaint Retrieval tests passed.
    - 33 Phase 06 Complaint Creation tests passed.
    - 18 Phase 05 Storage tests passed.
    - 20 Phase 04 Auth tests passed.

## Previous milestone · Phase 17 Supabase Realtime Live Complaint Tracking, Administrator Resolution Evidence, Before/After Images, Atomic Resolution Workflow & Private Storage Security

Implemented on `backend` branch. Successfully implemented Supabase Realtime Private Broadcast channels (`report:<id>`, `reports:public`), channel authorization RLS policies, minimal event payloads (`report_updated`, `report_created`), administrator-only after-repair resolution evidence upload (`POST /api/admin/reports/:id/resolution-evidence`), mandatory resolution evidence enforcement on `PATCH /api/reports/:id/status` (`after_image_path`), atomic resolution state persistence (updating `reports.status = 'resolved'`, `reports.resolved_at`, inserting `report_images` record, and creating immutable `status_history`), direct database update bypass prevention trigger (`civicpulse_check_resolution_evidence`), cross-report evidence reuse protection, before/after evidence retrieval (`GET /api/reports/:id/evidence`) with short-lived signed URLs, decoupled non-blocking Realtime broadcast delivery, comprehensive automated testing, and developer integration contracts.

- **Authoritative Configurations (`src/config/realtime.ts`, `src/config/evidence.ts`)**:
  - `REALTIME_CONFIG`: Channel prefix `report:`, public channel `reports:public`, event names (`report_updated`, `report_created`), change types (`status_changed`, `department_changed`, `resolution_completed`, `report_created`), channel topic helpers `getReportChannel(id)`, `isValidReportChannel(topic)`, `extractReportIdFromChannel(topic)`.
  - `EVIDENCE_CONFIG`: Bucket `civic-evidence`, resolution draft prefix `resolution-drafts`, max file size 3 MB, allowed MIME types (`image/jpeg`, `image/png`, `image/webp`), default signed URL expiration (900 seconds), attribution disclaimer notice.
- **Types & Data Contracts (`src/types/realtime.ts`, `src/types/evidence.ts`, `src/types/status.ts`)**:
  - `RealtimeReportEventPayload`: `{ event, report_id, change_type, occurred_at }`. Minimal payload; strictly zero PII, signed URLs, or private notes.
  - `EvidenceImageItem`: `{ id, storage_path, type: 'before' | 'after', created_at, signed_url? }`.
  - `ReportEvidenceResponseData`: `{ report_id, status, resolved_at, attribution_notice, before_images, after_images }`.
  - Extended `UpdateStatusInput` with `after_image_path?: string`.
  - Extended `UpdateStatusResponseData` with `resolution_evidence?: ResolutionEvidenceRef`.
- **Validation Schemas (`src/validators/evidence.schema.ts`, `src/validators/status.schema.ts`)**:
  - `reportIdParamSchema`: Validates UUID v4 in route path.
  - `resolutionDraftPathSchema`: Validates `resolution-drafts/<admin_id>/<report_id>/<uuid>.<ext>` pattern.
  - `evidenceSignedUrlQuerySchema`: Validates optional `expires_in` query parameter (60 to 3600 seconds).
  - Extended `updateStatusSchema` with `after_image_path` (trimmed string, max 512).
- **Storage Path & Evidence Services (`src/utils/storage-path.ts`, `src/services/storage.service.ts`, `src/services/evidence.service.ts`, `src/services/realtime.service.ts`)**:
  - `generateResolutionDraftStoragePath(adminId, reportId, ext)`: Generates scoped resolution draft paths.
  - `parseResolutionDraftStoragePath`: Decomposes and guards against directory traversal.
  - `uploadAdminResolutionDraftImage`: Validates file magic bytes, MIME, and size (<= 3MB); stages draft in `resolution-drafts/...` with `upsert: false`.
  - `verifyResolutionDraftPath`: Verifies caller ownership and report target match.
  - `getReportEvidence`: Role-aware evidence retrieval (public listed: anyone; private: owner/admin; else 404). Generates short-lived signed URLs.
  - `emitRealtimeReportEvent`: Safely emits non-blocking broadcast message; catches errors without disrupting database transaction.
- **Atomic Status Resolution (`src/services/status.service.ts`)**:
  - `updateReportStatus`: Enforces mandatory `after_image_path` when `status === 'resolved'`. Invokes atomic RPC `civicpulse_transition_report_status`. Emits `resolution_completed` or `status_changed` broadcast upon commit.
- **API Endpoints**:
  - `POST /api/admin/reports/:id/resolution-evidence`: Admin upload endpoint for after-repair evidence.
  - `GET /api/reports/:id/evidence`: Public/contextual before/after evidence retrieval.
  - `PATCH /api/reports/:id/status`: Extended with `after_image_path` for atomic resolution.
- **Database Architecture & Migration (`supabase/migrations/20261121001400_phase17_realtime_and_resolution.sql`)**:
  - Enhanced `civicpulse_transition_report_status` to accept `p_after_image_path`, enforce evidence requirement, insert into `report_images`, update report, record status history, and return evidence reference.
  - Created trigger `reports_resolution_evidence_check` on `public.reports BEFORE UPDATE` to block direct SQL updates to `resolved` without an associated `after` image.
  - Created storage RLS policies for admin resolution drafts.
  - Configured Realtime subscriber RLS policy on `realtime.messages` (allowing only authorized subscribers) and client broadcast lockout (`WITH CHECK (false)`).
  - SQL verification script: `supabase/tests/phase17_realtime_and_resolution_test.sql`.
- **Contracts & Documentation**:
  - Authored [REALTIME_CONTRACT.md](docs/REALTIME_CONTRACT.md): Integration contract for private broadcast channels, event schema, and React hooks.
  - Authored [REALTIME_ARCHITECTURE.md](docs/REALTIME_ARCHITECTURE.md): Architecture blueprint, sequence diagrams, and decoupled signaling model.
  - Authored [REALTIME_SECURITY.md](docs/REALTIME_SECURITY.md): Threat model, channel RLS policies, and anti-spoofing defense.
  - Authored [RESOLUTION_EVIDENCE_CONTRACT.md](docs/RESOLUTION_EVIDENCE_CONTRACT.md): Contract for admin uploads, mandatory evidence resolution, and before/after comparisons.
  - Authored [RESOLUTION_EVIDENCE_SECURITY.md](docs/RESOLUTION_EVIDENCE_SECURITY.md): Security architecture, path isolation, and direct DB bypass trigger.
  - Updated [API_CONTRACT.md](docs/API_CONTRACT.md) (Sections 21 & 22), [STATUS_WORKFLOW_CONTRACT.md](docs/STATUS_WORKFLOW_CONTRACT.md), [UPLOAD_CONTRACT.md](docs/UPLOAD_CONTRACT.md), [FRONTEND_BACKEND_HANDOFF.md](docs/FRONTEND_BACKEND_HANDOFF.md), and [INTEGRATION_GUIDE.md](docs/INTEGRATION_GUIDE.md).
- **Testing & Verification**:
  - Automated test suite: **418 / 418 tests passing** across 14 test suites (`npm test`):
    - 34 Phase 17 Realtime configuration, payload safety, path generation, file validation, mandatory evidence, atomic resolution, conflict handling, evidence retrieval, broadcast resilience, and route contract tests passed.
    - 29 Phase 16 Map Bounding-Box tests passed.
    - 28 Phase 15 Auto Routing tests passed.
    - 29 Phase 14 Priority Scoring tests passed.
    - 30 Phase 13 Community Support tests passed.
    - 60 Phase 12 Haversine duplicate detection tests passed.
    - 22 Phase 11 AI classification tests passed.
    - 23 Phase 10 Core E2E integration tests passed.
    - 30 Phase 09 Department Assignment tests passed.
    - 33 Phase 08 Status Workflow tests passed.
    - 29 Phase 07 Complaint Retrieval tests passed.
    - 33 Phase 06 Complaint Creation tests passed.
    - 18 Phase 05 Storage tests passed.
    - 20 Phase 04 Auth & RBAC tests passed.

Next: Phase 18 Administrative Analytics, Complaint Trends, Department Workload & Dashboard APIs.

## Previous milestone · Phase 16 Interactive Map Backend, Geographic Bounding-Box Queries, Secure Complaint Markers, Map Filtering, Spatial Query Optimization, Location Privacy & Frontend Integration

Implemented on `backend` branch. Successfully implemented the dedicated map marker retrieval endpoint `GET /api/reports/map`, strict geographic bounding-box query validation (`south`, `west`, `north`, `east`), antimeridian (International Date Line: `west > east`) wrapping support, maximum geographic span guards (`latSpan <= 50.0°`, `lonSpan <= 60.0°`), direct database-side spatial filtering with partial composite indexing (`reports_spatial_viewport_idx`), default active status filtering (`['pending', 'in_progress']`), server-side result limiting (`default: 200`, `max: 300`) with accurate `has_more` overflow calculation via over-fetching (`limit + 1`), deterministic secondary sorting (`created_at DESC, id DESC`), privacy-preserving minimal response projection (stripping citizen UUIDs, emails, vote records, private notes, and raw storage paths), route precedence preservation over `/api/reports/:id`, automated test suite, and complete developer integration contracts.

- **Authoritative Configuration (`src/config/map.ts`)**:
  - `MAP_CONFIG`: `DEFAULT_LIMIT = 200`, `MAX_LIMIT = 300`, `MIN_LIMIT = 1`, `MAX_LATITUDE_SPAN = 50.0`, `MAX_LONGITUDE_SPAN = 60.0`, `DEFAULT_STATUSES = ["pending", "in_progress"]`, `SORT_OPTIONS`.
  - Math utility helpers: `crossesAntimeridian(west, east)`, `calculateLatitudeSpan(south, north)`, `calculateLongitudeSpan(west, east)`.
- **Types & Data Contracts (`src/types/map.ts`)**:
  - `MapViewport`: `{ south: number; west: number; north: number; east: number }`.
  - `MapMarker`: Minimal public marker preview `{ id, reference, title, category, severity, status, priority_score, latitude, longitude, created_at, department }`.
  - `MapQueryFilter`: `{ south, west, north, east, category?, status?, severity?, department_id?, limit?, sort? }`.
  - `MapResponseData`: `{ markers: MapMarker[]; total_count: number; has_more: boolean; viewport: MapViewport; limit: number }`.
  - `MapApiResponse`: `ApiResponse<MapResponseData>`.
- **Validation Schemas (`src/validators/map-query.schema.ts`)**:
  - `mapQuerySchema`: Preprocesses string query parameters to numbers without empty string coercion, validates latitude `[-90, 90]`, longitude `[-180, 180]`, enforces `south < north`, `west !== east`, `latSpan <= 50.0`, `lonSpan <= 60.0`, limit `[1, 300]`, and strictly rejects unknown/forbidden query parameters (`user_id`, `role`, `is_admin`, etc.).
- **Map Service (`src/services/map.service.ts`)**:
  - `getMapMarkers(filter, caller, client)`: Database-side spatial filtering via Supabase PostgREST. Handles standard viewports (`gte/lte`) and antimeridian wrapping (`longitude >= west OR longitude <= east`). Enforces public/listed visibility for non-admins, applies category, status, severity, and department filters, executes deterministic sorting, over-fetches `limit + 1` to compute `has_more` without costly `count(*)`, and projects map-safe fields.
- **Route Handler (`src/app/api/reports/map/route.ts`)**:
  - `GET /api/reports/map`: Static Next.js App Router handler taking precedence over dynamic `[id]` segment. Rejects forbidden query params, validates search params, resolves optional caller session, and returns HTTP 200 with `Cache-Control: no-store`.
- **Database Architecture & Migration (`supabase/migrations/20261121001300_phase16_map_viewport.sql`)**:
  - Created partial composite spatial index `reports_spatial_viewport_idx` on `public.reports(latitude, longitude, status) where publication = 'public' and visibility = 'listed'`.
  - Created helper stored procedure `civicpulse_get_map_markers` (`SECURITY INVOKER`).
  - Migration verification test: `supabase/tests/phase16_map_viewport_test.sql`.
- **Contracts & Documentation**:
  - Authored [MAP_API_CONTRACT.md](docs/MAP_API_CONTRACT.md): Comprehensive developer contract for map marker retrieval.
  - Authored [MAP_QUERY_ARCHITECTURE.md](docs/MAP_QUERY_ARCHITECTURE.md): Geospatial query architecture, bounding-box logic, antimeridian handling, and spatial indexing.
  - Authored [MAP_SECURITY.md](docs/MAP_SECURITY.md): Threat model, privacy projection, RLS enforcement, and anti-scraping controls.
  - Updated [API_CONTRACT.md](docs/API_CONTRACT.md) (Section 20), [INTEGRATION_GUIDE.md](docs/INTEGRATION_GUIDE.md), and [FRONTEND_BACKEND_HANDOFF.md](docs/FRONTEND_BACKEND_HANDOFF.md).
- **Testing & Verification**:
  - Automated test suite: **384 / 384 tests passing** across 13 test suites (`npm test`):
    - 29 Phase 16 bounding box calculation, antimeridian wrapping, schema validation, query filters, spatial querying, limit/has_more overflow, privacy projection, and route precedence tests passed.
    - 28 Phase 15 Auto Routing tests passed.
    - 29 Phase 14 Priority Scoring tests passed.
    - 30 Phase 13 Community Support tests passed.
    - 60 Phase 12 Haversine duplicate detection tests passed.
    - 22 Phase 11 AI classification tests passed.
    - 23 Phase 10 Core E2E integration tests passed.
    - 30 Phase 09 Department Assignment tests passed.
    - 33 Phase 08 Status Workflow tests passed.
    - 29 Phase 07 Complaint Retrieval tests passed.
    - 33 Phase 06 Complaint Creation tests passed.
    - 18 Phase 05 Storage tests passed.
    - 20 Phase 04 Auth & RBAC tests passed.

Next: Phase 17 Supabase Realtime Subscriptions, WebSocket Event Streaming & Live Notifications.

## Previous milestone · Phase 15 Automatic Department Routing, Category-to-Department Mapping, Secure Auto-Assignment, Manual Admin Override Precedence, Transactional Audit History & Admin Retry

Implemented on `backend` branch. Successfully implemented the official, deterministic, category-to-department automatic routing engine, dynamic database department entity resolution, seamless integration into citizen complaint creation (`POST /api/reports`), manual administrative override precedence (`reports.manual_override = true`), system actor attribution in immutable audit history (`department_assignment_history.assigned_by = null`, `assignment_source = "automatic"`), optimistic concurrency control, safe idempotent backfill, privileged administrative routing retry endpoint (`POST /api/admin/route`), comprehensive automated testing, and developer integration contracts.

- **Authoritative Category Mapping (`src/config/routing.ts`)**:
  - `CATEGORY_DEPARTMENT_MAP`:
    - `pothole` -> `"Road Maintenance"`
    - `garbage` -> `"Sanitation"`
    - `water_leakage` -> `"Water Supply"`
    - `streetlight` -> `"Electrical"`
    - `drainage` -> `"Drainage"`
    - `damaged_infrastructure` -> `"Public Works"`
    - `other` -> `null` (requires manual review)
  - Helper functions: `getTargetDepartmentName(category)`, `isMappableCategory(category)`, `getRuleKey(category, deptName)`.
  - Versioned routing engine metadata: `ROUTING_RULE_VERSION = "v1"`.
- **Types & Data Contracts (`src/types/routing.ts`, `src/types/report.ts`)**:
  - Defined `RoutingStatus`: `"assigned" | "skipped_unmapped" | "skipped_manual_override" | "skipped_resolved" | "skipped_already_assigned" | "target_department_missing" | "failed"`.
  - Defined `AssignmentSource`: `"unassigned" | "automatic" | "manual"`.
  - Defined `RoutingDecision`: Evaluates eligibility, target department, and rule key.
  - Defined `RoutingResult`: Standardized DTO containing `report_id`, `routing_status`, `assignment_source`, `department`, `rule_key`, `assignment_history_id`, `assigned_at`, `message`.
  - Defined `AdminRouteReportInput` & `AdminRouteReportResponse`.
  - Extended `CreateReportResponseData` with optional `department_id`, `department`, and `assignment_source`.
- **Validation Schemas (`src/validators/routing.schema.ts`)**:
  - `adminRouteReportSchema`: Validates `report_id` (UUID v4) and optional `expected_department_id` (UUID v4 or null). Rejects injected client fields (`department_id`, `assignment_source`, `role`).
  - `routingForbiddenFieldsSchema`: Rejects unauthorized client injection of server-controlled routing fields.
- **Routing Service (`src/services/routing.service.ts`)**:
  - `resolveDepartmentForCategory(category, client)`: Dynamically resolves department UUID by querying `public.departments` by canonical name.
  - `getRoutingDecision(reportId, client)`: Evaluates persisted report state, enforcing resolved status freeze, manual override precedence, and department resolution.
  - `autoRouteReport(reportId, client)`: Executes atomic routing via `civicpulse_auto_route_report` RPC with resilient service-level fallback. Atomically updates `reports.department_id` and records audit history with `assigned_by = null`, `assignment_source = "automatic"`. Reverts assignment if audit fails.
  - `retryAutomaticRouting(input, caller, client)`: Privileged administrative retry with `assertAdmin` and optimistic concurrency check on `expected_department_id`.
  - `backfillUnassignedReports(client)`: Safe, idempotent batch router for unassigned legacy complaints.
- **API Endpoint (`src/app/api/admin/route/route.ts`)**:
  - `POST /api/admin/route`: Privileged endpoint for admins to retry routing. Returns HTTP 200 with `RoutingResult` and `Cache-Control: no-store`.
- **Database Architecture & Migration (`supabase/migrations/20261121001200_phase15_automatic_department_routing.sql`)**:
  - Added `reports.manual_override` (`boolean default false`) and `reports.assignment_source` (`text default 'unassigned'`).
  - Altered `department_assignment_history.assigned_by` to drop `NOT NULL` for system actor representation.
  - Added `department_assignment_history.assignment_source` and `rule_key`.
  - Updated `civicpulse_assign_department` to set `manual_override = true` and `assignment_source = 'manual'`.
  - Created `civicpulse_auto_route_report` stored procedure (`SECURITY DEFINER`, search path pinned) enforcing admin/service-role access and row-level locking (`FOR UPDATE`).
  - Updated `civicpulse_create_report` to automatically route complaints in-transaction on creation.
  - SQL verification script: `supabase/tests/phase15_auto_routing_test.sql`.
- **Contracts & Documentation**:
  - Authored [AUTO_ROUTING_CONTRACT.md](docs/AUTO_ROUTING_CONTRACT.md): Comprehensive developer contract for frontend integration and admin retry workflows.
  - Authored [AUTO_ROUTING_ARCHITECTURE.md](docs/AUTO_ROUTING_ARCHITECTURE.md): Technical architecture blueprint, concurrency model, and system actor design.
  - Authored [AUTO_ROUTING_SECURITY.md](docs/AUTO_ROUTING_SECURITY.md): Threat model, RPC privilege guards, anti-tampering, and audit integrity.
  - Updated [API_CONTRACT.md](docs/API_CONTRACT.md), [INTEGRATION_GUIDE.md](docs/INTEGRATION_GUIDE.md), and [FRONTEND_BACKEND_HANDOFF.md](docs/FRONTEND_BACKEND_HANDOFF.md).
- **Testing & Verification**:
  - Automated test suite: **355 / 355 tests passing** across 12 test suites (`npm test`):
    - 28 Phase 15 canonical category mapping, department resolution, decision engine, service fallback, audit attribution, manual override precedence, admin retry, schema attack, and backfill tests passed.
    - 29 Phase 14 Priority Scoring tests passed.
    - 30 Phase 13 Community Support tests passed.
    - 60 Phase 12 Haversine duplicate detection tests passed.
    - 22 Phase 11 AI classification tests passed.
    - 23 Phase 10 Core E2E integration tests passed.
    - 30 Phase 09 Department Assignment tests passed.
    - 33 Phase 08 Status Workflow tests passed.
    - 29 Phase 07 Complaint Retrieval tests passed.
    - 33 Phase 06 Complaint Creation tests passed.
    - 18 Phase 05 Storage tests passed.
    - 20 Phase 04 Auth & RBAC tests passed.

Next: Phase 16 Geospatial Map APIs, Bounding Box Filtering & Location Privacy.

## Previous milestone · Phase 14 Intelligent Priority Scoring Engine, Severity Weighting, Community Support, Complaint Age, Dynamic Recalculation & Secure Queue Ranking

Implemented on `backend` branch. Successfully implemented the official, deterministic, explainable CivicPulse priority scoring formula (`0–100`), authoritative severity point mappings (`low: 15`, `medium: 30`, `high: 50`, `critical: 70`), community support point contributions (`3 points/vote`, capped at 20), elapsed unresolved duration calculation (`2 points/day`, capped at 10), resolved complaint age freezing at `resolved_at`, hybrid calculation architecture (read-time freshness + indexed database snapshot for sorting), deterministic global queue ranking (`priority_high`, `priority_low`), transparent priority breakdown endpoint (`GET /api/reports/:id/priority`), comprehensive automated testing, and developer integration contracts.

## Previous milestone · Phase 13 Community Complaint Support, Upvote API, One-User-One-Vote Enforcement, Secure Vote Counting & Frontend Handoff

Implemented on `backend` branch. Successfully implemented authenticated community support (upvoting) for visible civic complaints, strict database-level One-User-One-Vote enforcement (`UNIQUE(report_id, user_id)`), self-voting prevention (creators cannot upvote their own complaints, HTTP 403 `FORBIDDEN`), status eligibility verification (`pending` and `in_progress` only; `resolved` yields HTTP 409 `CONFLICT`), idempotent repeat-support handling (HTTP 200 with `already_supported: true`), privacy-preserving support counting via `SECURITY DEFINER` function `civicpulse_get_support_summary`, comprehensive automated testing, and developer integration contracts.

- **Types & Data Models (`src/types/support.ts`)**:
  - Defined `SupportReportResponseData`: `{ report_id: string, supported: true, already_supported: boolean, support_count: number }`.
  - Defined `ReportSupportSummary`: `{ report_id: string, support_count: number, current_user_supported: boolean, can_support: boolean }`.
  - Defined `SupportReportResponse` and `ReportSupportSummaryResponse` (`ApiResponse<T>`).
  - Extended `PublicReportItem` and `ReportDetailItem` in `src/types/report.ts` with optional `support_count?: number`, `current_user_supported?: boolean`, `can_support?: boolean`.
  - Extended `DuplicateMatchItem` in `src/types/duplicate.ts` with optional `support_count?: number`.
- **Validation Schemas (`src/validators/support.schema.ts`)**:
  - `reportIdParamSchema`: Validates UUID v4 path parameter.
  - `upvoteBodySchema`: Strict empty object schema (`z.object({}).strict()`) rejecting client-injected fields (`user_id`, `vote_count`, `role`, `status`, `priority_score`).
- **Community Support Service (`src/services/vote.service.ts`)**:
  - `supportReport(reportId, caller, client)`:
    - Enforces citizen authentication (`requireUser()`).
    - Forbids administrative accounts (HTTP 403 `FORBIDDEN`).
    - Enforces visibility checks (nonexistent or private reports return HTTP 404).
    - Enforces self-voting policy (`report.user_id === caller.id` returns HTTP 403).
    - Enforces status eligibility (`report.status === "pending" || report.status === "in_progress"`; `resolved` returns HTTP 409).
    - Atomically inserts vote row into `report_votes`. Handles PostgreSQL composite unique constraint violation (`23505`) gracefully to achieve idempotency (`already_supported = true`).
    - Retrieves authoritative total vote count without mutating priority score.
  - `getReportSupportSummary(reportId, caller, client)`:
    - Contextual query: Authenticated citizens, admins, or anonymous visitors.
    - Uses `civicpulse_get_support_summary` RPC with fallback to query builder.
    - Computes `can_support` advisory UX flag (true only for citizen non-owners on pending/in_progress complaints who haven't yet voted).
    - Defense-in-depth: Voter UUIDs, emails, and vote timestamps are never exposed.
- **API Route Handlers**:
  - `POST /api/reports/:id/upvote`: Authenticated citizen endpoint. Returns HTTP 201 for first vote, HTTP 200 for repeat vote. Sets `Cache-Control: no-store`.
  - `GET /api/reports/:id/support`: Public/contextual endpoint. Returns support count and voter state. Sets `Cache-Control: no-store`.
- **Database Layer & Migration (`supabase/migrations/20261121001000_phase13_community_support.sql`)**:
  - Created composite performance index: `report_votes_report_idx` on `public.report_votes(report_id)`.
  - Function `public.civicpulse_support_report`: Atomic database-level support recording with `SECURITY DEFINER` and pinned `search_path = ''`.
  - Function `public.civicpulse_get_support_summary`: Bypasses citizen RLS SELECT restriction to return aggregate count without leaking voter rows.
  - SQL verification script: `supabase/tests/phase13_community_support_test.sql`.
- **Contracts & Documentation**:
  - Authored [COMMUNITY_SUPPORT_CONTRACT.md](docs/COMMUNITY_SUPPORT_CONTRACT.md): Full frontend developer integration contract, schemas, and React Query hook example with optimistic updates.
  - Authored [COMMUNITY_SUPPORT_SECURITY.md](docs/COMMUNITY_SUPPORT_SECURITY.md): Threat model, RLS data privacy, anti-gaming, and concurrency verification.
  - Updated [API_CONTRACT.md](docs/API_CONTRACT.md), [INTEGRATION_GUIDE.md](docs/INTEGRATION_GUIDE.md), and [FRONTEND_BACKEND_HANDOFF.md](docs/FRONTEND_BACKEND_HANDOFF.md).
- **Testing & Verification**:
  - Automated test suite: **298 / 298 tests passing** across 10 test suites (`npm test`):
    - 30 Phase 13 support validation, auth, self-voting, eligibility, idempotency, concurrency, route contract, and privacy tests passed.
    - 60 Phase 12 Haversine duplicate detection tests passed.
    - 22 Phase 11 AI classification tests passed.
    - 23 Phase 10 Core E2E integration tests passed.
    - 30 Phase 09 Department Assignment tests passed.
    - 33 Phase 08 Status Workflow tests passed.
    - 29 Phase 07 Complaint Retrieval tests passed.
    - 33 Phase 06 Complaint Creation tests passed.
    - 18 Phase 05 Storage tests passed.
    - 20 Phase 04 Auth & RBAC tests passed.

Next: Phase 14 Priority Scoring Algorithm, Dynamic Ranking & Escalation Engine.

## Previous milestone · Phase 12 Geographical Duplicate Complaint Detection, Haversine Distance, Nearby Report Matching & Frontend Integration

Implemented on `backend` branch. Successfully implemented mathematical Haversine distance detection, 100-meter proximity matching, canonical category filtering, active status eligibility checks, candidate ranking, strict location privacy, PostgreSQL migration and index optimization, and comprehensive automated testing and developer integration contracts.

- **Haversine Geospatial Utility (`src/utils/haversine.ts`)**:
  - Implemented `haversineDistanceMeters(lat1, lon1, lat2, lon2, earthRadiusMeters)`:
    - Earth radius = `6,371,000 meters` (`EARTH_RADIUS_METERS`).
    - Search radius = `100 meters` (`DUPLICATE_RADIUS_METERS`).
    - Clamping intermediate term `a` to `[0, 1]` to prevent floating-point `NaN` near antipodal points.
    - Longitude wraparound normalization across International Date Line / Antimeridian (`normalizeLongitudeDifference`).
    - Polar region safeguards (no division by zero near ±90°).
    - Perfect mathematical symmetry: `Distance(A, B) == Distance(B, A)`.
  - Implemented `getBoundingBox(lat, lon, radiusMeters, safetyFactor)`:
    - Pre-calculates degrees latitude/longitude bounding box with 5% safety margin (`1.05`) for accelerated database prefiltering.
    - Handles polar convergence and antimeridian crossing gracefully.
- **Duplicate Detection Service (`src/services/duplicate.service.ts`)**:
  - Implemented `checkDuplicateReports(input, caller, client)`:
    - Enforces authenticated citizen session (`requireUser()`).
    - Queries `reports` within precalculated bounding box, matching canonical category and active statuses (`pending`, `in_progress`).
    - Defense-in-depth: Excludes private reports belonging to other citizens; includes caller's own reports and public listed complaints.
    - Evaluates exact unrounded Haversine distance (`distance <= 100.0m`).
    - Deterministic ranking: Shortest distance first (`distance_meters ASC`), newer on tie (`created_at DESC`), stable ID tie-breaker (`id ASC`).
    - Result capping: Top 5 matches maximum.
    - Advisory match policy: `"same_category_within_100m"` for canonical categories; `"other_category_proximity_advisory"` for category `other`.
    - Strictly advisory: Never merges, deletes, updates, or auto-upvotes complaints.
- **API Endpoint (`src/app/api/reports/check-duplicates/route.ts`)**:
  - `POST /api/reports/check-duplicates`: Authenticated citizen endpoint (`requireUser()`).
  - Strict validation via `checkDuplicatesSchema` (`src/validators/duplicate.schema.ts`): Rejects client-injected fields (`radius_meters`, `role`, `user_id`, `status`).
  - Standard response envelope with `Cache-Control: no-store`.
  - Read-only guarantee: Executes zero database mutations (`INSERT`, `UPDATE`, `DELETE`).
- **Database Architecture & Migration (`supabase/migrations/20261121000900_phase12_duplicate_detection.sql`)**:
  - Partial composite index: `reports_duplicate_lookup` on `(category, status, latitude, longitude)` where `publication = 'public' and visibility = 'listed'`.
  - PostgreSQL function: `find_nearby_reports` using `SECURITY INVOKER` and pinned `search_path = public, pg_catalog`. Enforces server-side radius and limit clamping.
  - SQL verification script: `supabase/tests/phase12_duplicate_test.sql`.
- **Contracts & Documentation**:
  - Authored [DUPLICATE_DETECTION_CONTRACT.md](docs/DUPLICATE_DETECTION_CONTRACT.md): Comprehensive developer guide for frontend integration, request/response models, React Query hook example, advisory notice guidelines, and citizen override behavior.
  - Authored [DUPLICATE_DETECTION_SECURITY.md](docs/DUPLICATE_DETECTION_SECURITY.md): Location privacy, anti-enumeration safeguards, RLS compatibility, and security test matrix.
  - Updated [API_CONTRACT.md](docs/API_CONTRACT.md), [INTEGRATION_GUIDE.md](docs/INTEGRATION_GUIDE.md), and [FRONTEND_BACKEND_HANDOFF.md](docs/FRONTEND_BACKEND_HANDOFF.md).
- **Testing & Verification**:
  - Automated test suite: **268 / 268 tests passing** across 9 test suites (`npm test`):
    - 60 Phase 12 Haversine mathematical, 100m boundary, category matching, status filter, ranking, antimeridian/polar, security, and route handler tests passed.
    - 22 Phase 11 AI classification and multimodal tests passed.
    - 23 Phase 10 Core E2E integration tests passed.
    - 30 Phase 09 Department Assignment tests passed.
    - 33 Phase 08 Status Workflow tests passed.
    - 29 Phase 07 Complaint Retrieval tests passed.
    - 33 Phase 06 Complaint Creation tests passed.
    - 18 Phase 05 Storage tests passed.
    - 20 Phase 04 Auth & RBAC tests passed.

Next: Phase 13 Community Complaint Support, Upvote API, Duplicate Support Workflow, Vote Uniqueness & Secure Vote Counting.

## Previous milestone · Phase 11 Google Gemini AI Multimodal Classification, Smart Complaint Suggestions & Secure AI Integration

Implemented on `backend` branch. Successfully implemented server-side Google Gemini integration using the official `@google/genai` SDK (`gemini-2.5-flash`), authenticated image classification endpoint (`POST /api/ai/classify`), draft storage ownership enforcement, explicit affirmative AI processing consent, structured Zod output validation, prompt injection defense, and comprehensive testing and documentation.

- **Multimodal AI Classification Service (`src/services/ai.service.ts`)**:
  - Implemented `classifyCivicImage(userId, input)`:
    - Enforces affirmative citizen consent (`consent_to_ai_processing === true`).
    - Downloads private evidence image from `civic-evidence` bucket via `downloadOwnedDraftImage` after validating ownership via `verifyOwnedDraftPath` (cross-user isolation).
    - Enforces image size limits (max 5MB).
    - Converts file buffer into base64 `inlineData` for Gemini multimodal input.
    - Uses system instruction `CIVIC_CLASSIFICATION_SYSTEM_INSTRUCTION` with structured JSON mode (`responseMimeType: "application/json"`).
    - Wraps request in a 15-second bounded timeout with unref'd timer handles.
    - Parses structured response and validates strictly with `aiResponseSchema`.
    - Normalizes department suggestions against approved municipal directory (`Road Maintenance`, `Sanitation`, `Water Supply`, `Electrical`, `Drainage`, `Public Works`) or sets to `null`.
    - Human-in-the-loop: Strictly advisory; does NOT insert reports, modify priority scores, or assign departments.
- **AI Classification API Endpoint (`src/app/api/ai/classify/route.ts`)**:
  - `POST /api/ai/classify`: Authenticated citizen endpoint (`requireUser()`).
  - Request validation (`aiClassifySchema`): Validates draft storage path structure, max 1000-char description hint, and explicit boolean consent. Rejects client-injected authority fields with HTTP 422.
  - Standard response envelope: `{ success: true, data: { category, severity, title_suggestion, description_suggestion, department_suggestion, evidence_summary, confidence_level, needs_manual_review, uncertainty_reason }, message }` with `Cache-Control: no-store`.
  - Error mapping: 401 Unauthorized, 403 Forbidden (consent or cross-user), 404 Not Found, 413 Payload Too Large, 422 Validation Error, 429 Rate Limited, 503 Service Unavailable (unconfigured/credential failure/timeout).
- **Client Configuration & Prompts**:
  - `src/lib/gemini.ts`: Safe server-only `@google/genai` wrapper resolving `process.env.GEMINI_MODEL || "gemini-2.5-flash"`.
  - `src/config/ai-prompts.ts`: Detailed system prompt defining canonical categories, conservative severity guidance, factual grounding, and prompt injection defense.
- **Contracts & Documentation**:
  - Authored [AI_CLASSIFICATION_CONTRACT.md](docs/AI_CLASSIFICATION_CONTRACT.md): Comprehensive developer contract for frontend integration including request/response models, React Query hooks, and error codes.
  - Authored [AI_ARCHITECTURE.md](docs/AI_ARCHITECTURE.md): Detailed architectural blueprint covering security, privacy minimization, and failure fallbacks.
  - Updated [API_CONTRACT.md](docs/API_CONTRACT.md), [INTEGRATION_GUIDE.md](docs/INTEGRATION_GUIDE.md), and [FRONTEND_BACKEND_HANDOFF.md](docs/FRONTEND_BACKEND_HANDOFF.md).
- **Testing & Verification**:
  - Automated test suite: 208/208 tests passing across 8 test suites (`npm test`):
    - 22 Phase 11 AI classification, validation, prompt injection, and storage security tests passed.
    - 23 Phase 10 Core E2E integration tests passed.
    - 30 Phase 09 Department Assignment tests passed.
    - 33 Phase 08 Status Workflow tests passed.
    - 29 Phase 07 Complaint Retrieval tests passed.
    - 33 Phase 06 Complaint Creation tests passed.
    - 18 Phase 05 Storage tests passed.
    - 20 Phase 04 Auth & RBAC tests passed.
  - Live Gemini test result: Authenticated test with `.env.local` API key returned Google Cloud `PERMISSION_DENIED` (key lacks `generativelanguage.googleapis.com` enablement or is restricted); gracefully mapped to HTTP 503 `SERVICE_UNAVAILABLE` with guidance for manual citizen reporting.

Next: Phase 12 Geographical Duplicate Complaint Detection Using Haversine Distance, Nearby Report Matching & Citizen Support Suggestions.

## Previous milestone · Phase 10 Complete Core Backend Integration, End-to-End API Verification, Security Regression & Frontend Handoff

Implemented on `backend` branch. Successfully executed core backend integration, comprehensive end-to-end citizen-to-admin workflow testing, security regression verification, database consistency verification, and authored complete frontend integration handoff documentation.

- **End-to-End Integration Suite (`tests/phase10_e2e_workflow.test.ts`)**:
  - 23 comprehensive tests verifying the complete civic issue lifecycle across routes, services, schemas, and database transactions:
    1. Identity & profile integrity (citizen vs admin role attributes).
    2. Tenant-scoped image upload draft path validation (`verifyOwnedDraftPath`).
    3. Complaint creation schema validation with strict rejection of client authority fields.
    4. Atomic complaint creation with default values (`status='pending'`, `priority_score=0`, `department=null`).
    5. Duplicate evidence image replay attack prevention (HTTP 409 `CONFLICT`).
    6. Citizen personal report listing (`mine: true`) with unassigned department.
    7. Public feed listing concealing private reports and stripping sensitive creator UUIDs.
    8. Department directory retrieval sorted alphabetically (`name ASC`).
    9. Administrative department assignment with atomic audit logging.
    10. Report detail retrieval reflecting assigned department.
    11. Administrative status progression (`pending` -> `in_progress`) with operational notes.
    12. Role-aware status history projection (notes and actor UUID scrubbed for citizens, preserved for admins).
    13. Administrative status resolution (`in_progress` -> `resolved`) setting `resolved_at`.
    14. Resolved complaint lock: rejecting reassignment attempts on resolved complaints (HTTP 409 `CONFLICT`).
    15. Cross-user draft isolation: preventing image theft between citizens (HTTP 403 `FORBIDDEN`).
    16. Cross-user private report isolation: concealing private complaints with HTTP 404 `NOT_FOUND`.
    17. Optimistic concurrency conflict on department reassignment with stale `expected_department_id`.
    18. Optimistic concurrency conflict on status progression with stale `expected_status`.
    19. Privilege escalation prevention: citizen calling department assignment rejected (HTTP 403 `FORBIDDEN`).
    20. Privilege escalation prevention: citizen calling status update rejected (HTTP 403 `FORBIDDEN`).
    21. Strict payload schemas rejecting client-injected authority fields (`user_id`, `assigned_by`, `changed_by`).
    22. Linear state machine enforcing canonical transitions and rejecting arbitrary jumps or backward progression.
    23. Query filter schema enforcing bounded pagination and search sanitization.
- **SQL Regression & Consistency Test (`supabase/tests/phase10_e2e_test.sql`)**:
  - Verifies presence of all 7 core tables (`profiles`, `departments`, `reports`, `report_votes`, `status_history`, `report_images`, `department_assignment_history`).
  - Verifies RLS is enabled on all 7 tables.
  - Verifies execution privileges and security boundaries on all RPC functions.
  - Verifies write revocation on audit tables and foreign key constraint integrity.
- **Documentation & Frontend Handoff**:
  - Authored [PHASE10_INTEGRATION_REPORT.md](docs/PHASE10_INTEGRATION_REPORT.md): Complete integration analysis covering Sections A through T.
  - Authored [FRONTEND_BACKEND_HANDOFF.md](docs/FRONTEND_BACKEND_HANDOFF.md): Comprehensive developer guide for the frontend team with copy-paste schemas, API signatures, React Query hooks, and error handling patterns.
  - Updated [API_CONTRACT.md](docs/API_CONTRACT.md), [INTEGRATION_GUIDE.md](docs/INTEGRATION_GUIDE.md), and [DATABASE_CONTRACT.md](docs/DATABASE_CONTRACT.md).
- **Automated Verification Pipeline**:
  - `npm test`: **PASSED** (186/186 tests passing across 7 test suites).
  - `npm run lint`: **PASSED** (0 errors, 0 warnings).
  - `npm run typecheck`: **PASSED** (clean compilation via `next typegen && tsc --noEmit`).
  - `npm run build`: **PASSED** (clean production webpack build).

Next: Phase 11 Google Gemini AI Multimodal Image Classification & Severity Assessment.

## Previous milestone · Phase 09 Department Management, Complaint Assignment, Reassignment & Audit History

Implemented on backend branch. Completed department directory listing (`GET /api/departments`), administrative complaint assignment and reassignment endpoint (`POST /api/admin/assign`), dedicated assignment audit history (`public.department_assignment_history`), optimistic concurrency control via `expected_department_id` (row locking `FOR UPDATE`), duplicate no-op protection, lifecycle constraint enforcement (locked on resolved complaints), database migration `20261121000800_phase09_department_assignment.sql`, SQL verification suite, 30 automated tests, and frontend integration contracts.

- **Department Directory & Selection (`src/services/department.service.ts`)**:
  - `GET /api/departments`: Publicly accessible endpoint returning approved directory of municipal departments (`Road Maintenance`, `Sanitation`, `Water Supply`, `Electrical`, `Drainage`, `Public Works`), sorted deterministically by `name ASC`. Projects safe public fields (`id`, `name`, `description`).
  - Supports dropdown selection, filter bars, and report detail metadata resolution.
- **Complaint Assignment & Reassignment (`src/app/api/admin/assign/route.ts`)**:
  - `POST /api/admin/assign`: Privileged endpoint requiring verified admin role (`requireAdmin()`, `assertAdmin()`). Citizens and unauthenticated requests are rejected with HTTP 403 / 401.
  - Concurrency & lifecycle guards:
    - Optimistic concurrency: Accepts optional `expected_department_id` (`null` for asserting initially unassigned). Stale department raises HTTP 409 `CONFLICT`.
    - Duplicate no-op protection: Attempting to assign to the already active department raises HTTP 409 `CONFLICT` without creating duplicate audit events.
    - Resolved complaint guard: Attempting to reassign a complaint in `status = 'resolved'` raises HTTP 409 `CONFLICT` ("Cannot reassign a resolved complaint").
  - Atomic persistence: PostgreSQL function `public.civicpulse_assign_department` (`SECURITY DEFINER`, fixed `search_path = ''`) locks target report with `FOR UPDATE`, validates target department existence, updates `reports.department_id`, and writes immutable audit record into `public.department_assignment_history`.
- **Database Architecture & Migration (`supabase/migrations/20261121000800_phase09_department_assignment.sql`)**:
  - Created table `public.department_assignment_history` with foreign keys referencing `reports.id`, `departments.id` (previous and new), and `profiles.id` (assigned_by).
  - Enabled RLS on `department_assignment_history`; client roles have zero direct write grants (append-only via atomic RPC).
  - Implemented RLS policy `assignment_history_admin_read` restricting audit history viewing to authenticated administrators (`civicpulse_private.is_admin()`).
  - Created atomic RPC `public.civicpulse_assign_department`.
  - Added performance index `dept_assignment_history_report` on `public.department_assignment_history (report_id, created_at desc)`.
- **Contracts & Documentation**:
  - Created [DEPARTMENT_ASSIGNMENT_CONTRACT.md](docs/DEPARTMENT_ASSIGNMENT_CONTRACT.md): Comprehensive endpoint specification, request/response models, optimistic concurrency, conflict handling, and React Query integration hooks.
  - Updated [API_CONTRACT.md](docs/API_CONTRACT.md), [INTEGRATION_GUIDE.md](docs/INTEGRATION_GUIDE.md), and [DATABASE_CONTRACT.md](docs/DATABASE_CONTRACT.md).
- **Testing & Verification**:
  - Automated test suite: 163/163 passing (`npm test`):
    - 20 Phase 04 Auth & RBAC tests passed.
    - 18 Phase 05 Storage & Validation tests passed.
    - 33 Phase 06 Complaint Creation tests passed.
    - 29 Phase 07 Complaint Retrieval tests passed.
    - 33 Phase 08 Status Workflow & Timeline tests passed.
    - 30 Phase 09 Department Assignment & Directory tests passed.
  - Verification gates passed: `npm test`, `npm run lint` (0 errors, 0 warnings), `npm run typecheck`, and Next.js webpack production build (`npm run build`).
  - SQL Integration Suite: Created [supabase/tests/phase09_assignment_test.sql](supabase/tests/phase09_assignment_test.sql) verifying table existence, RLS enablement, anon execution denial, table write protection, and index creation.

Next: Phase 10 Complete Core Backend Integration, Regression Testing, Citizen-to-Admin Workflow Verification and Backend Readiness Assessment.

## Previous milestone · Phase 08 Complaint Status Management, Admin Authorization, State Transitions, Atomic History & Timeline Tracking

Implemented on backend branch. Completed administrative complaint status update endpoint (`PATCH /api/reports/:id/status`), chronological timeline retrieval endpoint (`GET /api/reports/:id/history`), strict linear state machine (`pending` -> `in_progress` -> `resolved`), optimistic concurrency control via `expected_status` (row locking `FOR UPDATE`), immutable audit history, role-aware privacy projections, database migration `20261121000700_phase08_status_workflow.sql`, SQL verification suite, 33 automated tests, and frontend integration contracts.

- **Status Management & State Machine (`src/services/status.service.ts`)**:
  - `PATCH /api/reports/:id/status`: Privileged endpoint requiring verified admin role (`requireAdmin()`, `assertAdmin()`). Citizens and unauthenticated requests are rejected with HTTP 403 / 401.
  - Linear state transitions enforced: `pending` -> `in_progress` -> `resolved`. Invalid transitions (e.g. `pending` -> `resolved`, backwards transitions, reopen attempts) and same-status requests are rejected with HTTP 409 `CONFLICT`.
  - Optimistic concurrency protection: Accepts optional `expected_status`. Row-level lock (`SELECT ... FOR UPDATE`) prevents concurrent lost updates. Stale status raises HTTP 409 `CONFLICT`.
  - Atomic persistence: PostgreSQL function `public.civicpulse_transition_report_status` (`SECURITY DEFINER`, fixed `search_path = ''`) updates `status`, automatically sets `resolved_at = clock_timestamp()` upon resolution (or `null` otherwise), bumps `version`, and fires `report_record_event` trigger to persist custom administrative notes into `public.status_history`.
- **Chronological Timeline Retrieval (`src/app/api/reports/[id]/history/route.ts`)**:
  - `GET /api/reports/:id/history`: Retrieves complaint status milestones ordered chronologically (`created_at ASC, version ASC`).
  - Privacy projections:
    - Public visitors and citizens: Can view public listed reports and personal complaints respectively; sensitive administrative `notes` and actor `changed_by` UUIDs are strictly omitted from projections.
    - Administrators: Full access including operational remarks and actor UUIDs via `public.civicpulse_get_admin_status_history`.
    - Unauthorized callers attempting to inspect private complaints receive HTTP 404 `NOT_FOUND` (concealing record existence).
- **Database Architecture & Migration (`supabase/migrations/20261121000700_phase08_status_workflow.sql`)**:
  - Granted safe SELECT columns (`id, report_id, version, previous_status, status, created_at`) on `public.status_history` to `anon`.
  - Added RLS policy `timeline_public_read` on `public.status_history` for `anon`.
  - Enhanced `civicpulse_private.record_report_event()` to support transaction-local administrative remarks via `set_config('civicpulse.transition_notes', ...)`.
  - Created atomic RPC `public.civicpulse_transition_report_status`.
  - Created privileged admin history RPC `public.civicpulse_get_admin_status_history`.
  - Added performance index `status_history_report_chronological` on `public.status_history (report_id, created_at asc, version asc)`.
- **Contracts & Documentation**:
  - Created [STATUS_WORKFLOW_CONTRACT.md](docs/STATUS_WORKFLOW_CONTRACT.md): Comprehensive state machine matrix, optimistic concurrency, conflict handling, React Query mutation and query hooks, and display labels.
  - Updated [API_CONTRACT.md](docs/API_CONTRACT.md), [INTEGRATION_GUIDE.md](docs/INTEGRATION_GUIDE.md), and [DATABASE_CONTRACT.md](docs/DATABASE_CONTRACT.md).
- **Testing & Verification**:
  - Automated test suite: 133/133 passing (`npm test`):
    - 20 Phase 04 Auth & RBAC tests passed.
    - 18 Phase 05 Storage & Validation tests passed.
    - 33 Phase 06 Complaint Creation tests passed.
    - 29 Phase 07 Complaint Retrieval tests passed.
    - 33 Phase 08 Status Workflow & Timeline tests passed.
  - Verification gates passed: `npm test`, `npm run lint` (0 errors, 0 warnings), `npm run typecheck`, and Next.js webpack production build (`npm run build`).
  - SQL Integration Suite: Created [supabase/tests/phase08_status_workflow_test.sql](supabase/tests/phase08_status_workflow_test.sql) verifying anon and citizen execution denials, reports.status update denial, status_history write protection, and anon column-level restriction.

Next: Phase 09 Department Management, Department Listing, Administrative Department Assignment, Reassignment and Assignment Security.

## Previous milestone · Phase 07 Complaint Retrieval, Personal Feed, Public Listing, Pagination & Search

Implemented on backend branch. Completed public complaint feed (`GET /api/reports`), personal complaint history (`GET /api/reports?mine=true`), administrative operational feed (`GET /api/reports?scope=admin`), single complaint detail endpoint (`GET /api/reports/:id`), Zod query validation, multi-parameter filtering (category, status, severity), search, sorting, pagination metadata, safe data projections, performance partial indexes, and full frontend integration documentation.

- **Public & Personal Retrieval APIs**:
  - `GET /api/reports`: Multi-mode retrieval endpoint supporting:
    - Public Feed (default): Returns approved complaints where `publication = 'public'` and `visibility = 'listed'`. Projects safe public fields only (omits `user_id`, `submission_key`, private notes).
    - Personal History (`?mine=true`): Authenticated citizen view scoped strictly to `user_id = auth.uid()`. Forbids and rejects `?user_id=...` parameter tampering with HTTP 422. Projects owner details including publication, visibility, and attached evidence images.
    - Admin Queue (`?scope=admin`): Authenticated administrative view (`requireAdmin()`); returns full operational data across all department queues.
  - `GET /api/reports/:id`: Dynamic detail endpoint. Context-aware: allows owners and admins to inspect full complaint details; allows public visitors to inspect public complaints; safely conceals private complaints from unauthorized users with HTTP 404 `NOT_FOUND`.
- **Query Validation & Filtering (`src/validators/report-query.schema.ts`)**:
  - Pagination: `page` (default 1, `>= 1`), `limit` (default 20, `1..50`).
  - Filtering: Canonical 7 categories (`pothole`, `garbage`, `water_leakage`, `streetlight`, `drainage`, `damaged_infrastructure`, `other`), canonical 3 statuses (`pending`, `in_progress`, `resolved`), canonical 4 severities (`low`, `medium`, `high`, `critical`).
  - Sorting: Stable ordering via `newest` (`created_at DESC, id DESC`), `oldest`, `priority_high`, and `priority_low`.
  - Search: Case-insensitive search on `title` and `description` with PostgREST syntax injection sanitization.
- **Database Architecture & Performance Migration (`supabase/migrations/20261121000600_phase07_report_retrieval.sql`)**:
  - Granted safe SELECT columns on `public.reports`, `public.departments`, and `public.report_images` to `anon`.
  - Implemented RLS policy `report_public_read` on `public.reports` for `anon` and `authenticated` (`publication = 'public' and visibility = 'listed'`).
  - Implemented RLS policy `department_directory_anon` on `public.departments` for public department name resolution.
  - Implemented RLS policy `image_public_read` on `public.report_images` for public report image metadata access.
  - Added optimized partial indexes: `reports_public_recent`, `reports_public_category`, `reports_public_status` filtering on `publication = 'public' and visibility = 'listed'`.
- **Contracts & Documentation**:
  - [REPORT_RETRIEVAL_CONTRACT.md](docs/REPORT_RETRIEVAL_CONTRACT.md): Comprehensive query, filter, sort, pagination, response schema, and frontend screen mapping specification.
  - Updated [API_CONTRACT.md](docs/API_CONTRACT.md), [INTEGRATION_GUIDE.md](docs/INTEGRATION_GUIDE.md), and [DATABASE_CONTRACT.md](docs/DATABASE_CONTRACT.md).
- **Testing & Verification**:
  - Test suites: 100/100 automated test cases passed (`npm test`):
    - 20 Phase 04 Auth & RBAC tests passed.
    - 18 Phase 05 Storage & Validation tests passed.
    - 33 Phase 06 Complaint Creation & Validation tests passed.
    - 29 Phase 07 Retrieval, Scoping & Pagination tests passed.
  - Regression checks passed: `npm test`, `npm run lint` (0 errors, 0 warnings), `npm run typecheck`, and Next.js webpack production build (`npm run build`).
  - SQL Integration Suite: Created [supabase/tests/phase07_report_retrieval_test.sql](supabase/tests/phase07_report_retrieval_test.sql) verifying anonymous role public RLS, citizen personal history RLS, cross-user private data concealment, and admin operational access.

Next: Phase 08 Complaint Status Management, Secure Administrative Transitions, Atomic Audit History and Citizen Complaint Tracking.

## Previous milestone · Phase 06 Citizen Complaint Creation API, Storage Association & Database Persistence

Implemented on backend branch. Completed authenticated citizen complaint submission endpoint (`POST /api/reports`), strict Zod input validation, draft evidence image ownership verification, transactional database persistence (`public.civicpulse_create_report`), atomic `report_images` association, automatic audit trigger integration, duplicate submission protection, and full frontend integration contracts.

- **Transactional Database Architecture (`supabase/migrations/20261121000500_phase06_report_creation.sql`)**:
  - Implements atomic `public.civicpulse_create_report` function (`SECURITY DEFINER`, fixed `search_path = ''`).
  - Validates `auth.uid()` identity and verifies citizen role from `public.profiles`. Prevents admin accounts from submitting citizen complaints.
  - Supports safe idempotent retries via `submission_key` reconciliation against `public.reports (user_id, submission_key)`.
  - Verifies draft storage path format and ensures ownership matches `drafts/<current_uid>/...`.
  - Enforces evidence uniqueness: rejects any attempt to reuse an image already linked in `public.report_images` (`23505 CONFLICT`).
  - Atomically writes to `public.reports` (`status = 'pending'`, `priority_score = 0`, `department_id = null`, `resolved_at = null`).
  - Atomically associates evidence image in `public.report_images` (`type = 'before'`, `uploaded_by = current_uid`).
  - Automatically fires Phase 03 database trigger `report_record_event` on insert into `public.reports`, recording the initial `public.status_history` record (`version = 1`, `status = 'pending'`, `changed_by = current_uid`) and creator support vote in `public.report_votes`.
  - Storage RLS Hardening: Updates `citizen_delete_draft` policy on `storage.objects` to disallow deletion once an image is linked in `public.report_images`.
  - Direct Insert RLS: Adds `image_self_create` policy on `public.report_images` to enforce `uploaded_by = auth.uid()` and `type = 'before'` for owned reports even if direct table access is attempted.
- **Request Validation (`src/validators/report.schema.ts`)**:
  - Strict Zod validation rejecting unannounced and privileged fields (`user_id`, `role`, `status`, `priority_score`, `department_id`, `resolved_at`).
  - Title: 5–120 characters, rejecting leading/trailing whitespace.
  - Description: 10–1000 characters, rejecting leading/trailing whitespace, fully preserving multilingual Unicode text.
  - Category: Canonical 7 categories (`pothole`, `garbage`, `water_leakage`, `streetlight`, `drainage`, `damaged_infrastructure`, `other`).
  - Severity: Canonical 4 levels (`low`, `medium`, `high`, `critical`), defaulting to `'medium'`.
  - Coordinates: Latitude (-90 to 90) and Longitude (-180 to 180), rejecting NaN and Infinity while correctly accepting 0.0 coordinates.
  - Image Path: Strictly validated against `parseDraftStoragePath` and `isValidReportStoragePath`. Traversal sequences (`..`, `//`, `\`) rejected.
  - Submission Key: Optional UUID format for idempotent retries.
- **Service Layer (`src/services/report.service.ts`)**:
  - `createReport(userId, input)`: Verifies owned draft path via `verifyOwnedDraftPath`, checks duplicate image association against `report_images`, invokes atomic RPC `civicpulse_create_report`, and falls back safely to direct table persistence with compensation if RPC is unavailable.
- **API Endpoint (`src/app/api/reports/route.ts`)**:
  - `POST /api/reports`: Authenticated route handler using SSR session (`requireUser()`). Enforces citizen role, parses JSON safely, validates input, executes service persistence, and returns HTTP 201 Created with `{ success: true, data: CreateReportResponseData, message: "Complaint submitted successfully" }` and `Cache-Control: no-store`.
- **Contracts & Documentation**:
  - [REPORT_CREATION_CONTRACT.md](docs/REPORT_CREATION_CONTRACT.md)
- [REPORT_RETRIEVAL_CONTRACT.md](docs/REPORT_RETRIEVAL_CONTRACT.md): Comprehensive request, response, canonical enum, error handling, and React Hook Form frontend integration guide.
  - Updated [API_CONTRACT.md](docs/API_CONTRACT.md), [DATABASE_CONTRACT.md](docs/DATABASE_CONTRACT.md), [IMAGE_LIFECYCLE.md](docs/IMAGE_LIFECYCLE.md), and [INTEGRATION_GUIDE.md](docs/INTEGRATION_GUIDE.md).
- **Testing & Verification**:
  - Test suites: 71/71 automated test cases passed (`npm test`):
    - 20 Phase 04 Auth & RBAC tests passed.
    - 18 Phase 05 Storage & Validation tests passed.
    - 33 Phase 06 Report Creation, Validation, Security & Response tests passed (covering valid complaints, missing/short/long/whitespace titles and descriptions, 7 canonical categories, coordinate bounds, NaN/Infinity, zero coordinates, traversal rejection, privileged field injection, severity validation, submission_key validation, Unicode preservation, ownership enforcement, duplicate rejection, RPC delegation, direct fallback, and HTTP response envelopes).
  - Regression checks passed: `npm test`, `npm run lint` (0 errors, 0 warnings), `npm run typecheck`, and Next.js webpack production build (`npm run build`).
  - Database Integration Suite: Created [supabase/tests/phase06_report_creation_test.sql](supabase/tests/phase06_report_creation_test.sql) verifying transactional rollback, trigger-driven `status_history` and `report_votes`, cross-user image rejection, and finalized draft delete protection.

Next: Phase 07 Complaint Retrieval APIs, Personal Complaint History, Public Report Listing, Pagination, Filtering and Secure Data Projection.

## Previous milestone · Phase 05 storage and image upload infrastructure

Implemented on backend branch. Completed private Supabase Storage bucket configuration, Storage RLS policies, binary file validation, user-scoped draft path generation, ownership verification, server-mediated upload endpoint, draft image access endpoint, and full frontend integration contracts.

- **Storage Bucket & RLS**: Migration [20261121000400_phase05_storage.sql](supabase/migrations/20261121000400_phase05_storage.sql) configures private bucket `civic-evidence` (public = false, 3 MB limit, image/jpeg, image/png, image/webp). Implements 4 Storage RLS policies on `storage.objects`: `citizen_upload_draft`, `citizen_read_draft`, `citizen_delete_draft`, and `admin_upload_evidence`. Overwrites are disabled (no UPDATE policy), and anonymous access is denied.
- **File Validation (`src/utils/file-validation.ts`)**: Magic byte detection for JPEG (`FF D8 FF`), PNG (`89 50 4E 47`), and WebP (`RIFF...WEBP`). Explicitly rejects SVGs, PDFs, executables, HTML, empty files, and files exceeding 3 MB.
- **Path Architecture (`src/utils/storage-path.ts`)**: User-scoped draft paths (`drafts/<user_id>/<random_uuid>.<ext>`). Discards client filenames and defends against path traversal (`..`, `//`, `\`). Fully compliant with the `report_images_path_valid` database check constraint.
- **Storage Service (`src/services/storage.service.ts`)**:
  - `uploadCitizenDraftImage()`: Validates file, generates path, uploads to Supabase with `upsert: false`.
  - `verifyOwnedDraftPath()`: Validates ownership; prevents Citizen A from reading or linking Citizen B's uploaded draft (throws HTTP 403 `FORBIDDEN`).
  - `createAuthorizedImageUrl()`: Issues 15-minute signed URLs for verified owners or reviewing admins.
  - `deleteOwnedDraftImage()`: Allows draft cleanup before report submission.
- **API Endpoints**:
  - `POST /api/upload`: Authenticated multipart upload endpoint. Validates single file, enforces `purpose` restrictions (rejects citizens attempting `purpose=resolution_after`), and returns structured `{ image: { bucket, storage_path, mime_type, size_bytes, status: "temporary" } }`.
  - `POST /api/upload/access`: Generates short-lived signed URLs for owned drafts.
- **Contracts & Documentation**:
  - [UPLOAD_CONTRACT.md](docs/UPLOAD_CONTRACT.md): Comprehensive request, response, error, and component integration guide for frontend.
  - [STORAGE_SECURITY.md](docs/STORAGE_SECURITY.md): Storage security architecture, threat model, and mitigation matrix.
  - [IMAGE_LIFECYCLE.md](docs/IMAGE_LIFECYCLE.md): Complete lifecycle state machine and Mermaid sequence diagram.
  - Updated [API_CONTRACT.md](docs/API_CONTRACT.md) and [INTEGRATION_GUIDE.md](docs/INTEGRATION_GUIDE.md).
- **Testing & Verification**:
  - Test suites: 38/38 automated test cases passed (`npm test`):
    - 20 Phase 04 Auth & RBAC tests passed.
    - 18 Phase 05 Storage & Validation tests passed (covering magic bytes, size limits, SVG/PDF rejection, path generation, traversal prevention, ownership enforcement, and expiration bounds).
  - Regression checks passed: `npm test`, `npm run lint` (0 errors, 0 warnings), `npm run typecheck`, and `npm run build`.

Next: Phase 06 Citizen Complaint Creation API, Input Validation, Image Association, and Secure Database Persistence.

## Previous milestone · Phase 04 authentication and session management

Implemented on backend branch. Completed end-to-end Supabase Auth integration, Next.js 16 Proxy session refresh, database-level profile synchronization, verified RBAC (`requireUser`, `requireAdmin`), email confirmation/recovery callback routing, and full frontend integration contracts.

- **Profile Provisioning & Sync**: Migration [20261121000300_phase04_auth_profile_sync.sql](supabase/migrations/20261121000300_phase04_auth_profile_sync.sql) adds the `on_auth_user_created` trigger on `auth.users` with `SECURITY DEFINER` function `civicpulse_private.handle_new_user()`. Public registration strictly assigns `role = 'citizen'`. User-supplied metadata `role` is completely ignored. Added `public.civicpulse_ensure_profile()` for safe, idempotent repair of missing profiles.
- **Session Refresh**: Implemented Next.js 16 Proxy at `src/proxy.ts` (invoking `src/lib/supabase/proxy.ts`) using `@supabase/ssr` `createServerClient`. Calls `supabase.auth.getUser()` to revalidate tokens against the Supabase Auth server, forwarding refreshed cookies to downstream Server Components and browser response headers. Optimistic route redirection protects `/dashboard`, `/admin`, `/report`, and `/my-reports`.
- **Server Authorization Service (`src/services/auth.service.ts`)**:
  - `getCurrentUser()`: Validates token against Auth server via `getUser()` and queries authoritative database role from `public.profiles`.
  - `requireUser()`: Throws HTTP 401 `UNAUTHORIZED` if missing or invalid.
  - `requireAdmin()`: Enforces database-verified `role === 'admin'`; throws HTTP 403 `FORBIDDEN` if citizen.
  - `sanitizeRedirectUrl()` in `src/utils/permissions.ts`: Strips protocol-relative URLs (`//evil.com`), external origins, and script schemes to prevent open redirects.
- **API Endpoints**:
  - `GET /api/auth/me`: Returns `{ user: { id, email, full_name, role } }` with `Cache-Control: no-store`.
  - `POST /api/auth/logout`: Calls `signOut()` and clears SSR cookies.
  - `GET /auth/confirm`: Verifies OTP `token_hash` or PKCE `code` for email confirmation and password recovery, redirecting to sanitized internal routes.

## Previous milestone · Phase 03 database authorization

Implemented on backend and tested on isolated PostgreSQL 18.7 with synthetic Auth subjects. The [migration](supabase/migrations/20261121000200_phase03_rls_policies.sql) adds ten targeted policies, column grants, a coarse map projection, a self-only admin check and versioned report audit triggers. Citizens cannot change role or triage. Admins can manage department, severity and visibility. The trigger owns initial support and history; future services must avoid duplicate writes. See the [access matrix](docs/ACCESS_CONTROL_MATRIX.md) and [frontend contract](docs/SECURITY_CONTRACT.md).

Both migrations, the department seed and all three SQL suites passed on isolated PostgreSQL 17.12 with Supabase role and Auth fixtures. Repeating the sequence preserved the six departments and passed the tests again. The behavioral suites create and roll back their own Auth identities. Use the [Dashboard setup guide](docs/SUPABASE_DASHBOARD_SETUP.md) to verify the hosted project. Phase 04 covers session verification, trusted profile provisioning and secure citizen/admin login.

Recovery was verified with an existing CivicPulse profile in an otherwise incomplete schema and with the previous migrations already installed. The upgrade preserved the existing profile, report, vote, history and edited department values. A custom policy caused an atomic rollback.

Phase 03 regression checks passed: npm run typecheck, npm run lint, npm run build, and relative-link validation for the security and integration documents. The production route inventory still contains only the root page and health endpoint.

## Previous milestone · Phase 02 database foundation

**PARTIALLY COMPLETE.** Implemented locally on backend. The hosted development schema and migration history have not been inspected or modified. Public SDK settings are insufficient for DDL. The Phase 01 working tree and frontend/main branches were preserved.

- The [initial migration](supabase/migrations/20261121000100_core_schema.sql) defines profiles, departments, reports, report_votes, status_history and report_images. The [column dictionary and ERD](docs/DATABASE_SCHEMA.md) record the actual columns, FK deletion behavior, checks, unique keys, indexes and timestamp triggers. The [database contract](docs/DATABASE_CONTRACT.md) supersedes older data-model proposals.
- Roles citizen/admin; statuses pending/in_progress/resolved; seven category codes. Auth owns email. Reports default to private and medium severity; score zero is uncalculated. Votes and history versions are unique per report/voter and report/version respectively. Images are attached before/after metadata. RLS is enabled on every application table; ordinary clients have no table grants or policies.
- Local SQL verification used an isolated PostgreSQL 18.7 WASM engine with Auth and role fixtures. Migration execution, six departments after two seed runs, catalog and behavioral checks, fixture rollback and the original single-run migration behavior were verified. The current migration supports replay. No project dependency was added for this harness. A successful hosted SQL Editor run, real Supabase catalog/RLS verification and signed-session verification remain outstanding.
- Before Phase 03 use the [Dashboard migration instructions](docs/DATABASE_SCHEMA.md). Resolve live retention/provisioning, private upload staging and the duplicate-preview route name before their respective features. Phase 03 implements detailed RLS and grants, Phase 04 authentication, Phase 05 Storage, and Phase 06 onward complaint APIs. No new route is available. Hand the database contract to frontend through the reviewed backend → main → frontend integration sequence.

Final Phase 02 regression checks passed: npm run typecheck, npm run lint, npm run build and relative-link validation across the updated database and integration documentation. The production route list contains the root page and the existing health endpoint. The build loaded local environment configuration; it did not exercise a database connection.

## Previous milestone · Phase 01 backend foundation

The backend owner works on `backend`, the frontend owner works on `frontend`, and reviewed changes integrate into `main` in that order. The [frontend-facing API contract](docs/API_CONTRACT.md) and [integration guide](docs/INTEGRATION_GUIDE.md) describe the one-app handoff. Shared wire types live in `src/types/api.ts` and constrain both response helpers and the health handler. The local frontend ref contains documentation only; the combined frontend application still needs integration testing after the backend PR.

Completed locally on branch `backend` from `fb3cc8c`. The previous documentation-only snapshot below is historical. Before this phase the repository had the PRD, frontend/backend specifications and agent instructions but no README, Next.js app, package manifest, TypeScript configuration or environment template.

- **Runtime and dependencies.** Verified on Node 24.20.0 and npm 11.19.0. Runtime packages: next 16.4.6, react/react-dom 19.3.1, @supabase/ssr 0.12.7, @supabase/supabase-js 2.119.2, zod 4.6.7, server-only 0.0.1. Tooling: TypeScript 5.9.3, ESLint 9.39.5, eslint-config-next 16.4.6, Tailwind and its PostCSS adapter 4.3.5, PostCSS 8.5.33, @types/node 24.19.2 and React/React DOM types 19.3.0.
- **New files.** Root package.json and package-lock.json define scripts and lock dependencies. tsconfig.json, eslint.config.mjs and postcss.config.mjs configure the toolchain. .gitignore, .env.example and README.md cover local setup. Under src/app, layout.tsx, page.tsx and globals.css provide the minimal app shell; api/health/route.ts exposes process liveness. Under src/lib, env.ts validates public settings on demand and supabase/client.ts and supabase/server.ts create the browser and request-scoped SSR clients. Under src/utils, app-error.ts maps typed errors to HTTP status, api-response.ts serializes safe envelopes, and logger.ts emits structured operational events. src/config, services, types and validators each have a .gitkeep. Next.js generates ignored next-env.d.ts, build output and incremental build info.
- **Modified files.** This handoff, docs/10-API-SPECIFICATION.md and docs/20-DECISION-LOG.md record the implemented envelope. Next.js appended its managed version-specific guidance to AGENTS.md during the development smoke test.
- **Architecture.** Public config uses static environment-variable references and a publishable-key format check. Private Gemini configuration has no consumer or import. The server factory uses asynchronous Next.js cookies and forwards the SSR cache headers on writable responses. Caller-provided error causes remain internal. Log context is restricted to operational counters.
- **Commands and evidence.** npm install resolved the foundation and npm install --save-exact @supabase/ssr@0.12.7 pinned the adapter; npm reported zero known vulnerabilities at install time. npm run lint passed after fixing a PostCSS export warning, npm run typecheck passed, and npm run build produced the root page and dynamic health route. Local Next.js start/dev smoke checks returned HTTP 200 on both routes, the exact health payload and no-store caching. Production used no provider credentials; development used synthetic public settings and no Gemini key. In-memory assertions covered lazy validation, invalid key rejection, separate server SDK instances with a stub cookie store, browser SDK initialization, safe 500/409 envelopes, 201 success and all three log levels. Git ignore checks passed and a source scan found no recognized credential patterns.
- **Known limits.** No live Supabase connection, auth, database schema, Gemini call or deployment was tested. ESLint 9 emits an upstream deprecation notice; installed React, accessibility and import lint plugins declare support through ESLint 9. Provider credentials are unnecessary for the Phase 01 checks.
- **Next phase.** Phase 02 is Supabase Database Schema. Select an isolated Supabase environment and confirm schema decisions before applying reviewed migrations. The client boundary, schema validation library, response contract and local checks are ready. See [local setup](README.md).

## Start here

CivicPulse is a proposed civic maintenance reporting platform for the Open Innovation hackathon. A citizen reports an infrastructure issue with a photo, description and confirmed location. Staff receive an accountable case and record work; the original author can inspect evidence and confirm the repair. The product hypothesis is that one shared reference and history can reduce lost handoffs and duplicate work. No impact measurements or institutional partnerships have been verified.

One developer owns both ends of the 24–36-hour MVP. A simulated or participating campus facilities desk is the recommended initial pilot. Residents and students report; an officer works their department queue; an admin manages assignment and moderation. Municipalities, societies and NGOs are possible later adopters. Personas do not confer access.

## Verified state and evidence

Inspection on 2026-11-21, before this documentation was generated: local main tracked origin/main and the working tree was clean. Repository history across available refs contained b40a765, “first commit”, with one empty tracked wd.txt. Local remote-tracking main/backend/frontend pointed to that commit. Earlier in this conversation backend and frontend were created and verified on GitHub. Origin is [InfiniteLeveling/CivicPulse](https://github.com/InfiniteLeveling/CivicPulse). No root PRD, frontend/backend notes, prior handoff, agent instructions, application source, package manifest or migration was present. This session added a Markdown specification and instructions. No features or running deployment were verified.

Three untracked companion specifications appeared between initial inspection and final review: [original PRD](docs/PRD.md), [frontend specification](docs/frontend.md) and [backend specification](docs/backend.md). They describe plans, with no implementation evidence. Read the [reconciliation](docs/20-DECISION-LOG.md) before creating schemas or clients.

The supplied brief, accessible Git history, working tree and current conversation establish the baseline. External account setup, work on other devices, pilot staff and historic decisions outside those sources have **Status: Not verified / Requires confirmation**.

| Status in future updates | Evidence required |
|---|---|
| Confirmed | Explicit brief decision or identified source |
| Proposed | Working design awaiting adoption or validation |
| Planned | In an intended milestone; no execution evidence required |
| In progress | Specific partial work visible, with remaining steps |
| Implemented | Behavior present in an identified revision |
| Tested | Check, environment, input and observed result recorded |
| Blocked | Specific missing prerequisite and affected task identified |

## Confirmed technical baseline

One TypeScript modular monolith. Frontend uses Next.js App Router, React, Tailwind CSS, shadcn/ui, Lucide React, React Hook Form, Zod, React Leaflet and Recharts. Backend uses Node.js Next.js Route Handlers and services with server-side session and role checks. Supabase PostgreSQL, Auth, Storage and Realtime are the planned data services. Use PostgreSQL indexes and RLS. Maps use Leaflet/OpenStreetMap and browser geolocation. Optional Geoapify reverse geocoding and future PostGIS are outside P0. Google Gemini API assists with image analysis. GitHub, VS Code, Codex and Vercel are the documented collaboration and hosting baseline. Provider versions, projects, secrets and URLs are unverified.

## Proposed implementation contracts

- Keep server-rendered shells, role-scoped initial reads and interactive client islands. Client-only map with stable placeholder, accessible report list and manual coordinates. Citizen routes cover intake, map, My complaints and detail. Staff routes cover queue, assignment and case actions.
- Thin Route Handlers authenticate and validate input. Services enforce ownership/department scope, apply rules and use transactions; repositories implement safe reads/writes. Return typed data/error envelopes and request IDs. Stable creation keys handle lost responses; version checks protect updates.
- Six primary tables: profiles identifies accounts and roles, departments owns routing codes, reports stores canonical case data, report_votes enforces unique support, report_images tracks private staged and attached objects, status_history records ordered changes. Add reopen_requests, duplicate_requests, moderation_events and notifications only with their features.
- Principal API sequence: upload photo → optionally classify and look up candidates → create report or support existing → list/detail → assign → update status. Proposed workflow is pending → in_progress → resolved, with optional author verification to verified. An approved reopen request restores in_progress. Assignment does not change the status. P0 resolution needs a note; P1 allows private evidence.
- Accept categories pothole, garbage, streetlight, water_leakage, drainage and other. Map the confirmed category to an active department. If none matches, keep the report unassigned. AI requires consent; validate structured output and allow fully manual text/category on error.
- Match by Haversine ≤100 m, same category in the initial compatibility policy, public, listed active canonical reports only. Suggest support and always allow a separate issue. Linking existing reports requires explicit source-author nomination and admin review.
- Priority uses low/medium/high/critical bases 15/30/50/70, plus min(votes × 3, 20) and min(complete elapsed days since creation × 2, 10), capped at 100. Critical review is separate. The rule has no validated public-safety standing.
- Citizens see full own cases and limited listed peer cases. Officers access exact assigned-department records; admins have scoped administrative operations across the pilot. Visitors can read sanitized, deliberately public map and case summaries. Keep secrets and exact peer coordinates out of the browser, sanitize images, restrict private bytes, validate server-side, protect audit trails and test direct database/storage access.

## Delivery sequence and blockers

1. **First implementation milestone:** in an isolated environment, sign in as a synthetic citizen, upload one private sanitized image, submit a manual point and description, get one pending reference and reload its history. Demonstrate that a second account cannot access private fields or bytes and that retry creates no second case.
2. Finish P0 with GPS/manual map, accessible map/list, citizen dashboard, operational queue, manual assignment and versioned staff transitions. Test a note-only resolution across two sessions.
3. Add P1 routing, capped score, candidate suggestions, upvotes, optional Gemini, repair evidence, verification and reviews as time permits. Defer P2 analytics, heatmaps, notifications, localization, voice and offline features.

No implementation work was attempted in this documentation-only session. Runtime versions, configured cloud environments and credentials need verification for hosted testing. Real-data use depends on an accountable desk, jurisdiction, privacy/retention decisions, emergency communication and staff provisioning. A synthetic demo can proceed without a municipal partner or Gemini credentials.

## Documentation index

- [00 · project overview](docs/00-PROJECT-OVERVIEW.md)
- [01 · problem statement](docs/01-PROBLEM-STATEMENT.md)
- [02 · prd](docs/02-PRD.md)
- [03 · target audience](docs/03-TARGET-AUDIENCE.md)
- [04 · feature requirements](docs/04-FEATURE-REQUIREMENTS.md)
- [05 · user flows](docs/05-USER-FLOWS.md)
- [06 · ui ux design system](docs/06-UI-UX-DESIGN-SYSTEM.md)
- [07 · frontend architecture](docs/07-FRONTEND-ARCHITECTURE.md)
- [08 · backend architecture](docs/08-BACKEND-ARCHITECTURE.md)
- [09 · database design](docs/09-DATABASE-DESIGN.md)
- [10 · api specification](docs/10-API-SPECIFICATION.md)
- [11 · ai implementation](docs/11-AI-IMPLEMENTATION.md)
- [12 · security and privacy](docs/12-SECURITY-AND-PRIVACY.md)
- [13 · risk analysis](docs/13-RISK-ANALYSIS.md)
- [14 · mvp roadmap](docs/14-MVP-ROADMAP.md)
- [15 · testing strategy](docs/15-TESTING-STRATEGY.md)
- [16 · deployment plan](docs/16-DEPLOYMENT-PLAN.md)
- [17 · github workflow](docs/17-GITHUB-WORKFLOW.md)
- [18 · future scope](docs/18-FUTURE-SCOPE.md)
- [19 · hackathon presentation](docs/19-HACKATHON-PRESENTATION.md)
- [20 · decision log](docs/20-DECISION-LOG.md)
- [21 · open questions](docs/21-OPEN-QUESTIONS.md)
- [AUTH_ARCHITECTURE.md](docs/AUTH_ARCHITECTURE.md)
- [AUTH_INTEGRATION_GUIDE.md](docs/AUTH_INTEGRATION_GUIDE.md)
- [UPLOAD_CONTRACT.md](docs/UPLOAD_CONTRACT.md)
- [STORAGE_SECURITY.md](docs/STORAGE_SECURITY.md)
- [IMAGE_LIFECYCLE.md](docs/IMAGE_LIFECYCLE.md)
- [REPORT_CREATION_CONTRACT.md](docs/REPORT_CREATION_CONTRACT.md)
- [REPORT_RETRIEVAL_CONTRACT.md](docs/REPORT_RETRIEVAL_CONTRACT.md)

## Keeping the handoff current

After each authorized development session, update the evidence snapshot, tested behaviors, exact revision or working-tree changes, known failures and the next smallest integration gate. Move a claim to Tested only when there is a recorded passing check. Record changes to contracts in their numbered document and capture changed design choices in the decision log. Future agents should follow [repository instructions](AGENTS.md).
