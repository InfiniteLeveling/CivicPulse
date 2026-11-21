# CivicPulse | Product Requirements Document (PRD)

**Version:** 1.0 · Hackathon MVP  
**Theme:** Open Innovation / Civic Technology / Smart Cities  
**Team:** 3 intermediate full-stack developers  
**Timebox:** 24–36 hours  
**Tagline:** Report Smarter. Resolve Faster. Build Better Cities.

## 1. Product overview

CivicPulse is a mobile-friendly civic issue reporting and resolution platform that connects citizens with a simulated municipal authority. It converts photo-based reports into classified, geotagged, prioritized issues, consolidates likely duplicate complaints, and makes resolution progress visible. The MVP demonstrates the complete workflow without relying on a live government partnership.

## 2. Problem statement

Citizens encounter public infrastructure problems such as potholes, uncollected garbage, water leakage, blocked drains and damaged streetlights. Reporting channels may be fragmented; citizens may not know the responsible department or be able to track progress. Authorities can face duplicate reports, incomplete location details and inconsistent prioritization. CivicPulse addresses these problems through a unified reporting workflow, AI-assisted classification, location-based duplicate suggestions, explainable priority scoring and evidence-backed resolution tracking.

## 3. Users and permissions

| User | Needs | Allowed actions |
|---|---|---|
| Visitor | Understand the product and explore published issues | View landing page and public map/details |
| Citizen | Report a problem and track its progress | Register, create reports, support existing issues once, view own reports, view published status history |
| Admin (simulated authority) | Triage and resolve issues | View queues, correct classification/severity, assign departments, update statuses, attach resolution proof, view analytics |

Public signup creates citizens only. Admin accounts are provisioned securely before the demo. Public reports never expose reporter email, account ID or other private account information.

## 4. Goals and success criteria

- Make a complete photo-to-report flow usable on mobile, with manual fallbacks for AI and GPS failure.
- Demonstrate one real AI classification request and one duplicate suggestion confirmed by a second citizen.
- Demonstrate explainable priority scoring, department assignment, status history and resolution evidence.
- Deploy a working application with two citizen accounts and one admin demo account; keep a local demo fallback.
- Demonstrate that duplicate votes, unauthorized status changes and private image access are blocked.
- Target a report submission in under 60 seconds in a prepared demo environment; measure it rather than claiming guaranteed performance.

These are prototype targets, not evidence of real-world improvements. No claim of municipal adoption, reduced repair times or globally unique invention is made.

## 5. Scope and feature requirements

P0 = required for end-to-end demo; P1 = valuable after P0; P2 = future/optional. Do not begin P2 until the core flow is tested.

| ID | Priority | Feature | Acceptance criteria |
|---|---|---|---|
| F01 | P0 | Authentication and roles | Citizen can sign in; admin route and mutations reject citizens; public signup cannot set admin role. |
| F02 | P0 | Photo-based reporting | Valid photo, title, category, description and confirmed location create a report with unique reference. |
| F03 | P0 | AI classification | Gemini proposes category, severity and description; citizen can correct category; outage does not block manual reporting. |
| F04 | P0 | Location and public map | Browser GPS or manual map pin; published reports appear as category/status markers; denied GPS has fallback. |
| F05 | P0 | Duplicate suggestions | Same-category unresolved reports within 100 m are suggested; user explicitly chooses support or separate report. |
| F06 | P0 | Community support | One support per citizen per issue; repeat request is idempotent; reporter is counted once. |
| F07 | P0 | Explainable priority | Backend computes severity, support and age contributions; queue sorts correctly; critical severity flagged independently. |
| F08 | P0 | Admin triage | Admin can assign department, correct severity and set valid status transitions; citizens cannot. |
| F09 | P0 | Tracking and history | Submitted, In Progress and Resolved states visible; assignment/status changes are recorded; refresh shows latest state. |
| F10 | P0 | Resolution proof | Admin uploads a photo and remark to resolve; missing evidence blocks resolution; before/after displayed if safe to publish. |
| F11 | P0 | Responsive UI | Mobile report form and desktop admin work; keyboard navigation, labeled controls and meaningful empty/error/loading states. |
| F12 | P1 | Realtime updates | Citizen timeline refreshes automatically after authorized backend changes; polling/manual refresh fallback. |
| F13 | P1 | Analytics | Accurate report counts, category breakdown, backlog and resolution rate; charts use real database values. |
| F14 | P1 | Citizen verification / reopen | Reporter confirms resolution or requests review with reason; admin can reopen to In Progress; no silent automatic reopen. |
| F15 | P1 | Heatmap | Visualize published issue density; label as reporting density, not prevalence of all city problems. |
| F16 | P2 | Notifications / multilingual / offline | In-app/email reminders, Bengali/Hindi language support, offline drafts and ward filters. |
| F17 | P2 | Government integration | Real department routing, jurisdiction boundaries, official SLAs and production moderation require agreements and verified data. |

