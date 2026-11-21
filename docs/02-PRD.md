# Product requirements

## Mandate and release scope

Deliver one auditable campus maintenance loop for residents and a responsible desk. The intended product gives reporters visibility and staff enough information to act. Primary market hypothesis: campus facilities teams; later buyers could include residential societies or municipalities. See [target audience](03-TARGET-AUDIENCE.md) for the eight research personas.

P0 delivers authenticated intake, image and location, tracking, citizen map and an authorized maintenance queue. P1 adds advisory intelligence, votes, repair evidence and review. P2 covers operational insight and inclusion extensions. Government dispatch, custom model training and multi-tenant billing sit outside this release. All requirements below are planned. No pass results have been recorded.

## Functional release register

The linked feature specification supplies the user story, dependencies and failure behavior for each ID. Each acceptance condition is a proposed release test.

| ID | Capability | Priority | Accept when |
| --- | --- | --- | --- |
| FR-001 | Registration and login | P0 | New verified account reaches My complaints |
| FR-002 | Photo report | P0 | One submission produces one CP reference, one initial author vote and one history entry |
| FR-003 | GPS detection | P0 | Deny location and still reach review |
| FR-004 | Manual location | P0 | Keyboard user can submit a point without dragging |
| FR-005 | Image classification | P1 | Valid suggestion can be changed before submission |
| FR-006 | Assisted description | P1 | Edited text survives review and becomes report description |
| FR-007 | Duplicate suggestion | P1 | No automatic merge when two pins overlap |
| FR-008 | Community support | P1 | Two simultaneous clicks by same account add one vote |
| FR-009 | My complaints | P0 | Account sees only its authored items under Mine |
| FR-010 | Status timeline | P0 | Successful transition appears exactly once |
| FR-011 | Civic map | P0 | Opening a marker and its list row selects same report |
| FR-012 | Nearby filtering | P1 | Off-screen points disappear from both list and markers |
| FR-013 | Resolution evidence | P1 | Author sees linked repair photo in resolved report |
| FR-014 | Citizen confirmation | P1 | Author confirmation changes resolved to verified |
| FR-015 | Reopen request | P1 | Approval restores in_progress and records reason |
| FR-016 | Notifications | P2 | One visible notice per eligible event |
| FR-017 | Multilingual interface | P2 | Changing language retains report reference |
| FR-018 | Accessibility improvements | P2 | Preference survives login and reflow |
| FR-019 | Admin authentication | P0 | Correct staff role opens authorized queue only |
| FR-020 | Central dashboard | P0 | Opening a queue row navigates to matching detail |
| FR-021 | Complaint search and filters | P0 | Reference and status together narrow results |
| FR-022 | Department assignment | P0 | One assignment event and updated queue membership |
| FR-023 | Status updates | P0 | Allowed move increments version and appends event |
| FR-024 | Severity review | P1 | Changed severity changes score breakdown |
| FR-025 | Priority queue | P1 | Tied scores produce repeatable order |
| FR-026 | Duplicate management | P1 | Original history remains accessible after link |
| FR-027 | Resolution upload | P1 | Successful resolution links image and event atomically |
| FR-028 | Analytics dashboard | P2 | Totals agree with scoped fixture counts |
| FR-029 | Civic heatmap | P2 | Single household cannot appear as a heat cell |
| FR-030 | Department performance | P2 | Report counts and median duration match fixtures |
| FR-031 | Overdue monitoring | P2 | Only active reports beyond target appear |
| FR-032 | Moderation | P1 | Hidden report disappears from peer map and list |
| FR-033 | Export | P2 | Export has no reporter identifiers or exact coordinates |
| FR-034 | Image understanding | P1 | Validated output contains only allowed fields |
| FR-035 | Category suggestion | P1 | User-selected category wins over suggested value |
| FR-036 | Department routing | P1 | Manual correction retains assignment history |
| FR-037 | Geographical matching | P1 | 101 m same-category case excluded |
| FR-038 | Explainable scoring | P1 | Score equals documented capped sum |
| FR-039 | Critical escalation | P1 | Critical item appears for review regardless of vote count |

## Quality gates

| ID | Requirement and proposed acceptance measure |
|---|---|
| NFR-001 | Access isolation. Citizen, second citizen, scoped officer and admin fixtures return exactly their allowed rows, fields and images through both API and direct data paths. |
| NFR-002 | Resilience. Disable Gemini and deny geolocation in the same browser session. A manual report still succeeds once. |
| NFR-003 | Accessibility. Complete intake and status review by keyboard at 320 CSS px and 200% zoom with visible focus, named errors and a list alternative to the map. |
| NFR-004 | Latency target. With 100 synthetic cases, record 20 warmed first-page list requests on preview. Target p95 below two seconds excluding map tiles; document network and cold starts separately. |
| NFR-005 | Integrity. Retry a committed submission and race two edits on one version. Obtain one report and at most one accepted edit. |
| NFR-006 | Privacy. Peer projections and logs omit original photos, original coordinates, contact data and unreviewed free text. |

## Measurement and decision gates

For each pilot session tally started vs successfully submitted forms, correctly routed vs manually reviewed cases, and affirmed vs disputed resolutions. Measure elapsed time to first staff action from history. Record sample sizes, missing data and whether fixtures or consenting participants supplied the results. Compare to existing intake only after a baseline is collected. Proposed demo gate: all P0 acceptance checks pass and zero cross-account disclosure tests fail.

## Dependencies and risks

One developer owns integration. Identity, database and private storage are P0 dependencies; Gemini and reverse geocoding are optional. Simulate maintenance ownership until a partner is confirmed. Delivery gates: first persist and retrieve one owned report, then demonstrate a scoped update and mobile map/list, then integrate independently tested P1 features. Privacy, misclassification, adoption and bandwidth risks are tracked in [risk analysis](13-RISK-ANALYSIS.md). See [feature requirements](04-FEATURE-REQUIREMENTS.md), [mvp roadmap](14-MVP-ROADMAP.md) and [testing strategy](15-TESTING-STRATEGY.md).
