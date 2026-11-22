# CivicPulse – Final API Connection Matrix (Phase 21)

**Document Version:** 1.0.0  
**Audit Date:** 2026-11-22  
**Scope:** Complete Next.js App Router Backend API Handlers (28 Endpoints)  
**Total Endpoints Audited:** 28  

---

## 1. Complete API Route & Connection Inventory

| # | HTTP Method | Endpoint Route Path | Authentication Requirement | Authorized User Roles | Request Input Schema | Output Response Schema | Target Service / Component | Live / Mock Status | Expected Result | Actual Result | Frontend Consumer UI |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 01 | `GET` | `/api/health` | Public / None | Anyone | None | `{ status: "ok", service: "civicpulse-backend" }` | Next.js Serverless Route | **PASS** | HTTP 200 OK | HTTP 200 OK | Health monitors & uptime probes |
| 02 | `GET` | `/api/auth/me` | Authenticated | `citizen`, `admin` | None | `{ user: AuthenticatedUser }` | Supabase Auth SSR | **PASS** | HTTP 200 OK | HTTP 200 OK | App Header, Profile Widget |
| 03 | `POST` | `/api/auth/logout` | Authenticated | `citizen`, `admin` | None | `{ message: string }` | Supabase Auth SSR | **PASS** | HTTP 200 OK | HTTP 200 OK | Navigation Logout Button |
| 04 | `GET` | `/auth/confirm` | Public (Token Hash) | Anyone | Query: `token_hash`, `type`, `next` | 307 Redirect | Supabase GoTrue Auth | **PASS** | HTTP 307 Redirect | HTTP 307 Redirect | Email Verification Link |
| 05 | `POST` | `/api/upload` | Authenticated | `citizen`, `admin` | `multipart/form-data` (file, purpose) | `{ image: { bucket, storage_path } }` | Supabase Storage (`civic-evidence`) | **PASS (Local) / BLOCKED (Remote)** | HTTP 201 Created | HTTP 201 Created (Local) | Complaint File Upload Component |
| 06 | `POST` | `/api/upload/access` | Authenticated | `citizen`, `admin` | `{ storage_path, expires_in_seconds }` | `{ signed_url: string }` | Supabase Storage Signed URLs | **PASS (Local)** | HTTP 200 OK | HTTP 200 OK (Local) | Image Preview Thumbnail |
| 07 | `POST` | `/api/ai/classify` | Authenticated | `citizen`, `admin` | `{ image_path }` | `{ suggested_category, suggested_severity, title, description }` | Google Gemini 2.5 Flash | **PASS (Local) / BLOCKED (Staging Key)** | HTTP 200 OK | HTTP 200 OK (Local) | Smart Issue Suggestion Card |
| 08 | `POST` | `/api/reports` | Authenticated | `citizen`, `admin` | `createReportSchema.strict()` | `{ report: ReportRecord }` | Report Service & Auto-Routing | **PASS** | HTTP 201 Created | HTTP 201 Created | Report Submission Form |
| 09 | `GET` | `/api/reports` | Public / Contextual | Anyone | `reportQuerySchema.strict()` | `{ reports: ReportRecord[], pagination }` | Report Retrieval Query Builder | **PASS** | HTTP 200 OK | HTTP 200 OK | Public Complaint Feed / List View |
| 10 | `GET` | `/api/reports/[id]` | Public / Contextual | Anyone | URL Path: `id` (UUID v4) | `{ report: ReportDetailRecord }` | Report Query Service | **PASS** | HTTP 200 OK | HTTP 200 OK | Complaint Detail View Page |
| 11 | `GET` | `/api/reports/[id]/history` | Public / Contextual | Anyone | URL Path: `id` (UUID v4) | `{ history: ReportHistoryItem[] }` | Report History Service | **PASS** | HTTP 200 OK | HTTP 200 OK | Complaint Timeline Component |
| 12 | `PATCH`| `/api/reports/[id]/status` | Authenticated | **`admin` only** | `updateStatusSchema.strict()` | `{ report_id, status, version }` | Status Workflow Service | **PASS** | HTTP 200 OK (Admin) / 403 (Citizen) | Verified (403 for citizen) | Admin Triage Action Bar |
| 13 | `POST` | `/api/admin/assign` | Authenticated | **`admin` only** | `assignDepartmentSchema.strict()` | `{ report_id, department_id, version }` | Department Assignment Service | **PASS** | HTTP 200 OK (Admin) / 403 (Citizen) | Verified (403 for citizen) | Department Dropdown in Admin View |
| 14 | `POST` | `/api/admin/route` | Authenticated | **`admin` only** | `{ report_id, force? }` | `{ report_id, department_id, routing_rule }` | Auto-Routing Retry Service | **PASS** | HTTP 200 OK | HTTP 200 OK | Admin Routing Re-evaluation Button |
| 15 | `POST` | `/api/reports/[id]/upvote` | Authenticated | `citizen`, `admin` | URL Path: `id` (UUID v4) | `{ support_count, has_supported }` | Community Support & Vote Service | **PASS** | HTTP 200 OK | Self-voting blocked (403/400) | Community Support Heart/Upvote Pill |
| 16 | `GET` | `/api/reports/[id]/priority`| Authenticated | `citizen`, `admin` | URL Path: `id` (UUID v4) | `{ priority_score, breakdown }` | Priority Scoring Service | **PASS** | HTTP 200 OK | Transparent breakdown returned | Priority Score Badge & Explain Modal |
| 17 | `POST` | `/api/reports/check-duplicates`| Authenticated | `citizen`, `admin` | `checkDuplicatesSchema.strict()` | `{ duplicates: DuplicateCandidate[] }` | Haversine Duplicate Service | **PASS** | HTTP 200 OK | 100m proximity candidate scan | Pre-Submission Duplicate Warning Dialog |
| 18 | `GET` | `/api/reports/map` | Public / Contextual | Anyone | `mapQuerySchema.strict()` | `{ markers: MapMarker[], count }` | Map Viewport Spatial Service | **PASS** | HTTP 200 OK | Bounded markers returned (max 500) | Leaflet Interactive Map View |
| 19 | `GET` | `/api/departments` | Public / Anyone | Anyone | None | `{ departments: DepartmentItem[] }` | Department Service | **PASS** | HTTP 200 OK | Lists active departments | Category Filter & Admin Selectors |
| 20 | `POST` | `/api/admin/reports/[id]/resolution-evidence` | Authenticated | **`admin` only** | `multipart/form-data` (file, report_id) | `{ evidence: { storage_path } }` | Resolution Evidence Service | **PASS** | HTTP 201 Created | HTTP 201 Created | Admin Resolution Evidence Upload Form |
| 21 | `GET` | `/api/reports/[id]/evidence` | Public / Contextual | Anyone | URL Path: `id` (UUID v4) | `{ before_images, after_images }` | Evidence Service & Signed URLs | **PASS** | HTTP 200 OK | Before & after evidence returned | Before/After Image Comparison Slider |
| 22 | `GET` | `/api/admin/analytics/overview` | Authenticated | **`admin` only** | `analyticsDateRangeSchema.strict()` | `AnalyticsOverviewData` | Analytics Stored Procedure | **PASS** | HTTP 200 OK (Admin) / 403 (Citizen) | Verified (403 for citizen) | Executive KPI Header Cards |
| 23 | `GET` | `/api/admin/analytics/trends` | Authenticated | **`admin` only** | `analyticsTrendsQuerySchema.strict()` | `AnalyticsTrendsData` | Analytics Zero-Filled Aggregation | **PASS** | HTTP 200 OK | Continuous time-series series | Trend Line & Bar Charts |
| 24 | `GET` | `/api/admin/analytics/categories`| Authenticated | **`admin` only** | `analyticsDateRangeSchema.strict()` | `AnalyticsCategoriesData` | Analytics Category Aggregation | **PASS** | HTTP 200 OK | Category percentages returned | Category Distribution Donut Chart |
| 25 | `GET` | `/api/admin/analytics/departments`| Authenticated | **`admin` only** | `analyticsDateRangeSchema.strict()` | `AnalyticsDepartmentsData` | Analytics Department Aggregation | **PASS** | HTTP 200 OK | Workload & unassigned counts | Department Workload Bar Chart |
| 26 | `GET` | `/api/admin/analytics/performance`| Authenticated | **`admin` only** | `analyticsDateRangeSchema.strict()` | `AnalyticsPerformanceData` | Analytics Duration Aggregation | **PASS** | HTTP 200 OK | Average & median resolution hours | Resolution Performance KPI Card |
| 27 | `GET` | `/api/admin/analytics/priorities` | Authenticated | **`admin` only** | `analyticsPrioritiesQuerySchema.strict()`| `AnalyticsPrioritiesData` | Analytics Priority Ranking Service | **PASS** | HTTP 200 OK | Top pending priority items (max 20) | High Priority Backlog Table |
| 28 | `GET` | `/api/profile` / `PATCH /api/profile`| Authenticated | `citizen`, `admin` | `updateProfileSchema.strict()` | `{ profile: ProfileRecord }` | User Profile Service | **PASS** | HTTP 200 OK | Own profile read/update | User Settings & Profile Drawer |

---

## 2. API Connection Quality & Status Summary

- **Total Implemented & Audited Endpoints:** 28
- **Local Contract & Logic Verification:** **28 / 28 PASS (100%)**
- **Remote Hosted Gateway Status:** Supabase PostgreSQL Database live verified (HTTP 200 on `civic_report_map`, 401 on `departments`); remote Vercel API execution awaiting operator CLI authentication.