Out of scope: training an ML model, native mobile apps, live emergency dispatch, microservices, payment, predictive maintenance, facial recognition, and automated proof of repair.

## 6. Core user journey

1. Citizen signs in, uploads a civic issue photo, and requests AI classification.
2. Citizen confirms category and location (GPS or map pin), adds title and description.
3. Server validates input and returns possible duplicate issues. Citizen supports one or explicitly creates a separate issue.
4. New issue starts as `pending`, severity defaults to `medium` unless a validated AI suggestion exists. AI severity is provisional until reviewed. The reporter receives one support record.
5. Admin reviews the issue, checks provisional severity, assigns the simulated department and begins work.
6. Citizen sees progress via history and status, with refresh or realtime where implemented.
7. Admin uploads resolution proof and a remark, marks issue `resolved`; citizen views evidence. Optional P1 citizen verification/reopen review.

Emergency disclaimer: CivicPulse is not an emergency response service. Immediate hazards should be reported via appropriate official emergency channels. Critical AI suggestions are flags for human attention, not emergency determinations.

## 7. Shared business rules (contract for all three documents)

### Categories and department mapping

| Category value | Display label | Suggested department |
|---|---|---|
| `pothole` | Pothole / road damage | Road Maintenance |
| `garbage` | Garbage | Sanitation |
| `water_leakage` | Water leakage | Water Supply |
| `streetlight` | Streetlight | Electrical |
| `drainage` | Drainage blockage | Drainage |
| `other` | Other | Unassigned / manual review |

### Status lifecycle

`pending → in_progress → resolved`. Assignment is an independent department field, not a fourth status. Admin may resolve only from `in_progress` with evidence and a remark. P1: an admin-approved reopen moves `resolved → in_progress`; retain all previous history/proof. Report visibility is separate (`public` or `private`); public map includes only public issues. Private reports are visible to reporter and admins, and cannot receive public support.

### Duplicate detection

Same category + unresolved (`pending`/`in_progress`) + within configurable 100 m + visible to caller. Rank by distance and return up to five. GPS can be inaccurate and nearby separate defects can exist; never auto-merge. User confirmation or admin review is necessary. Check again at creation; if candidates appeared since preview, require confirmation of those candidate IDs before creating separately. For this prototype simultaneous creations can still race; a transactional spatial dedup workflow is future work.

### Priority engine

```
severityPoints = { low: 15, medium: 30, high: 50, critical: 70 }
supportPoints = min(3 × uniqueSupportCount, 20)
agePoints = min(2 × floor(daysOpen), 10)
priorityScore = severityPoints + supportPoints + agePoints
```

Score range is 0–100 by design (actual minimum for a valid issue with initial support is 18). Initial reporter counts once. Urgent: score ≥ 70 or critical severity; medium: 40–69 unless urgent; low: below 40 unless urgent. Only unresolved issues appear in active queue. Sort critical severity first, then score descending, then oldest first. Age derives from UTC `created_at`; resolved issue score uses `resolved_at`. Compute dynamically on reads to avoid stale waiting-time values. This is a proposed prioritization heuristic, not a municipal standard. Do not allow vote count alone to determine safety urgency.

## 8. Architecture and agreed stack

