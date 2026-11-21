# CivicPulse project handoff

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

## Keeping the handoff current

After each authorized development session, update the evidence snapshot, tested behaviors, exact revision or working-tree changes, known failures and the next smallest integration gate. Move a claim to Tested only when there is a recorded passing check. Record changes to contracts in their numbered document and capture changed design choices in the decision log. Future agents should follow [repository instructions](AGENTS.md).
