# Decision log

“Confirmed” means specified by the supplied project brief or observed in Git. It does not imply an implementation, procurement agreement or formal historical approval. Original decision dates are unknown for all entries. Revisit proposed choices after pilot discovery. Add a superseding ID and retain the old entry when changing direction.

| ID | Status | Context and selected approach | Alternatives considered | Rationale and consequence | Detail |
|---|---|---|---|---|---|
| D01 | Confirmed | One developer builds Next.js App Router with React and TypeScript | Separate React and Express projects | Shared deployment and contracts reduce coordination; server/client boundaries need care | [Frontend](07-FRONTEND-ARCHITECTURE.md) |
| D02 | Confirmed | Supabase PostgreSQL, Auth, Storage and Realtime baseline | Self-managed database, identity and object store | Faster integration; require tested grants, RLS and private media policies | [Database](09-DATABASE-DESIGN.md) |
| D03 | Confirmed | Gemini for optional photo analysis | Custom training or fully manual-only design | Avoid collecting training corpus; validate outputs, budget and consent | [Intelligence](11-AI-IMPLEMENTATION.md) |
| D04 | Confirmed | Modular monolith with Node Route Handlers and services | Microservices and queues per feature | One transaction boundary and one deployable during hackathon | [Backend](08-BACKEND-ARCHITECTURE.md) |
| D05 | Confirmed baseline | Explainable capped rule-based priority | ML ranking, raw popularity | Easy to inspect and test; fairness and safety need independent review | [Intelligence](11-AI-IMPLEMENTATION.md) |
| D06 | Confirmed baseline | Haversine, approximate 100 m radius and human confirmation | PostGIS first or automatic merge | Low setup cost; bound candidate scan and retain false-match escape | [Intelligence](11-AI-IMPLEMENTATION.md) |
| D07 | Proposed | Mobile-first citizen intake with keyboard/list alternatives | Desktop-first intake | People can report at the asset; GPS and tiles need fallback | [UI](06-UI-UX-DESIGN-SYSTEM.md) |
| D08 | Proposed | One campus and simulated or participating facilities desk | Citywide launch | Bounded ownership and easier evaluation; real operator unconfirmed | [Overview](00-PROJECT-OVERVIEW.md) |
| D09 | Confirmed | Manual category and description whenever AI is unavailable | Require provider response before submit | Core reporting survives optional service failures | [Flows](05-USER-FLOWS.md) |
| D10 | Proposed | Four workflow states; separate author verification and review requests | Immediate final closure on staff update | Preserves dispute history; review needs an accountable admin | [API](10-API-SPECIFICATION.md) |
| D11 | Proposed | Separate private/detail and peer-safe read projections | Publish original photos and exact pins | Reduce disclosure; approximate markers can still identify sparse locations | [Privacy](12-SECURITY-AND-PRIVACY.md) |
| D12 | Confirmed snapshot | main, backend and frontend observed | Optional future develop | Preserve real refs and avoid assuming a new integration branch exists | [Git workflow](17-GITHUB-WORKFLOW.md) |
| D13 | Proposed | Defer notifications, heatmaps, advanced analytics, offline and voice | Full release in one hackathon | Reserve time for authenticated report-to-resolution loop | [Roadmap](14-MVP-ROADMAP.md) |

## Reconciliation with the companion specifications

**D16 · Confirmed · Phase 03 authorization.** Grant admin-only triage on department, severity and visibility, and expose public cases through a filtered, coarse projection. A single database trigger writes initial support and report history. Status transitions and private media attachment require subsequent controlled workflows. See [security architecture](SECURITY_ARCHITECTURE.md).

**D15 · Confirmed · 2026-11-21 · Phase 02 schema.** The database brief finalizes citizen/admin, seven categories including damaged_infrastructure, and three statuses. Citizen verification remains a future review action. Retain per-author submission uniqueness, versioned history and private publication; store the bounded priority with zero uncalculated. Attached image metadata requires a report ID, so transient uploads need independent staging in Phase 05. Earlier schema proposals are preserved as design history. See the [implemented column dictionary](DATABASE_SCHEMA.md) and [integration contract](DATABASE_CONTRACT.md).

**D14 · Confirmed · 2026-11-21 · Phase 01 response contract.** The phase implementation request specifies a success discriminant, a data payload and a safe code/message error object. Use that envelope in new JSON handlers. The earlier proposal included request IDs and field details; these remain future extensions. The health route exercises the shared success path. See the [implemented contract](10-API-SPECIFICATION.md).

The [original PRD](PRD.md), [frontend specification](frontend.md) and [backend specification](backend.md) appeared during this documentation session. All three describe prospective work. The current brief controls the solo schedule and release priorities. Use the numbered documents together for the proposed contracts. No deployed consumer or migration was found.

| Topic | Working resolution |
|---|---|
| Staffing and schedule | Earlier three-person assignments are planning assumptions. Use one developer. AI, matching, support, scoring and repair photos are P1. Advanced analytics and heatmap are P2. Keep the earlier under-60-second submission target as a timed demo experiment. |
| Vocabulary and discovery | Retain the original six category values, including water_leakage and drainage; other covers uncategorized unsafe infrastructure. Preserve public map access, private reporting, CP reference, title, supported list, 2 MB image limit, initial author vote, critical-first sort and duplicate recheck. |
| Privacy and roles | Preserve citizen/admin and sanitized public discovery. Officer is a proposed department-scoped extension; an admin can operate the initial synthetic pilot. Explicit publication choice and private images are proposed safeguards. |
| Resolution | The companion plan requires a photo and remark to resolve. The current brief puts evidence in P1. P0 accepts a note alone. Demonstrate the P1 evidence flow with a private after-photo. The earlier design stores citizen verification as feedback; the numbered design proposes a distinct verified state. Confirm the representation before implementing reviews. |
| AI and API conventions | The earlier backend plan stores validated AI analyses and provisional severity. The numbered proposal keeps suggestions transient until privacy and retention are agreed and gives severity control to staff. Original camelCase, page-number REST examples remain in backend.md. The numbered proposal uses snake_case, cursors and separate assignment/review operations following the request’s endpoint examples. Agree on one contract before implementing clients. |
| Delivery evidence | The three earlier workstreams, hosted deployment, demo accounts and provider calls describe intentions. Optional Realtime refresh and the local demo fallback remain useful. |



For each new decision record date if known, evidence, alternatives, consequence, affected tests and linked documents. Resolve unanswered dependencies through the [question register](21-OPEN-QUESTIONS.md).