```
Citizen UI / Admin UI (Next.js + React + TypeScript)
             ↓ authenticated REST requests
Next.js Route Handlers → Zod validation → service modules
             ├── Supabase Auth / PostgreSQL / Storage
             ├── Gemini multimodal API (server only)
             └── Haversine search / priority / analytics
Browser: React Leaflet + map tiles + Geolocation API
Optional Supabase Realtime: safe change signals → refetch API
```

Deployment: Vercel + hosted Supabase. Styling: Tailwind CSS, shadcn/ui, Lucide React; charts: Recharts. Start with Haversine and filtered database queries; PostGIS is future scaling. No separate Express server is required.

## 9. Non-functional requirements

- Security: verified sessions and server-side authorization; RLS and storage policies; restricted sensitive columns; no service key or Gemini key in browser; parameterized queries; input validation and upload quotas.
- Privacy: optional private reporting; public photos reviewed by user for faces/plates, remove EXIF before storage; avoid publication of sensitive photos and exact home locations. Admin must be able to hide public content. Private photo URLs require authorized access; public media is accessible to anyone once shared.
- Accessibility: labeled controls, keyboard focus, status text with colors, adequate contrast, mobile tap targets around 44 px, list alternative to map.
- Reliability: AI and GPS fallback, retryable upload, error envelopes, idempotent support and linear status transitions; test external quota before event.
- Performance: compressed images (target ≤ 1 MB, hard maximum 2 MB), lazy-load maps/charts, pagination, bounded duplicate candidate search, no expensive model training.
- Data integrity: update report state and append history atomically; one vote per user/report; protect admin roles and derived fields.

## 10. Delivery plan and owners

| Elapsed hours | Member A: Frontend | Member B: Backend | Member C: Innovation & integration |
|---|---|---|---|
| 0–3 | Design tokens, routes | Repo, schema, auth | API contract, demo plan, keys |
| 3–10 | Login, report, list screens | RLS, storage, report APIs | AI classification + fallback |
| 10–17 | Map, duplicate modal | Support & history transactions | Haversine, scoring and tests |
| 17–24 | Admin queue and status form | Admin endpoints, resolution proof | Integration, deploy early |
| 24–30 | Responsive polish, P1 charts | Realtime/analytics if stable | Security and demo verification |
| 30–36 | Bug fixes, presentation | Production smoke tests | Rehearsal, backup demo |

For a 24-hour event, stop adding features by hour 20 and use the last 4 hours for integration and demo. Merge small PRs, agree on types in hour 1 and use seeded demo data while APIs are under construction.

## 11. Demo and release acceptance checklist

- [ ] Two citizens and one admin can log in; visitor can see public map.
- [ ] Citizen 1 reports a pothole with photo, AI category and confirmed map location.
- [ ] Citizen 2 submits similar input; duplicate candidate shown; support count increments once, not report count.
- [ ] A nearby different category or distant issue does not match.
- [ ] Admin sees score breakdown and assigns Road Maintenance.
- [ ] Citizen cannot perform admin write via direct request.
- [ ] Admin moves to In Progress and then Resolved with proof and remark; history persists.
- [ ] Citizen sees latest status and before/after evidence where authorized.
- [ ] GPS denied and AI unavailable paths still allow reporting.
- [ ] Private report and account data are not exposed to unrelated visitors.
- [ ] Deployment, seed data and demo script are ready; no keys in GitHub.

## 12. References and implementation files

- [Next.js](https://nextjs.org/docs) · [Supabase](https://supabase.com/docs) · [Gemini API](https://ai.google.dev/gemini-api/docs)
- [React Leaflet](https://react-leaflet.js.org/) · [OSM tile usage policy](https://operations.osmfoundation.org/policies/tiles/)
- [FixMyStreet](https://github.com/mysociety/fixmystreet) (existing civic-reporting project to study; review its license before reuse).
- `frontend.md`: user interfaces, routes, components, integration and frontend acceptance tests.
- `backend.md`: database, REST contracts, security, algorithms and backend acceptance tests.

**Assumptions:** municipal operations are simulated; AI, tile and hosting quotas must be checked before the event; no external integrations or production deployment have been verified by this document. All schema and API details are implementation specifications, not already-built code.
