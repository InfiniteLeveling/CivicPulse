# Open questions and release consequences

Status: Not verified / Requires confirmation for the outstanding items below. Defaults are working proposals for a synthetic demo only. Priority indicates when a decision matters; unresolved live-pilot governance does not block a synthetic prototype.

| Priority / question | Working default | Who or what can resolve it | Consequence if open |
|---|---|---|---|
| P0 · Which campus and which accountable authority? | Simulated campus desk | Facilities sponsor and operator | No live intake or repair commitment |
| P0 · Where are jurisdiction boundaries and which departments own each category? | Single site, seed codes and unassigned queue | Facilities asset register and agreed map | Real reports may reach wrong desk |
| P0 · What identity evidence and admin onboarding are acceptable? | Verified demo email; separate trusted grants | Institution and identity operator | No real staff authorization or assurance about citizen identity |
| P0 · Which retention, consent, deletion and metadata policies apply? | Synthetic fixtures; one-hour staged expiry proposed | Privacy lead or designated institutional contact | Cannot specify live retention or share real photos |
| P0 · What emergency message and escalation contact apply locally? | State non-emergency use; simulated manual escalation | Pilot operations | Do not claim dispatch or safety response |
| P0 · Are auth email, Supabase, Vercel and storage resources available? | Document requirements only | Project owner checks environment and access | Hosted integration tests cannot yet be evidenced |
| P0 · Which transitions and resolution proof does the desk accept? | Pending → in_progress → resolved, then author verifies; note sufficient at P0 | Desk and resident walkthrough | Timeline semantics remain provisional |
| P1 · Who handles disputes, for how long, and what evidence is required? | One pending author request; admin reviews reason | Facilities sponsor | No promised response time or automatic reopen |
| P1 · Who reviews sensitive images and appeals? | Admin hides with reason; maintain restricted audit | Pilot moderator and privacy contact | Unsafe material may persist without staffing |
| P1 · Which Gemini model, region, terms and daily spend? | Disabled until configured and consented | Project owner and institution | AI unavailable; manual intake remains usable |
| P1 · Is 100 m suitable across buildings, floors and assets? | Same category and explicit human decision | Labeled site observations | False positives or missed duplicates |
| P1 · Are weights, severity authority and overdue targets appropriate? | Use documented caps; target unknown until agreed | Desk reviews blinded examples | Ranking provisional, no SLA claim |
| P1 · Is the peer map sufficiently private for a small campus? | Round coordinates and restrict free text, images and identifiers | Pilot privacy review | Limit exposure to synthetic map data |
| P2 · Which locales, notification channel and provider? | English, optional in-app inbox; no external provider | User research and budget owner | Reach, consent and delivery reliability unknown |
| P2 · Which offline, worker and institutional requirements justify expansion? | Defer until observed demand | Pilot interviews and operational metrics | Avoid estimating production scope or costs prematurely |

## Previously unknown items resolved by inspection

The Phase 1 brief resolved the frontend wire contract and status vocabulary on 2026-11-21. The client uses the companion backend contract and the three states pending, in_progress and resolved. Backend implementation and future review migrations still require their own verification. See [decision D14](20-DECISION-LOG.md).

Git showed main and remote-tracking main/backend/frontend at b40a765; the previous turn verified remote creation of backend and frontend. The baseline commit contains only empty wd.txt. No application implementation or deployment was found in the repository. Work on other machines and provider accounts is unverified. Recheck repository status next session and record the exact evidence in the [handoff](../PROJECT_CONTEXT.md).
