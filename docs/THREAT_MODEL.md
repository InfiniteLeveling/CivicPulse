# CivicPulse – Backend Threat Model (Phase 19)

**Document Version:** 1.0.0  
**Status:** VERIFIED & HARDENED  
**Scope:** CivicPulse Civic Reporting and Resolution Platform  
**Methodology:** STRIDE (Spoofing, Tampering, Repudiation, Information Disclosure, Denial of Service, Elevation of Privilege) + OWASP Top 10 API Security Risks (2023)

---

## 1. System Overview & Architecture

CivicPulse is an AI-assisted civic infrastructure reporting and resolution platform engineered with a modular monolith architecture built on Next.js App Router (TypeScript) and Supabase PostgreSQL.

### Core Architectural Layers
1. **Edge / Client Gateway:**
   - Next.js Web Application (React 19, App Router).
   - Ingress HTTP/HTTPS via TLS 1.3 terminating at Vercel/Next.js edge.
   - Strict HTTP response headers (`CSP`, `HSTS`, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`).
2. **API Route Handlers (`src/app/api/...`):**
   - Stateless Next.js route handlers serving JSON REST endpoints.
   - Session authentication verification via `@supabase/ssr` reading encrypted HTTP-only session cookies.
   - Request body and query validation via Zod schemas with `.strict()` rejection of unexpected keys.
   - Sliding-window in-memory rate limiting on sensitive and mutation routes.
3. **Application Services (`src/services/...`):**
   - Encapsulated business logic for complaint submission, department routing, priority calculation, duplicate detection, analytics, and status progression.
   - Atomic multi-step operations orchestrating PostgreSQL and Supabase Storage.
4. **Data Layer (Supabase PostgreSQL 15+):**
   - Row Level Security (RLS) enabled on all 11 public tables.
   - Role-Based Access Control (RBAC) separating `citizen` and `admin` roles.
   - Database functions, constraints, triggers, and immutability rules.
5. **Storage Layer (Supabase Storage):**
   - Private bucket `report-images` with strictly scoped user draft directories (`drafts/<user_id>/...`) and admin resolution draft paths (`resolution-drafts/<admin_id>/<report_id>/...`).
   - Finalized paths immutable via RLS.
6. **External Integrations:**
   - Google Gemini 2.5 Flash Multimodal AI (image classification & suggestions).
   - Supabase Realtime broadcast engine (live status and routing event dispatch).

---

## 2. Trust Boundaries

```
[ Unauthenticated Internet ]
           │
           │ Boundary 1: Public Gateway (TLS 1.3 / Security Headers)
           ▼
[ Next.js Edge & Route Handlers ]
           │
           │ Boundary 2: Application Layer (Auth, RBAC, Zod, Rate Limiter)
           ▼
[ Domain Services & Business Logic ]
           │
           │ Boundary 3: Supabase Service Role vs Authenticated Client Context
           ├───────────────────────────────┬───────────────────────────────┐
           ▼                               ▼                               ▼
[ PostgreSQL RLS / Tables ]      [ Supabase Storage ]          [ Google Gemini API ]
(Boundary 4: DB Engine)        (Boundary 5: Object Store)     (Boundary 6: External API)
```

- **Boundary 1 (Browser to Next.js API):** Untrusted public network. Potential attacks include MITM, CSRF, XSS, DDoS, spoofed headers, open redirects.
- **Boundary 2 (API Handlers to Services):** Authenticated boundary. Potential attacks include forged identity claims, privilege escalation (citizen attempting admin routes), schema pollution, prototype injection.
- **Boundary 3 (Services to Supabase Data Layer):** Dual-context boundary. Application runs with authenticated user Supabase client for user-scoped operations, and controlled server-side clients for system tasks.
- **Boundary 4 (PostgreSQL Tables & Triggers):** Database trust boundary. RLS policies independently enforce authorization even if API layers are bypassed.
- **Boundary 5 (Storage Service):** Object storage boundary. Restricts write access to user-owned draft folders and validates file signatures.
- **Boundary 6 (External AI Service):** Third-party outbound API. Google Gemini receives image buffers; responses are untrusted and rigorously validated via Zod schemas.

---

## 3. Threat Actors & Personas

1. **Anonymous Public Visitor:** Unauthenticated external user. May browse public complaints or attempt unauthorized API invocation.
2. **Authenticated Citizen:** Registered user with `role = 'citizen'`. May create reports, upvote reports, retrieve reports, view history, and check duplicates. Must NOT access administrative KPIs, modify complaint statuses, reassign departments, or upvote own reports.
3. **Authenticated Administrator:** Authorized municipal worker or municipal administrator with `role = 'admin'`. May reassign departments, update statuses, upload resolution evidence, and access analytics dashboards.
4. **Malicious Authenticated User:** Citizen or compromised account attempting privilege escalation, automated scraping, resource exhaustion, or data tampering.
5. **Compromised Subsystem / Malicious Insider:** Theoretical actor attempting direct database connection or storage path manipulation.

---

## 4. STRIDE Threat Analysis & Mitigations

### 4.1 Spoofing (Identity & Roles)
- **Threat:** Client passes forged `role: "admin"` in request body or headers to gain administrative capabilities.
- **Mitigation:**
  - `role` is NEVER accepted from client payloads. All Zod schemas (`assignDepartmentSchema`, `updateStatusSchema`, `reportSchema`) reject client-supplied role or authority attributes.
  - Role is strictly determined server-side from Supabase auth session: verified via `auth.getUser()` and validated against `public.profiles.role`.
  - `assertAdmin()` helper throws HTTP 403 `FORBIDDEN` if session role is not `'admin'`.

### 4.2 Tampering (Data Integrity)
- **Threat 1:** Citizen modifies `status`, `department_id`, or `priority_score` during complaint creation.
- **Mitigation 1:** `createReport` hardcodes initial status to `'submitted'`, resolves department deterministically through routing rules, and computes priority score on the server.
- **Threat 2:** Attendant or user alters audit logs (`report_history`, `priority_history`).
- **Mitigation 2:** Tables have RLS policies permitting only `SELECT`. `INSERT`, `UPDATE`, and `DELETE` are explicitly revoked from `PUBLIC`, `anon`, and `authenticated`. Audit records are inserted strictly via PostgreSQL triggers executing as table owner.
- **Threat 3:** Path traversal in storage paths (e.g. `drafts/../../etc/passwd` or `drafts/other_user/...`).
- **Mitigation 3:** Storage paths are validated with strict regex in `src/utils/storage-path.ts` ensuring paths conform strictly to `drafts/<user_id>/<uuid>.<ext>` where `<user_id>` must match `auth.uid()`.

### 4.3 Repudiation (Accountability)
- **Threat:** Admin modifies a complaint status or department assignment and denies doing so.
- **Mitigation:**
  - PostgreSQL trigger `record_report_event` captures every state change atomically into `public.report_history` recording `old_status`, `new_status`, `changed_by` (authenticated user UUID), and timestamp `created_at`.
  - Status updates and manual department overrides require explicit administrative notes and mandatory reason tracking.

### 4.4 Information Disclosure (Privacy & Exfiltration)
- **Threat 1:** Unauthenticated users access citizen email addresses or sensitive personal profiles.
- **Mitigation 1:** `public.profiles` RLS policy `profile_read_own_or_admin` restricts profile reading to the user themselves or users with `role = 'admin'`.
- **Threat 2:** Citizen access to administrative analytics (department backlogs, internal resolution times).
- **Mitigation 2:** Analytics APIs (`/api/analytics/...`) enforce `assertAdmin(user)` and database view `public.analytics_department_kpis` grants access only to administrative roles.
- **Threat 3:** API error stack traces leaking database internals.
- **Mitigation 3:** Central error handler formats RFC 7807 compliant error responses concealing internal traces; detailed logs are restricted to server-side structured JSON logs (`src/utils/logger.ts`).

### 4.5 Denial of Service (Resource & Quota Exhaustion)
- **Threat 1:** Image upload flooding filling disk/storage quotas.
- **Mitigation 1:** Strict file size cap (3MB / `MAX_FILE_SIZE_BYTES`), magic byte MIME signature validation (rejecting non-image payloads, SVGs, and executables), and sliding-window rate limiting (30 uploads/min per user).
- **Threat 2:** Abuse of Gemini AI multimodal classification endpoint causing financial loss.
- **Mitigation 2:** Rate limited to 30 requests/min per user. Cache headers prevent repeat processing. Timeout guard (15s) terminates hung AI calls.
- **Threat 3:** Complex spatial duplicate searches thrashing PostgreSQL CPU.
- **Mitigation 3:** Haversine function `find_nearby_reports` uses spatial bounding-box indexing pre-filters and enforces a 60 requests/min rate limit.

### 4.6 Elevation of Privilege
- **Threat 1:** Citizen upvoting their own report to artificially boost priority.
- **Mitigation 1:** Handled both at application layer (`user.id !== report.citizen_id`) and hardened at database RLS layer (`vote_self_active_hardening` policy checks `NOT EXISTS (SELECT 1 FROM reports WHERE reports.id = report_id AND reports.citizen_id = auth.uid())`).
- **Threat 2:** Direct PostgREST execution of PostgreSQL triggers or admin RPCs.
- **Mitigation 2:** Migration `20261121001600_phase19_security_hardening.sql` explicitly revokes `EXECUTE` on all trigger functions from `PUBLIC`, `anon`, and `authenticated`.

---

## 5. Security Posture & Residual Risk Summary

All critical, high, and medium threat vectors identified in the STRIDE review have corresponding automated mitigations and regression tests. The residual risk level is categorized as **LOW**, meeting the strict criteria for production readiness.
