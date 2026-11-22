# CivicPulse – Production Release Gate Checklist (Phase 20)

**Document Version:** 1.0.0  
**Target Milestone:** Production Release (Phase 21 Handoff)  
**Status:** RELEASE CRITERIA DEFINED & PENDING OPERATOR SIGN-OFF  
**Date:** 2026-11-21  

---

## 1. Production Release Gate Overview

Promoting CivicPulse from Preview/Staging to Production is an explicitly protected operation.
No production deployment, branch merge into `main`, or production database migration may be executed without 100% completion of the following verification gates:

---

## 2. Mandatory Verification Gates

### Gate 1: Code Quality & Regression Invariants
- [x] Working branch is `backend` (0 unauthorized branch switches).
- [x] Frontend branch remains untouched.
- [x] ESLint runs with 0 errors and 0 warnings (`npm run lint`).
- [x] TypeScript compiler passes with 0 errors (`npm run typecheck`).
- [x] Full automated test suite passes 100% (474 / 474 tests passed across 17 suites via `npm test`).
- [x] Production build succeeds with 0 errors (`npm run build`).
- [x] Dependency audit reports 0 vulnerabilities (`npm audit`).

### Gate 2: Security & Secrets Hygiene
- [x] Zero exposed secrets in repository or documentation.
- [x] `.env*` files excluded by `.gitignore`.
- [x] `.vercel` excluded by `.gitignore`.
- [x] Public variables restricted to `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
- [x] `GEMINI_API_KEY` is strictly server-only.
- [x] Security headers and strict CSP configured in `next.config.ts`.
- [x] `Cache-Control: no-store` enforced across all `/api/:path*` route handlers.
- [x] Sliding-window rate limiting active on upload, AI, upvote, and duplicate endpoints.

### Gate 3: Database & Migration Readiness
- [x] All 16 chronological migrations reviewed and verified.
- [x] PostgreSQL RLS enabled and forced on all 11 public tables.
- [x] `vote_self_active_hardening` policy blocks citizen self-voting.
- [x] `REVOKE EXECUTE FROM PUBLIC` applied to all database triggers.
- [x] Audit tables `report_history` and `priority_history` are read-only to clients.
- [ ] Migrations applied to Production Supabase cluster via `npx supabase db push`. *(Pending Production Authorization)*

### Gate 4: Supabase Production Auth & Storage Setup
- [ ] Site URL set to `https://civicpulse.org` in Supabase Auth settings.
- [ ] Redirect allowlist configured with production canonical domains.
- [ ] Bucket `report-images` verified private (`public = false`) in Production.
- [ ] Signed URL expiration configured (default 3600s).

### Gate 5: Production Environment Variables in Vercel
- [ ] `NEXT_PUBLIC_SUPABASE_URL` configured in Vercel Production scope.
- [ ] `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` configured in Vercel Production scope.
- [ ] `NEXT_PUBLIC_APP_URL` configured to `https://civicpulse.org`.
- [ ] `GEMINI_API_KEY` configured in Vercel Production scope with dedicated billing quota.

### Gate 6: Operator & Release Sign-Off
- [ ] Operator explicit approval for Git merge: `backend` -> `main`.
- [ ] Operator explicit approval for Production promotion in Vercel.
- [ ] Phase 21 final comprehensive infrastructure connection audit scheduled.

---

## 3. Production Release Status
**Status:** **CONDITIONAL (READY PENDING OPERATOR AUTHORIZATION)**  
All automated code, build, security, and migration checks are 100% verified. Production promotion awaits external authorization.
