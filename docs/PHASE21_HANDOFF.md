# CivicPulse – Phase 21 Infrastructure & API Connection Handoff Guide

**Document Version:** 1.0.0  
**Handoff From:** Phase 20 (Deployment Preparation & Verification)  
**Target Phase:** Phase 21 (Final Setup, API Connections & Infrastructure Verification)  
**Date:** 2026-11-21  

---

## 1. Boundary & Phase Distinction

- **Phase 20 (Completed Scope):**
  - Next.js serverless compatibility & production webpack build verification.
  - Complete 17 test suites (474 tests, 100% pass rate).
  - Vercel deployment configuration, security headers, CSP, and rate limiting.
  - Supabase 16-migration catalog verification and privilege hardening.
  - Environment variable matrix & secret hygiene tools (`npm run check:env`).
  - Rollback and disaster recovery planning.
- **Phase 21 (Pending Scope):**
  - **Do NOT mark Phase 21 complete during Phase 20.**
  - Comprehensive live infrastructure connection verification with active remote services.
  - Frontend-to-backend integration audit once the `frontend` branch is merged into `main`.
  - Live Realtime subscription testing across multi-client browser sessions.
  - Live Gemini API quota verification and paid tier monitoring.
  - Live production domain DNS and SSL certificate verification.

---

## 2. Phase 21 Verification Checklist for Lead Engineer

### 2.1 Live Supabase Infrastructure Audit
1. Run `npx supabase migration list` against the remote Supabase project to verify that all 16 migrations are marked as applied.
2. Confirm Row Level Security is active on all 11 tables in the live database catalog.
3. Test a live citizen signup and login through the hosted Supabase Auth service.
4. Verify email confirmation callbacks redirect to the approved preview/production URL.
5. Verify bucket `report-images` is private and signed URLs generate without CORS errors.

### 2.2 Live Gemini Multimodal AI Audit
1. Submit a live image buffer to `POST /api/ai/classify`.
2. Confirm the response contains parsed `suggested_category`, `suggested_severity`, `suggested_title`, and `suggested_description`.
3. Verify that requests without an API key gracefully degrade to manual reporting without throwing unhandled server errors.

### 2.3 Live Realtime WebSocket Audit
1. Open an authenticated browser connection to Supabase Realtime channel `report:<id>`.
2. As an administrator, update the complaint status via `PATCH /api/reports/<id>/status`.
3. Confirm that the broadcast event `report_updated` is delivered to the citizen's browser in real-time.

### 2.4 Final Frontend Integration Audit
1. Once the frontend developer merges their UI components into the shared integration branch:
2. Verify that Leaflet map components consume `/api/reports/map` markers seamlessly.
3. Verify that complaint creation forms post to `/api/upload` and `/api/reports` according to the [API_CONTRACT.md](API_CONTRACT.md).
4. Verify that the admin dashboard visualizes the 6 operational endpoints under `/api/admin/analytics/*`.
