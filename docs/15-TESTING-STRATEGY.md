# Testing strategy

Proposed suite, all cases unexecuted. Use synthetic locations, sanitized images, two citizens C1/C2, two officers in different departments and admin A. Record build, environment, browser, actor, inputs, observed results and pass/fail. A row passes only when every stated outcome holds including absence of unintended writes. Reset fixtures between runs.

| Case and layer | Inputs or action | Expected output / pass criterion |
|---|---|---|
| T01 Auth | Register citizen, confirm email, log out and use expired session | New user has citizen role; protected API returns 401 after expiry |
| T02 RLS and column grants | C2 requests C1 base row, raw photo and peer DTO | Direct sensitive paths denied; listed DTO contains only safe fields |
| T03 Staff scope | Officer B opens or changes department A case; admin then reassigns case | B denied before assignment; former officer loses exact access after reassignment |
| T04 Role protection | Citizen submits role property to preferences or asks for admin queue | Rejected; profile role and department unchanged |
| T05 Upload | Valid oriented JPEG with EXIF, renamed text file, oversized PNG and extreme pixel dimensions | Valid output decodes correctly without metadata; others rejected with no bound object |
| T06 Storage | C2 attempts to bind C1 staged image; expired staged image submitted | Both rejected; no report or event created |
| T07 API retry | Send identical create twice concurrently; resend same key with changed text | Same report ID and one image/event; changed body returns 409 |
| T08 E2E P0 | Deny GPS, disable AI, use manual point, submit, assign, start and resolve with note | One receipt, expected department, sequential versions and matching author timeline after reload |
| T09 Invalid intake | Submit NaN coordinate, latitude 91, short description or unknown category | 422 on invalid field; no committed report |
| T10 Unit distance | Two same-category active pins at 0, 99.9 and 100.1 m from input; unit boundary at 100 m | First two included, 100.1 excluded, comparison includes exact 100 |
| T11 Candidate scope | Hidden, resolved, linked and different-category nearby cases plus two separate lamps | Excluded cases absent; user may create distinct report despite two suggestions |
| T12 Votes | Two simultaneous support requests by C2 for same report | Exactly one vote; reported count matches database |
| T13 Unit score | low/0 votes/0 days; high/4/2; critical/9/7; medium/1/23 h | Scores 15, 66, 100, 33. Equal scores order by creation then ID |
| T14 Critical review | New critical report with initial author vote | Score 73 and separate unacknowledged review flag |
| T15 State conflict | Two staff transitions from same version; try pending directly to verified | One valid transition wins, stale returns 409; invalid transition produces no event |
| T16 Evidence and reopening | Attach owned report-specific evidence, resolve, confirm as author then dispute and approve reopen | Attachment and history atomic, verified recorded, review restores in_progress, audit intact |
| T17 AI adapter | Valid fixture response, malformed JSON, unknown enum, timeout, consent false | Valid suggestion editable; manual entry available on errors; no provider request without consent |
| T18 AI evaluation | Run held-out labeled images including ambiguous examples per category | Record counts, corrections, per-class errors, latency and cost; no quality claim from schema validity alone |
| T19 A11y/mobile | Keyboard at 320 CSS px, desktop at 200% zoom, screen reader and denied map tiles | Submit, inspect detail and change status using named controls, visible focus and list alternative |
| T20 Performance | 100 synthetic cases; 20 warmed reads plus cold start measured separately | Report p95 vs two-second target, payload and environment. Keep page size ≤50 |
| T21 Error handling | Quota hit, DB outage after click, response lost after commit, broken tile server | Retry delay honored; no false receipt; safe retry returns original case; list still usable |
| T22 Moderation | Hide listed case; read via peer list, detail, map and subscriptions | Hidden item absent from peer reads and refreshes; author and scoped staff retain access |
| T23 Duplicate review | Approve author-nominated target, submit stale approval and try circular link | Link once, keep both timelines and original vote counts, reject stale/cyclic actions |
| T24 Routing | streetlight with active lighting unit, then repeat with inactive unit | First assigned lighting; second pending and unassigned; admin can assign manually |
| T25 Deferred analytics | Known UTC period straddling end date, sparse cell of four reports | End boundary excluded, aggregates reproducible, sparse cell suppressed |
| T26 Cleanup | Stage two uploads; bind one while expiry sweep runs | Attached object survives; only expired unbound data purged; failure retryable |
| T27 Accessibility and privacy in logs | Submit a case with identifiable test text and inspect application logs | Request ID and action visible; no original description, image, exact point or secret |
| T28 Read models | Open Mine, filtered admin list and reference search using mixed-owner fixtures | Mine only authored; filters intersect with scope; empty and failed requests display distinct states |
| T29 Anonymous projection | Sign out and request public, private and moderated fixtures by reference and map | Only the public listed fixture appears. Public view omits exact pin, photos, identity and free text |
| T30 Duplicate race | New matching case appears between preview and submit | At P1 a 409 presents new candidates, explicit separate confirmation permits filing, retry creates once |

Run pure rule tests before service integration, exercise real RLS and transactions in isolated Supabase, then smoke-test the deployed preview on phone and desktop. Require P0 end-to-end and isolation gates before demo. Use stubs for AI outages and one consented synthetic provider smoke test only when approved credentials exist. See [PRD](02-PRD.md) and [deployment gates](16-DEPLOYMENT-PLAN.md).
