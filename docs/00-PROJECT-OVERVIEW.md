# CivicPulse · Intelligent Civic Problem Resolution

**Report Smarter. Resolve Faster. Build Better Cities.** Open Innovation hackathon · Civic technology · Single-developer MVP · 24–36 hours.

A student sees a broken streetlight, photographs it and marks the spot. Maintenance gets one traceable case. The student can return to that case, see when work started and inspect the repair. Nearby students can support an existing report. The value to test is whether both sides can answer “who owns this issue and what happened next?” from the same record.

## Planned journey

1. Sign in, choose a sanitized photo, describe the issue and confirm the location.
2. With consent, get an editable image suggestion. Manual reporting works independently.
3. Compare active nearby reports. Support an existing one or create a separate case.
4. Rank active work using severity, support and age. Route by the confirmed category or leave it for assignment.
5. Authorized staff take ownership, record progress and submit a repair note and optionally evidence.
6. The author verifies the repair or asks for review. Preserve the original event sequence.

## Technical view

One Next.js application serves React pages and Node.js Route Handlers. A shared service layer validates permissions, owns transitions and commits related PostgreSQL writes together. Supabase provides identity, relational storage, private image storage and optional Realtime refresh. Gemini is an optional server-side adviser. See [backend architecture](08-BACKEND-ARCHITECTURE.md) and [ai implementation](11-AI-IMPLEMENTATION.md).

## Pilot and acceptance

Start with one campus, synthetic reports and a simulated maintenance desk. Seek an actual desk willing to own one queue, agree on categories and contact procedures, then shadow a small opt-in trial. Expand to another department only after reviewing misrouting, privacy complaints and unresolved cases with the first desk. Potential later adopters include societies, municipalities and NGOs.

The hackathon succeeds if a citizen submits on a phone with GPS denied and AI unavailable, another account with staff authority updates the case, and the author sees the history after reload. Demonstrate extensions only after their own tests pass. Targets and instrumentation are in [prd](02-PRD.md).

## Evidence and reading order

Repository baseline: one commit containing empty wd.txt. The architecture is confirmed by the supplied brief as a design baseline. All product behavior below is prospective. Start with the [handoff](../PROJECT_CONTEXT.md), then read [prd](02-PRD.md), [feature requirements](04-FEATURE-REQUIREMENTS.md), [database design](09-DATABASE-DESIGN.md) and [api specification](10-API-SPECIFICATION.md) together.
