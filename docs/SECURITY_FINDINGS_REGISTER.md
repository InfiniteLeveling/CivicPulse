# CivicPulse – Security Findings Register (Phase 19)

**Document Version:** 1.0.0  
**Status:** ALL FINDINGS RESOLVED & VERIFIED  
**Audit Date:** 2026-11-21  
**Scope:** Core Backend, API Route Handlers, Database RLS/RBAC, Storage Isolation, AI Pipeline, and Dependency Tree

---

## 1. Summary of Audit Findings

The Phase 19 Security Hardening & Penetration Review identified five (5) distinct security vulnerabilities and hardening requirements across application routing, database policies, PostgreSQL triggers, and endpoint rate limiting. All five findings have been completely remediated, regression tested, and validated.

| Finding ID | Severity | Category | Component | Status | Verification Reference |
|---|---|---|---|---|---|
| **SEC-001** | High / P1 | HTTP Security & Headers | `next.config.ts` | **RESOLVED** | `SecurityHeaders 01 & 02` (`phase19_security.test.ts`) |
| **SEC-002** | High / P1 | Database Authorization (RLS) | `public.report_votes` | **RESOLVED** | Migration `20261121001600_phase19_security_hardening.sql` |
| **SEC-003** | Medium / P2 | API Abuse & Resource Exhaustion | Route Handlers (`upload`, `ai`, `duplicates`, `upvote`) | **RESOLVED** | `RateLimit 01 - 03` (`phase19_security.test.ts`) |
| **SEC-004** | Medium / P2 | PostgreSQL Privilege Hardening | Trigger & Audit Functions | **RESOLVED** | Migration `20261121001600_phase19_security_hardening.sql` |
| **SEC-005** | Low / P3 | Database Function Isolation | `public.find_nearby_reports` | **RESOLVED** | Migration `20261121001600_phase19_security_hardening.sql` |

---

## 2. Detailed Findings & Remediation Records

### SEC-001: Missing Baseline HTTP Security Headers and API No-Store Caching
- **Vulnerability Class:** CWE-693 (Protection Mechanism Failure), OWASP API7:2023 (Server-Side Request Forgery & Security Misconfiguration).
- **Severity:** High / P1 (CVSS: 7.5 - `CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:H/A:N`).
- **Impact:** Absence of `next.config.ts` left all pages and Next.js route handlers exposed to potential clickjacking (`X-Frame-Options` missing), MIME-confusion attacks (`X-Content-Type-Options` missing), insecure SSL downgrade attacks (`Strict-Transport-Security` missing), and browser caching of sensitive civic report data (`Cache-Control: no-store` missing on API routes).
- **Root Cause:** Next.js project configuration lacked explicit response header definitions.
- **Remediation Implemented:**
  - Authored `next.config.ts` establishing mandatory HTTP headers on `/:path*`:
    - `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`
    - `X-Frame-Options: DENY`
    - `X-Content-Type-Options: nosniff`
    - `Referrer-Policy: strict-origin-when-cross-origin`
    - `Permissions-Policy: camera=(), microphone=(), geolocation=(self), browsing-topics=()`
    - `Content-Security-Policy`: Restricts scripts and styles to `'self'`, restricts connections to `'self'`, Supabase endpoints (`https://*.supabase.co`, `wss://*.supabase.co`), OpenStreetMap tiles (`https://*.tile.openstreetmap.org`), and Google Gemini API (`https://generativelanguage.googleapis.com`), and sets `frame-ancestors 'none'`.
  - Configured `Cache-Control: no-store, no-cache, must-revalidate` for `/api/:path*`.
- **Verification:** Unit tests `SecurityHeaders 01` and `SecurityHeaders 02` verify header presence, values, and API cache-control directives.

---

### SEC-002: Direct RLS Upvote Policy Did Not Enforce Citizen Self-Voting Invariance at Database Level
- **Vulnerability Class:** CWE-284 (Improper Access Control), OWASP API1:2023 (Broken Object Level Authorization).
- **Severity:** High / P1 (CVSS: 7.1 - `CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:N/I:H/A:N`).
- **Impact:** While the application-layer API handler (`/api/reports/[id]/upvote/route.ts`) verified that `report.citizen_id !== user.id`, direct PostgREST client queries or third-party client tokens could theoretically execute direct `INSERT` on `public.report_votes` for their own complaints because the existing RLS policy only validated `auth.uid() = user_id`.
- **Root Cause:** RLS policy `vote_self_active` lacked a subquery check against `public.reports.citizen_id`.
- **Remediation Implemented:**
  - Executed migration `20261121001600_phase19_security_hardening.sql` dropping legacy policy `vote_self_active` and establishing `vote_self_active_hardening`:
    ```sql
    CREATE POLICY vote_self_active_hardening ON public.report_votes
      FOR INSERT TO authenticated
      WITH CHECK (
        auth.uid() = user_id
        AND NOT EXISTS (
          SELECT 1 FROM public.reports r
          WHERE r.id = report_id
            AND r.citizen_id = auth.uid()
        )
      );
    ```
