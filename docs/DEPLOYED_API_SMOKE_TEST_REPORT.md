# CivicPulse – Deployed API Smoke Test Report (Phase 20)

**Document Version:** 1.0.0  
**Verification Date:** 2026-11-21  
**Scope:** Complete Backend API Endpoint Suite (28 Route Handlers)  
**Execution Context:**
- Local Integration & Route Handler Execution: **100% PASS (474 Tests across 17 Suites)**
- Hosted Remote Vercel Preview Execution: **BLOCKED** (Vercel CLI unauthenticated; awaiting user `vercel login` or linked deployment token)

---

## 1. API Smoke Test Execution Matrix

| # | HTTP Method | Endpoint Route | Authentication Context | Expected HTTP Status | Local Execution Status | Hosted Execution Status | Notes / Behavioral Verification |
|---|---|---|---|---|---|---|---|
| 01 | `GET` | `/api/health` | Public / Anonymous | 200 OK | **PASS** | BLOCKED (Remote) | Emits service health status; `Cache-Control: no-store`. |
| 02 | `GET` | `/api/auth/me` | Authenticated (Citizen) | 200 OK | **PASS** | BLOCKED (Remote) | Resolves citizen session and role from Supabase auth. |
| 03 | `GET` | `/api/auth/me` | Anonymous / Unauth | 401 UNAUTHORIZED | **PASS** | BLOCKED (Remote) | Rejects missing cookies with RFC 7807 problem details. |
| 04 | `POST` | `/api/auth/logout` | Authenticated | 200 OK | **PASS** | BLOCKED (Remote) | Clears session cookies via `@supabase/ssr`. |
| 05 | `GET` | `/auth/confirm` | Public (Token Hash) | 307 Temporary Redirect | **PASS** | BLOCKED (Remote) | Sanitizes redirect URL and exchanges auth token. |
| 06 | `POST` | `/api/upload` | Authenticated (Citizen) | 201 Created | **PASS** | BLOCKED (Remote) | Validates JPEG/PNG magic bytes; stores in `drafts/<user_id>/`. |
| 07 | `POST` | `/api/upload` | Anonymous / Unauth | 401 UNAUTHORIZED | **PASS** | BLOCKED (Remote) | Rejects unauthenticated uploads; no storage mutation. |
| 08 | `POST` | `/api/upload/access` | Authenticated (Citizen) | 200 OK | **PASS** | BLOCKED (Remote) | Generates short-lived signed URL for draft photo. |
| 09 | `POST` | `/api/ai/classify` | Authenticated (Citizen) | 200 OK | **PASS** | BLOCKED (Remote) | Calls Gemini multimodal AI; gracefully falls back if unconfigured. |
| 10 | `POST` | `/api/reports` | Authenticated (Citizen) | 201 Created | **PASS** | BLOCKED (Remote) | Submits complaint; calculates priority; routes to department. |
| 11 | `GET` | `/api/reports` | Public / Citizen | 200 OK | **PASS** | BLOCKED (Remote) | Retrieves paginated reports with category/status filters. |
| 12 | `GET` | `/api/reports/[id]` | Public / Citizen | 200 OK | **PASS** | BLOCKED (Remote) | Returns single report details with department and evidence. |
| 13 | `GET` | `/api/reports/[id]/history` | Public / Citizen | 200 OK | **PASS** | BLOCKED (Remote) | Returns immutable audit trail from `public.report_history`. |
| 14 | `PATCH`| `/api/reports/[id]/status` | Authenticated (Citizen) | 403 FORBIDDEN | **PASS** | BLOCKED (Remote) | Citizens cannot modify complaint status. |
| 15 | `PATCH`| `/api/reports/[id]/status` | Authenticated (Admin) | 200 OK | **PASS** | BLOCKED (Remote) | Admin transitions status; enforces evidence on `resolved`. |
| 16 | `POST` | `/api/reports/[id]/assign` | Authenticated (Citizen) | 403 FORBIDDEN | **PASS** | BLOCKED (Remote) | Citizens cannot reassign departments. |
| 17 | `POST` | `/api/reports/[id]/assign` | Authenticated (Admin) | 200 OK | **PASS** | BLOCKED (Remote) | Admin reassigns department; logs override reason. |
| 18 | `POST` | `/api/reports/[id]/upvote` | Authenticated (Citizen) | 200 OK / 201 Created | **PASS** | BLOCKED (Remote) | Adds community support; triggers priority recalculation. |
| 19 | `POST` | `/api/reports/[id]/upvote` | Author of Report | 403 FORBIDDEN / 400 | **PASS** | BLOCKED (Remote) | Self-voting strictly prevented at API and RLS levels. |
| 20 | `GET` | `/api/reports/[id]/priority`| Authenticated | 200 OK | **PASS** | BLOCKED (Remote) | Returns transparent explainable priority score breakdown. |
| 21 | `POST` | `/api/reports/check-duplicates`| Authenticated | 200 OK | **PASS** | BLOCKED (Remote) | Haversine candidate scan within 100 meters. |
| 22 | `GET` | `/api/reports/map` | Public / Citizen | 200 OK | **PASS** | BLOCKED (Remote) | Returns bounded map markers (max 500) within viewport. |
| 23 | `GET` | `/api/departments` | Public / Citizen | 200 OK | **PASS** | BLOCKED (Remote) | Lists public departments for routing and filtering. |
| 24 | `GET` | `/api/admin/analytics/overview` | Authenticated (Citizen) | 403 FORBIDDEN | **PASS** | BLOCKED (Remote) | Rejects citizen callers; protects operational metrics. |
| 25 | `GET` | `/api/admin/analytics/overview` | Authenticated (Admin) | 200 OK | **PASS** | BLOCKED (Remote) | Returns executive KPIs aggregated via stored procedure. |
| 26 | `GET` | `/api/admin/analytics/trends` | Authenticated (Admin) | 200 OK | **PASS** | BLOCKED (Remote) | Continuous zero-filled daily/weekly/monthly time series. |
| 27 | `GET` | `/api/admin/analytics/departments` | Authenticated (Admin) | 200 OK | **PASS** | BLOCKED (Remote) | Workload breakdown by department and unassigned queue. |
| 28 | `GET` | `/api/admin/analytics/performance` | Authenticated (Admin) | 200 OK | **PASS** | BLOCKED (Remote) | Resolution turnaround average, median, and backlog. |

---

## 2. Testing Summary & Status Classification

- **Local Route Handler Tests:** **28 / 28 PASS** (100% verified across 474 automated tests).
- **Remote Hosted Tests:** **BLOCKED** due to CLI authentication boundary (`vercel whoami` reported `Logged out.`).
- **Remediation Path:** Once the platform operator executes `npx vercel login` or configures `VERCEL_TOKEN`, the deployment pipeline can immediately execute remote smoke tests against the generated preview URL.
