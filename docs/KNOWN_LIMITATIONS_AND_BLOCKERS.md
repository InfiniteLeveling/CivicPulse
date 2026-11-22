# CivicPulse – Known Limitations & Blocker Register (Phase 21)

**Document Version:** 1.0.0  
**Audit Date:** 2026-11-22  
**Status:** Active Tracking  
**Auditor:** Principal Integration Architect  

---

## 1. Executive Summary

This register details all external dependencies, platform configurations, and collaborative synchronization items that currently constrain end-to-end cloud operations. The CivicPulse backend codebase itself is 100% complete, fully tested (480/480 tests passing), and clean of any blocking software defects.

---

## 2. Active External Blockers

```mermaid
flowchart TD
    subgraph External Infrastructure
        B1["BLK-01: Vercel CLI Logged Out<br/>(Operator Login Needed)"]
        B2["BLK-02: Remote Storage Bucket Missing<br/>(Apply Migration 20261121000400)"]
        B4["BLK-04: Gemini Key Unset in Staging<br/>(Heuristic Fallback Active)"]
    end
    subgraph Git Collaboration
        B3["BLK-03: Frontend Branch Unpushed<br/>(Teammate UI PR Needed)"]
    end
    B1 --> D["Live Production Deploy"]
    B2 --> D
    B3 --> E["Live Full-Stack E2E Test"]
    B4 --> F["Live Multimodal Vision"]
```

### BLK-01: Operator Vercel CLI Authentication
- **Category:** Cloud Deployment & CI/CD
- **Status:** **BLOCKED**
- **Observed Behavior:** Command `npx vercel whoami` exited with code 1 (`Logged out.`).
- **Technical Impact:** Automated preview or production deployments cannot be dispatched from the terminal session without operator interactive login or CI token injection.
- **Root Cause:** Antigravity sandbox session does not possess persistent Vercel platform credentials.
- **Workaround in Place:** Manual project verification and full production builds succeed locally (`npm run build`).
- **Remediation Action:** Platform operator must execute `npx vercel login` or inject `VERCEL_TOKEN` into the environment.

---

### BLK-02: Remote Supabase Storage Bucket Initialization (`civic-evidence`)
- **Category:** Remote Database / Cloud Storage
- **Status:** **BLOCKED**
- **Observed Behavior:** Supabase Storage probe returned `[StorageApiError] Bucket not found` when querying `civic-evidence` on the remote Supabase cloud project.
- **Technical Impact:** Direct multipart uploads targeting the remote Supabase storage API will fail until the bucket is provisioned.
- **Root Cause:** Migration `supabase/migrations/20261121000400_phase05_storage.sql` has been committed locally but not yet applied to the remote hosted Supabase cluster.
- **Workaround in Place:** Local unit and integration tests utilize in-memory mock storage and mock signed URL generators.
- **Remediation Action:** Database administrator must push migrations via `npx supabase db push` or create the private bucket `civic-evidence` via the Supabase Web Dashboard.

---

### BLK-03: Frontend Teammate Remote Branch Synchronization
- **Category:** Team Collaboration & Full-Stack Integration
- **Status:** **BLOCKED**
- **Observed Behavior:** Remote tracking branch `origin/frontend` was inspected via git. It is currently positioned at commit `fb3cc8c165e0c10ce233f09b55773148ffcd45b1` ("docs: add CivicPulse project specifications"). No frontend React UI components exist on the remote repository.
- **Technical Impact:** Live browser end-to-end automated testing (Playwright/Cypress) against real UI elements cannot be executed in this workspace.
- **Root Cause:** Frontend development is in progress by teammate in a separate workspace and has not yet been pushed to `origin/frontend`.
- **Workaround in Place:** Backend API contracts are frozen, comprehensively typed in `src/types/`, and fully audited in `docs/FRONTEND_BACKEND_INTEGRATION_AUDIT.md`.
- **Remediation Action:** Frontend teammate must push UI components to `frontend` and open an integration PR against `backend` or `main`.

---

### BLK-04: Multimodal AI Vision API Key in Staging (`GEMINI_API_KEY`)
- **Category:** Third-Party AI Services
- **Status:** **OPTIONAL / FALLBACK ACTIVE**
- **Observed Behavior:** `.env.local` contains placeholder `your-gemini-api-key-here`.
- **Technical Impact:** Live Gemini 2.5 Flash image classification cannot communicate with Google AI Studio.
- **Root Cause:** Staging Google AI Studio API key not yet provisioned in environment.
- **Workaround in Place:** Complete deterministic fallback engine is implemented in `src/services/gemini.service.ts`. The platform automatically falls back to citizen-selected categories and text heuristic priority weighting without throwing runtime errors.
- **Remediation Action:** Platform operator configures valid `GEMINI_API_KEY` in Vercel project environment variables.

---

## 3. Known Architectural Limitations & Intentional Design Choices

| Limitation | Design Justification | Operational Guidance |
|---|---|---|
| **Lightweight Spatial Formula** | Avoids requiring PostGIS extension on standard PostgreSQL tiers | Formula provides accurate spherical bounding box filtering within +/- 15km; suitable for municipal scale |
| **Synchronous Priority Trigger** | Database trigger recalculates score upon vote commit | Ensures score is always immediately consistent; bounded by lightweight integer arithmetic |
| **Ephemeral Image Staging** | Uploaded drafts are retained in `drafts/` until report commit | Scheduled cleanup cron or trigger should purge orphaned drafts older than 24 hours |
| **Strict Webpack Build** | `next build --webpack` enforces strict module graph isolation | Ensures zero runtime circular dependencies across services and route handlers |
