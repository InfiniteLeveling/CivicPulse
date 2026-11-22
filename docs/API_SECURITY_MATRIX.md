# CivicPulse – Complete API Security Matrix (Phase 19)

**Document Version:** 1.0.0  
**Status:** AUDITED & HARDENED  
**Scope:** All CivicPulse Next.js App Router API Handlers  
**Total Endpoints Audited:** 28 endpoints (Authentication, Profile, Storage, AI, Complaint Core, Workflow, Geospatial, Analytics)

---

## 1. Summary Matrix

| # | HTTP Method | Endpoint Route | Authentication Required | Authorized Roles | Primary RLS Table / Data Source | Rate Limiting | Injected Property Rejection | Sensitive Fields Redacted |
|---|---|---|---|---|---|---|---|---|
| 1 | `POST` | `/api/auth/register` | No | Public / Unauth | `auth.users`, `public.profiles` | IP / Email bounded | Yes (`role` stripped) | Passwords excluded from logs |
| 2 | `POST` | `/api/auth/login` | No | Public / Unauth | `auth.users` | Supabase Auth limits | Yes (`email`, `password` only) | Passwords excluded from logs |
| 3 | `POST` | `/api/auth/logout` | Yes | `citizen`, `admin` | Supabase Session | Standard | N/A | Session invalidated |
| 4 | `POST` | `/api/auth/forgot-password` | No | Public / Unauth | `auth.users` | Supabase Auth limits | Yes (email only) | Timing attack mitigated |
| 5 | `POST` | `/api/auth/reset-password` | Yes (Recovery Token) | `citizen`, `admin` | `auth.users` | Supabase Auth limits | Yes (password only) | Credentials scrubbed |
| 6 | `GET` | `/api/auth/session` | Optional | Public / `citizen` / `admin` | Supabase Session | Standard | N/A | Exposes safe claims only |
| 7 | `GET` | `/api/profile` | Yes | `citizen`, `admin` | `public.profiles` | Standard | N/A | User-scoped (`auth.uid()`) |
| 8 | `PATCH` | `/api/profile` | Yes | `citizen`, `admin` | `public.profiles` | Standard | Yes (blocks `role` alteration) | Own profile only |
| 9 | `POST` | `/api/upload` | Yes | `citizen`, `admin` | Supabase Storage (`report-images`) | **30 req/min/user** | Yes (`purpose` validated) | Rejects SVG/PDF/Binaries |
| 10 | `POST` | `/api/ai/classify` | Yes | `citizen`, `admin` | Google Gemini 2.5 Flash | **30 req/min/user** | Yes (strict image schema) | Image buffer in memory only |
| 11 | `POST` | `/api/reports` | Yes | `citizen`, `admin` | `public.reports`, `report_images` | Standard | Yes (`status`, `score` ignored) | Server enforces `submitted` |
| 12 | `GET` | `/api/reports` | Optional / Yes | Public / `citizen` / `admin` | `public.reports` | Standard | Yes (`.strict()` query schema) | Private notes excluded |
| 13 | `GET` | `/api/reports/[id]` | Optional / Yes | Public / `citizen` / `admin` | `public.reports` | Standard | Yes (UUID param validated) | Internal admin fields safe |
| 14 | `GET` | `/api/reports/[id]/history` | Optional / Yes | Public / `citizen` / `admin` | `public.report_history` | Standard | Yes (UUID param validated) | Read-only audit log |
| 15 | `PATCH` | `/api/reports/[id]/status` | Yes | **`admin` only** | `public.reports`, `report_history` | Standard | Yes (blocks forged status payload) | Enforces evidence on `resolved` |
| 16 | `POST` | `/api/reports/[id]/assign` | Yes | **`admin` only** | `public.reports`, `report_history` | Standard | Yes (validates `department_id`) | Validates target dept exists |
| 17 | `POST` | `/api/reports/[id]/upvote` | Yes | `citizen`, `admin` | `public.report_votes`, `reports` | **60 req/min/user** | Yes (UUID validated) | Forbids self-voting & duplicate |
| 18 | `GET` | `/api/reports/[id]/priority` | Yes | `citizen`, `admin` | `public.reports`, `priority_history` | Standard | Yes (UUID validated) | Transparent score breakdown |
| 19 | `GET` | `/api/reports/nearby` | Optional / Yes | Public / `citizen` / `admin` | `public.find_nearby_reports` | Standard | Yes (bounds lat, lon, radius) | Truncates to max 50 items |
| 20 | `POST` | `/api/reports/check-duplicates` | Yes | `citizen`, `admin` | `public.find_nearby_reports` | **60 req/min/user** | Yes (bounds coordinates) | Pre-submission advisory only |
| 21 | `GET` | `/api/reports/map` | Optional / Yes | Public / `citizen` / `admin` | `public.reports` (Spatial box) | Standard | Yes (bounds bounding box) | Max 500 lightweight markers |
| 22 | `GET` | `/api/departments` | Optional / Yes | Public / `citizen` / `admin` | `public.departments` | Standard | N/A | Public department listing |
| 23 | `GET` | `/api/analytics/overview` | Yes | **`admin` only** | `public.reports`, RPC views | Standard | Yes (`.strict()` date filter) | Admin KPIs only |
| 24 | `GET` | `/api/analytics/trends` | Yes | **`admin` only** | `public.reports` | Standard | Yes (validates granularity) | Continuous zero-filled buckets |
| 25 | `GET` | `/api/analytics/categories` | Yes | **`admin` only** | `public.reports` | Standard | Yes (`.strict()` date filter) | Aggregated percentages |
| 26 | `GET` | `/api/analytics/departments` | Yes | **`admin` only** | `public.reports`, `departments` | Standard | Yes (`.strict()` date filter) | Department workload breakdown |
| 27 | `GET` | `/api/analytics/performance` | Yes | **`admin` only** | `public.reports` | Standard | Yes (`.strict()` date filter) | Resolution hours avg/median |
| 28 | `GET` | `/api/analytics/priorities` | Yes | **`admin` only** | `public.reports` | Standard | Yes (limit bounded 1 to 20) | Top pending priority items |