- **Verification:** SQL test script `supabase/tests/phase19_security_hardening_test.sql` verifies that attempt by author to insert into `report_votes` is denied with RLS policy violation.

---

### SEC-003: Unrestricted High-Cost and Compute-Heavy Endpoints Lacked Rate Limiting
- **Vulnerability Class:** CWE-799 (Improper Control of Generation of Code or Other Resources), OWASP API4:2023 (Unrestricted Resource Consumption).
- **Severity:** Medium / P2 (CVSS: 6.5 - `CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:N/I:N/A:H`).
- **Impact:** Malicious authenticated users or automated bots could flood `/api/upload` (disk/storage exhaustion), `/api/ai/classify` (Gemini API token quota exhaustion and financial cost), `/api/reports/check-duplicates` (Haversine spatial compute overhead), or `/api/reports/[id]/upvote` (database priority recalculation thrashing).
- **Root Cause:** Absence of endpoint sliding-window rate limit counters on sensitive mutation routes.
- **Remediation Implemented:**
  - Implemented high-performance, in-memory sliding-window rate limiter in `src/utils/rate-limit.ts`.
  - Integrated rate limit checks into:
    - `/api/upload`: 30 requests/minute per authenticated user.
    - `/api/ai/classify`: 30 requests/minute per authenticated user.
    - `/api/reports/check-duplicates`: 60 requests/minute per authenticated user.
    - `/api/reports/[id]/upvote`: 60 requests/minute per authenticated user.
  - Returns RFC 7807 compliant HTTP 429 `RATE_LIMITED` and logs structured security events (`rate_limit.exceeded`).
- **Verification:** Unit tests `RateLimit 01`, `RateLimit 02`, and `RateLimit 03` verify limit tracking, window expiry, and cross-user key isolation.

---

### SEC-004: PostgreSQL Trigger & Audit Functions Retained Default PUBLIC Execution Privileges
- **Vulnerability Class:** CWE-280 (Improper Handling of Insufficient Permissions or Privileges).
- **Severity:** Medium / P2 (CVSS: 5.3 - `CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:N/I:L/A:N`).
- **Impact:** PostgreSQL grants `EXECUTE` privileges to pseudo-role `PUBLIC` by default on newly created functions. Unauthenticated or non-admin roles could attempt direct execution of internal trigger functions (`record_report_event`, `advance_report_version`, `civicpulse_check_resolution_evidence`, `on_vote_recalculate_priority`).
- **Root Cause:** Initial database migrations created functions without explicit `REVOKE EXECUTE ON FUNCTION ... FROM PUBLIC`.
- **Remediation Implemented:**
  - Applied migration `20261121001600_phase19_security_hardening.sql`:
    ```sql
    REVOKE EXECUTE ON FUNCTION public.civicpulse_check_resolution_evidence() FROM PUBLIC, anon, authenticated;
    REVOKE EXECUTE ON FUNCTION public.on_vote_recalculate_priority() FROM PUBLIC, anon, authenticated;
    REVOKE EXECUTE ON FUNCTION public.record_report_event() FROM PUBLIC, anon, authenticated;
    REVOKE EXECUTE ON FUNCTION public.advance_report_version() FROM PUBLIC, anon, authenticated;
    ```
  - Revoked all mutation privileges (`INSERT`, `UPDATE`, `DELETE`) on `public.report_history` and `public.priority_history` from `PUBLIC`, `anon`, and `authenticated`.
- **Verification:** Database catalog privilege audit confirmed triggers are callable only by PostgreSQL system trigger context.

---

### SEC-005: Spatial Duplicate Search RPC Function Lacked Explicit Public Revocation
- **Vulnerability Class:** CWE-250 (Execution with Unnecessary Privileges).
- **Severity:** Low / P3 (CVSS: 3.7 - `CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:L/I:N/A:N`).
- **Impact:** Anonymous clients could theoretically call `find_nearby_reports` via PostgREST RPC without authenticated session tokens, probing geospatial report distribution.
- **Root Cause:** Function was defined with `SECURITY DEFINER` and granted to `authenticated`, but lacked an explicit revocation from `PUBLIC` and `anon`.
- **Remediation Implemented:**
  - Applied migration `20261121001600_phase19_security_hardening.sql`:
    ```sql
    REVOKE ALL ON FUNCTION public.find_nearby_reports(double precision, double precision, double precision, text, integer) FROM PUBLIC, anon;
    GRANT EXECUTE ON FUNCTION public.find_nearby_reports(double precision, double precision, double precision, text, integer) TO authenticated;
    ```
- **Verification:** Verified function permissions in PostgreSQL catalog; only authenticated users may execute.

---

## 3. Dependency Vulnerability Status
- Tool: `npm audit --json`
- Total Production Dependencies: 70
- Total Development Dependencies: 380
- Total Dependencies Audited: 487
- **Vulnerabilities Found:** **0 (Zero)**
- Severity Breakdown: 0 Critical, 0 High, 0 Moderate, 0 Low.

## 4. Conclusion
All identified vulnerabilities are completely mitigated and verified. CivicPulse backend has achieved complete security hardening and is ready for Phase 20 deployment.
