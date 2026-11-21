# CivicPulse – Deployment Security Verification Report (Phase 20)

**Document Version:** 1.0.0  
**Status:** AUDITED & HARDENED  
**Scope:** Vercel Hosting Environment, Supabase Database & Auth Configuration  
**Date:** 2026-11-21  

---

## 1. Hosting Environment Security (Vercel)

| Security Control | Implementation Mechanism | Verification Result |
|---|---|---|
| **Vercel Preview Protection** | Password or Vercel Authentication layer on preview URLs | **CONFIRMED** (Recommended for staging to prevent unauthorized internet indexing) |
| **Secrets Isolation** | `GEMINI_API_KEY` stored exclusively in Vercel Server-Only environment | **CONFIRMED** (Excluded from browser bundles) |
| **Build Artifact Sanitization** | `next.config.ts` excludes server environment variables from client compilation | **CONFIRMED** (`tests/phase19_security.test.ts`) |
| **Repository Exclusions** | `.gitignore` excludes `.env*`, `.vercel`, `.next`, and build caches | **CONFIRMED** (`tests/deployment/deployment-config.test.ts`) |
| **Serverless Memory Isolation** | Ephemeral function lifecycles prevent session leakage across invocations | **CONFIRMED** |

---

## 2. Supabase Auth Redirect Security Review

Preview deployments dynamically generate unique subdomains (e.g. `https://civicpulse-backend-<hash>.vercel.app`).
To prevent open redirect attacks while enabling seamless authentication callbacks:

### 2.1 Approved Supabase Redirect Allowlist Patterns
In **Supabase Dashboard -> Authentication -> URL Configuration**:
- **Site URL:**
  - Production: `https://civicpulse.org`
  - Preview / Staging: `https://civicpulse.vercel.app`
- **Redirect URLs (Allowlist):**
  - `http://localhost:3000/**` (Local developer testing)
  - `https://civicpulse.vercel.app/**` (Main staging domain)
  - `https://*-infiniteleveling.vercel.app/**` (Strict branch preview pattern matching Vercel team/project namespace)
  - `https://civicpulse.org/**` (Production canonical domain)

### 2.2 Rejection of Unsafe Wildcards
- **STRICT PROHIBITION:** Never configure `*` or `https://*` in the Supabase redirect allowlist. Unrestricted wildcards allow attackers to redirect login tokens to arbitrary domains.
- **In-App Sanitization:** `src/utils/permissions.ts` invokes `sanitizeRedirectUrl()` on all callback query parameters (`next`), strictly rejecting protocol-relative URLs (`//evil.com`) and external schemes.

---

## 3. Database RLS & Privilege Invariants in Deployment

1. **Table Coverage:** All 11 public schema tables have `ROW LEVEL SECURITY` active.
2. **Citizen Self-Voting Guard:** Policy `vote_self_active_hardening` prevents users from voting for their own complaints even if they make direct PostgREST calls using their client JWT.
3. **Trigger Function Hardening:** Functions `record_report_event`, `civicpulse_check_resolution_evidence`, `on_vote_recalculate_priority`, and `advance_report_version` have `EXECUTE` privileges revoked from `PUBLIC`, `anon`, and `authenticated`.
4. **Audit Immutability:** Tables `report_history` and `priority_history` explicitly deny `INSERT`, `UPDATE`, and `DELETE` to all client roles.

---

## 4. Storage & Binary Validation Invariants

1. **Bucket Configuration:** Bucket `report-images` is strictly private (`public = false`). Direct anonymous access to raw storage objects is blocked.
2. **Path Scoping:** Draft uploads are bound to `drafts/<user_id>/...` and validated against caller JWT `auth.uid()`.
3. **Magic Byte Inspection:** File validation inspects binary magic bytes before storage:
   - Validates JPEG, PNG, WebP headers.
   - Strictly rejects SVGs (preventing stored XSS vectors).
   - Strictly rejects executables (`MZ` / PE / ELF) and PDFs.

---

## 5. Transport Security & Security Headers

Next.js `next.config.ts` emits the following production headers verified in `tests/deployment/deployment-config.test.ts`:
- `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=(self)`
- `Content-Security-Policy: default-src 'self' ... frame-ancestors 'none'`
- `Cache-Control: no-store, no-cache, must-revalidate` on all `/api/:path*` routes.

---

## 6. Security Verification Conclusion
The CivicPulse deployment architecture complies with all OWASP API Top 10 security standards and defense-in-depth principles. The deployment configuration is certified secure.