---

## 2. API Security Architecture Verification

### 2.1 Authentication & Session Handling
- All authenticated routes utilize `@supabase/ssr` with `createServerClient()` passing HTTP-only, secure, same-site cookies.
- Bearer tokens from direct authorization headers are verified against Supabase Auth service.
- Expired or tampered sessions immediately return HTTP 401 `UNAUTHORIZED`.

### 2.2 Role-Based Access Control (RBAC)
- Municipal admin endpoints (`/api/reports/[id]/status`, `/api/reports/[id]/assign`, and all `/api/analytics/*` routes) invoke `assertAdmin(user)`.
- If an authenticated citizen attempts invocation, the handler aborts with HTTP 403 `FORBIDDEN` before executing any query or mutation.

### 2.3 Object-Level Authorization (BOLA / IDOR Defense)
- Citizen profile modification (`PATCH /api/profile`) validates `auth.uid() = profile.id`.
- File upload drafts (`/api/upload`) force the storage path under `drafts/${user.id}/...`. Users cannot write to other users' folders.
- Upvoting checks: A user cannot upvote their own complaint, and cannot vote more than once per complaint (enforced at both API and database levels).

### 2.4 Mass Assignment & Parameter Tampering Protection
- Request bodies are parsed through Zod schemas with `.strict()` modifiers.
- Attempting to pass `priority_score`, `status`, `resolved_at`, `role`, or `is_admin` in client requests triggers HTTP 422 `VALIDATION_ERROR` or strips the unauthorized properties.

### 2.5 Caching & Information Leakage Defenses
- All API route handlers emit `Cache-Control: no-store, no-cache, must-revalidate` in both success and error responses.
- Central error handlers format RFC 7807 problem details envelopes, stripping PostgreSQL internal error stacks and file paths.
