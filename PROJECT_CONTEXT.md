# CivicPulse project handoff

## Current milestone · Phase 05 storage and image upload infrastructure

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

## Keeping the handoff current

After each authorized development session, update the evidence snapshot, tested behaviors, exact revision or working-tree changes, known failures and the next smallest integration gate. Move a claim to Tested only when there is a recorded passing check. Record changes to contracts in their numbered document and capture changed design choices in the decision log. Future agents should follow [repository instructions](AGENTS.md).
