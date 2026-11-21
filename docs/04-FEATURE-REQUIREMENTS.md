# Feature requirements and acceptance contracts

Proposed catalog. P0 enables the basic loop, P1 extends it, P2 is deferred. Complexity S means one bounded component or rule, M spans a UI/service boundary, L coordinates several writes or external systems. Staff means admin or assigned department officer. User stories state the outcome from the named actor's perspective. API operation names resolve in [api specification](10-API-SPECIFICATION.md). The named tables, services and controls are implementation dependencies.

All authenticated operations validate session and input on the server. Read and mutation scope must match [security and privacy](12-SECURITY-AND-PRIVACY.md). Every write handles timeout without assuming success and rereads committed state before retry. Features consuming photos inherit the private storage contract in [database design](09-DATABASE-DESIGN.md). Each acceptance test below applies in addition to those shared requirements.

## FR-001 · Registration and login

**P0 · M · citizen**. As a citizen, I want to enter and return to my own workspace.

| Implementation concern | Contract |
| --- | --- |
| Interface | Email form, confirmation screen |
| Backend, data and API dependencies | Auth + profiles / Supabase Auth |
| Validation and business rule | Accept verified session, default role citizen |
| Failure handling | Expired link offers resend without revealing account existence |
| Acceptance | New verified account reaches My complaints |
| Security boundary | Use the signed-in identity and owner or peer projection. Never accept an actor ID from the form. |

## FR-002 · Photo report

**P0 · L · citizen**. As a citizen, I want to show maintenance what needs fixing.

| Implementation concern | Contract |
| --- | --- |
| Interface | Camera picker, preview, title, publication choice and submit |
| Backend, data and API dependencies | Storage + report_images + reports / upload, create |
| Validation and business rule | JPEG, PNG or WebP, sanitized image plus title, category, text, publication choice and point |
| Failure handling | Invalid file stays unsubmitted with replace action |
| Acceptance | One submission produces one CP reference, one initial author vote and one history entry |
| Security boundary | Use the signed-in identity and owner or peer projection. Never accept an actor ID from the form. |

## FR-003 · GPS detection

**P0 · S · citizen**. As a citizen, I want to locate the issue while standing nearby.

| Implementation concern | Contract |
| --- | --- |
| Interface | Use my location, accuracy indicator |
| Backend, data and API dependencies | Browser Geolocation / create stores reports point |
| Validation and business rule | Request on gesture, confirm pin before sending |
| Failure handling | Denied or stale fix opens manual controls |
| Acceptance | Deny location and still reach review |
| Security boundary | Use the signed-in identity and owner or peer projection. Never accept an actor ID from the form. |

## FR-004 · Manual location

**P0 · M · citizen**. As a citizen, I want to mark an issue seen elsewhere.

| Implementation concern | Contract |
| --- | --- |
| Interface | Pin picker, latitude and longitude inputs |
| Backend, data and API dependencies | Map adapter / create stores reports point |
| Validation and business rule | Reject nonfinite or out-of-range values |
| Failure handling | Show field error and retain form |
| Acceptance | Keyboard user can submit a point without dragging |
| Security boundary | Use the signed-in identity and owner or peer projection. Never accept an actor ID from the form. |

## FR-005 · Image classification

**P1 · M · citizen**. As a citizen, I want to choose a category faster.

| Implementation concern | Contract |
| --- | --- |
| Interface | Analyze photo, editable select |
| Backend, data and API dependencies | AI service + report_images / classify |
| Validation and business rule | Explicit consent and own staged photo |
| Failure handling | Timeout opens manual category control |
| Acceptance | Valid suggestion can be changed before submission |
| Security boundary | Use the signed-in identity and owner or peer projection. Never accept an actor ID from the form. |

## FR-006 · Assisted description

**P1 · S · citizen**. As a citizen, I want to describe visible damage clearly.

| Implementation concern | Contract |
| --- | --- |
| Interface | Suggested text, Use suggestion |
| Backend, data and API dependencies | AI service + report_images / classify |
| Validation and business rule | Copy only after acceptance, enforce text bounds |
| Failure handling | Missing suggestion leaves editable field |
| Acceptance | Edited text survives review and becomes report description |
| Security boundary | Use the signed-in identity and owner or peer projection. Never accept an actor ID from the form. |

## FR-007 · Duplicate suggestion

**P1 · M · citizen**. As a citizen, I want to see whether my issue was reported.

| Implementation concern | Contract |
| --- | --- |
| Interface | Nearby candidate cards |
| Backend, data and API dependencies | Matching service + reports / candidates |
| Validation and business rule | Same category, active status, within 100 m |
| Failure handling | Uncertain match permits separate report |
| Acceptance | No automatic merge when two pins overlap |
| Security boundary | Use the signed-in identity and owner or peer projection. Never accept an actor ID from the form. |

## FR-008 · Community support

**P1 · M · citizen**. As a citizen, I want to track and support an existing issue.

| Implementation concern | Contract |
| --- | --- |
| Interface | Support button, count |
| Backend, data and API dependencies | Votes service + report_votes / upvote |
| Validation and business rule | One vote per user and active report |
| Failure handling | Retry reads current count |
| Acceptance | Two simultaneous clicks by same account add one vote |
| Security boundary | Use the signed-in identity and owner or peer projection. Never accept an actor ID from the form. |

## FR-009 · My complaints

**P0 · S · citizen**. As a citizen, I want to return to issues I reported.

| Implementation concern | Contract |
| --- | --- |
| Interface | Status tabs, report cards |
| Backend, data and API dependencies | Read service + reports / list mine |
| Validation and business rule | Filter by authenticated author |
| Failure handling | Empty list offers Report issue |
| Acceptance | Account sees only its authored items under Mine |
| Security boundary | Use the signed-in identity and owner or peer projection. Never accept an actor ID from the form. |

## FR-010 · Status timeline

**P0 · M · citizen**. As a citizen, I want to understand when work progressed.

| Implementation concern | Contract |
| --- | --- |
| Interface | Dated event list |
| Backend, data and API dependencies | History service + status_history / detail |
| Validation and business rule | Order by version, omit internal notes from peer views |
| Failure handling | Failed refresh retains last known state with timestamp |
| Acceptance | Successful transition appears exactly once |
| Security boundary | Use the signed-in identity and owner or peer projection. Never accept an actor ID from the form. |

## FR-011 · Civic map

**P0 · M · citizen**. As a citizen, I want to browse visible reports geographically.

| Implementation concern | Contract |
| --- | --- |
| Interface | Map markers, accessible list |
| Backend, data and API dependencies | Read service + reports / list |
| Validation and business rule | Peers receive approximate points and limited fields |
| Failure handling | Tile failure preserves list |
| Acceptance | Opening a marker and its list row selects same report |
| Security boundary | Use the signed-in identity and owner or peer projection. Never accept an actor ID from the form. |

## FR-012 · Nearby filtering

**P1 · M · citizen**. As a citizen, I want to narrow the map to my surroundings.

| Implementation concern | Contract |
| --- | --- |
| Interface | Area selector, radius label |
| Backend, data and API dependencies | Read service + reports / list with bbox |
| Validation and business rule | Peer filtering uses displayed approximate points |
| Failure handling | Invalid area resets filter with explanation |
| Acceptance | Off-screen points disappear from both list and markers |
| Security boundary | Use the signed-in identity and owner or peer projection. Never accept an actor ID from the form. |

## FR-013 · Resolution evidence

**P1 · M · citizen**. As a citizen, I want to inspect the repair before confirming.

| Implementation concern | Contract |
| --- | --- |
| Interface | Evidence preview in detail |
| Backend, data and API dependencies | Read service + report_images / detail |
| Validation and business rule | Evidence limited to author and responsible staff |
| Failure handling | Expired image link triggers authorized refresh |
| Acceptance | Author sees linked repair photo in resolved report |
| Security boundary | Use the signed-in identity and owner or peer projection. Never accept an actor ID from the form. |

## FR-014 · Citizen confirmation

**P1 · S · citizen**. As a citizen, I want to confirm work on my report.

| Implementation concern | Contract |
| --- | --- |
| Interface | Confirm repair dialog |
| Backend, data and API dependencies | Workflow + reports + status_history / status |
| Validation and business rule | Only author may confirm resolved report |
| Failure handling | Stale version reloads timeline |
| Acceptance | Author confirmation changes resolved to verified |
| Security boundary | Use the signed-in identity and owner or peer projection. Never accept an actor ID from the form. |

## FR-015 · Reopen request

**P1 · M · citizen**. As a citizen, I want to flag an incomplete repair.

| Implementation concern | Contract |
| --- | --- |
| Interface | Request review, reason field |
| Backend, data and API dependencies | Review service + reopen_requests / reopen |
| Validation and business rule | Author of resolved or verified issue, one pending request |
| Failure handling | Conflict displays pending review |
| Acceptance | Approval restores in_progress and records reason |
| Security boundary | Use the signed-in identity and owner or peer projection. Never accept an actor ID from the form. |

## FR-016 · Notifications

**P2 · M · citizen**. As a citizen, I want to notice a status change.

| Implementation concern | Contract |
| --- | --- |
| Interface | Inbox, unread marker |
| Backend, data and API dependencies | Inbox + notifications / inbox, mark read |
| Validation and business rule | Recipient-only events, deduplicate per transition |
| Failure handling | Unavailable inbox offers timeline |
| Acceptance | One visible notice per eligible event |
| Security boundary | Use the signed-in identity and owner or peer projection. Never accept an actor ID from the form. |

## FR-017 · Multilingual interface

**P2 · M · citizen**. As a citizen, I want to read controls in a familiar language.

| Implementation concern | Contract |
| --- | --- |
| Interface | Language switcher |
| Backend, data and API dependencies | Locale catalog + profiles / preferences |
| Validation and business rule | Use approved translations and fallback locale |
| Failure handling | Missing string falls back to English |
| Acceptance | Changing language retains report reference |
| Security boundary | Use the signed-in identity and owner or peer projection. Never accept an actor ID from the form. |

## FR-018 · Accessibility improvements

**P2 · M · citizen**. As a citizen, I want to use more assistive input options.

| Implementation concern | Contract |
| --- | --- |
| Interface | Enhanced text and reading preferences |
| Backend, data and API dependencies | Design system + profiles / preferences |
| Validation and business rule | Core keyboard and labeled forms required already at P0 |
| Failure handling | Unsupported preference uses accessible default |
| Acceptance | Preference survives login and reflow |
| Security boundary | Use the signed-in identity and owner or peer projection. Never accept an actor ID from the form. |

## FR-019 · Admin authentication

**P0 · M · admin**. As a admin, I want to open a trusted operations workspace.

| Implementation concern | Contract |
| --- | --- |
| Interface | Staff login, restricted shell |
| Backend, data and API dependencies | Auth + profiles / Supabase Auth |
| Validation and business rule | Server checks provisioned role per request |
| Failure handling | Citizen deep link gets forbidden |
| Acceptance | Correct staff role opens authorized queue only |
| Security boundary | Authorize the administrator on the server and record privileged mutations. |

## FR-020 · Central dashboard

**P0 · M · admin**. As a admin, I want to see outstanding work.

| Implementation concern | Contract |
| --- | --- |
| Interface | Summary counts and queue |
| Backend, data and API dependencies | Read service + reports / list |
| Validation and business rule | Bounded pages, scoped rows |
| Failure handling | Load failure shows retry |
| Acceptance | Opening a queue row navigates to matching detail |
| Security boundary | Authorize the administrator on the server and record privileged mutations. |

## FR-021 · Complaint search and filters

**P0 · M · staff**. As a staff, I want to find a specific case.

| Implementation concern | Contract |
| --- | --- |
| Interface | Reference search, status and category selects |
| Backend, data and API dependencies | Read service + reports / list |
| Validation and business rule | Intersect all filters and staff scope |
| Failure handling | Invalid filter returns validation error |
| Acceptance | Reference and status together narrow results |
| Security boundary | Constrain officer access to the current assigned department, including on retries. |

## FR-022 · Department assignment

**P0 · M · admin**. As a admin, I want to put a report in an accountable queue.

| Implementation concern | Contract |
| --- | --- |
| Interface | Department select, save |
| Backend, data and API dependencies | Workflow + departments + reports + status_history / assign |
| Validation and business rule | Active department and expected version required |
| Failure handling | Conflicting edit prompts reload |
| Acceptance | One assignment event and updated queue membership |
| Security boundary | Authorize the administrator on the server and record privileged mutations. |

## FR-023 · Status updates

**P0 · M · staff**. As a staff, I want to record work in the field.

| Implementation concern | Contract |
| --- | --- |
| Interface | Transition selector, note |
| Backend, data and API dependencies | Workflow + reports + status_history / status |
| Validation and business rule | Officer limited to assigned department |
| Failure handling | Invalid transition leaves both records unchanged |
| Acceptance | Allowed move increments version and appends event |
| Security boundary | Constrain officer access to the current assigned department, including on retries. |

## FR-024 · Severity review

**P1 · S · staff**. As a staff, I want to correct hazard assessment.

| Implementation concern | Contract |
| --- | --- |
| Interface | Severity selector, rationale |
| Backend, data and API dependencies | Workflow + reports + status_history / severity |
| Validation and business rule | Require reason and scoped authority |
| Failure handling | Conflicting update reloads current value |
| Acceptance | Changed severity changes score breakdown |
| Security boundary | Constrain officer access to the current assigned department, including on retries. |

## FR-025 · Priority queue

**P1 · M · staff**. As a staff, I want to choose next case transparently.

| Implementation concern | Contract |
| --- | --- |
| Interface | Ranked table, score breakdown |
| Backend, data and API dependencies | Ranking service + reports + report_votes / list sort priority |
| Validation and business rule | Sort active cases by critical first, then score, oldest and ID |
| Failure handling | Missing votes count as zero |
| Acceptance | Tied scores produce repeatable order |
| Security boundary | Constrain officer access to the current assigned department, including on retries. |

## FR-026 · Duplicate management

**P1 · M · admin**. As a admin, I want to reconcile separately filed copies.

| Implementation concern | Contract |
| --- | --- |
| Interface | Compare cases, link dialog |
| Backend, data and API dependencies | Matching + reports + status_history / duplicate |
| Validation and business rule | Require author confirmation on source and admin review |
| Failure handling | Conflicting target keeps cases separate |
| Acceptance | Original history remains accessible after link |
| Security boundary | Authorize the administrator on the server and record privileged mutations. |

## FR-027 · Resolution upload

**P1 · M · staff**. As a staff, I want to attach proof of repair.

| Implementation concern | Contract |
| --- | --- |
| Interface | Evidence picker, resolution form |
| Backend, data and API dependencies | Storage + report_images + workflow / upload, status |
| Validation and business rule | Same report, uploader and scope checked on attach |
| Failure handling | Interrupted attach leaves issue active |
| Acceptance | Successful resolution links image and event atomically |
| Security boundary | Constrain officer access to the current assigned department, including on retries. |

## FR-028 · Analytics dashboard

**P2 · M · admin**. As a admin, I want to understand workload.

| Implementation concern | Contract |
| --- | --- |
| Interface | Date filters, Recharts plots |
| Backend, data and API dependencies | Analytics + reports + status_history / analytics |
| Validation and business rule | Bounded UTC interval and aggregate output |
| Failure handling | No observations displays empty chart |
| Acceptance | Totals agree with scoped fixture counts |
| Security boundary | Authorize the administrator on the server and record privileged mutations. |

## FR-029 · Civic heatmap

**P2 · M · admin**. As a admin, I want to see concentrations of issues.

| Implementation concern | Contract |
| --- | --- |
| Interface | Map density layer |
| Backend, data and API dependencies | Analytics + reports / analytics |
| Validation and business rule | Coarse cells and minimum group size |
| Failure handling | Sparse cell suppressed |
| Acceptance | Single household cannot appear as a heat cell |
| Security boundary | Authorize the administrator on the server and record privileged mutations. |

## FR-030 · Department performance

**P2 · M · admin**. As a admin, I want to compare queues fairly.

| Implementation concern | Contract |
| --- | --- |
| Interface | Department table, duration labels |
| Backend, data and API dependencies | Analytics + departments + status_history / analytics |
| Validation and business rule | Label sample size and time interval |
| Failure handling | No resolutions yields unavailable duration |
| Acceptance | Report counts and median duration match fixtures |
| Security boundary | Authorize the administrator on the server and record privileged mutations. |

## FR-031 · Overdue monitoring

**P2 · M · staff**. As a staff, I want to find issues exceeding a service target.

| Implementation concern | Contract |
| --- | --- |
| Interface | Overdue filter, age badge |
| Backend, data and API dependencies | Read service + departments + reports / list overdue |
| Validation and business rule | Requires agreed department target |
| Failure handling | Unset target yields unknown |
| Acceptance | Only active reports beyond target appear |
| Security boundary | Constrain officer access to the current assigned department, including on retries. |

## FR-032 · Moderation

**P1 · M · admin**. As a admin, I want to hide sensitive or misleading submissions.

| Implementation concern | Contract |
| --- | --- |
| Interface | Restrict visibility dialog |
| Backend, data and API dependencies | Moderation + reports + moderation_events / moderate |
| Validation and business rule | Reason required, retain audit and owner access |
| Failure handling | Conflict leaves current visibility intact |
| Acceptance | Hidden report disappears from peer map and list |
| Security boundary | Authorize the administrator on the server and record privileged mutations. |

## FR-033 · Export

**P2 · M · admin**. As a admin, I want to prepare a planning summary.

| Implementation concern | Contract |
| --- | --- |
| Interface | Date picker, download |
| Backend, data and API dependencies | Analytics + reports / export |
| Validation and business rule | Aggregate CSV, bounded period, neutralize formula cells |
| Failure handling | Oversize period rejected |
| Acceptance | Export has no reporter identifiers or exact coordinates |
| Security boundary | Authorize the administrator on the server and record privileged mutations. |

## FR-034 · Image understanding

**P1 · M · citizen**. As a citizen, I want to receive suggestions from visible evidence.

| Implementation concern | Contract |
| --- | --- |
| Interface | Analysis progress panel |
| Backend, data and API dependencies | Gemini adapter + report_images / classify |
| Validation and business rule | Treat all image content as untrusted data |
| Failure handling | Malformed output discarded |
| Acceptance | Validated output contains only allowed fields |
| Security boundary | Use the signed-in identity and owner or peer projection. Never accept an actor ID from the form. |

## FR-035 · Category suggestion

**P1 · S · citizen**. As a citizen, I want to review a suggested issue type.

| Implementation concern | Contract |
| --- | --- |
| Interface | Category chip and selector |
| Backend, data and API dependencies | Taxonomy validator + reports / classify, create |
| Validation and business rule | Unknown category maps to manual selection |
| Failure handling | Ambiguous evidence prompts review |
| Acceptance | User-selected category wins over suggested value |
| Security boundary | Use the signed-in identity and owner or peer projection. Never accept an actor ID from the form. |

## FR-036 · Department routing

**P1 · S · admin**. As a admin, I want to route predictable categories automatically.

| Implementation concern | Contract |
| --- | --- |
| Interface | Routing preview, override |
| Backend, data and API dependencies | Routing service + departments + reports / create, assign |
| Validation and business rule | Map confirmed category to active department |
| Failure handling | Missing mapping leaves unassigned |
| Acceptance | Manual correction retains assignment history |
| Security boundary | Authorize the administrator on the server and record privileged mutations. |

## FR-037 · Geographical matching

**P1 · M · citizen**. As a citizen, I want to identify plausible nearby matches.

| Implementation concern | Contract |
| --- | --- |
| Interface | Distance band, candidate list |
| Backend, data and API dependencies | Distance service + reports / candidates |
| Validation and business rule | Compute exact distance server-side within scoped visible records |
| Failure handling | No match returns empty list |
| Acceptance | 101 m same-category case excluded |
| Security boundary | Use the signed-in identity and owner or peer projection. Never accept an actor ID from the form. |

## FR-038 · Explainable scoring

**P1 · S · staff**. As a staff, I want to see why a case ranks highly.

| Implementation concern | Contract |
| --- | --- |
| Interface | Three score components |
| Backend, data and API dependencies | Ranking + reports + report_votes / list |
| Validation and business rule | Compute using UTC elapsed days, clamp total |
| Failure handling | Unavailable queue offers ordinary status list |
| Acceptance | Score equals documented capped sum |
| Security boundary | Constrain officer access to the current assigned department, including on retries. |

## FR-039 · Critical escalation

**P1 · M · staff**. As a staff, I want to send a critical hazard for human review.

| Implementation concern | Contract |
| --- | --- |
| Interface | Critical flag, review acknowledgment |
| Backend, data and API dependencies | Workflow + reports + status_history / severity |
| Validation and business rule | Never promise dispatch, require staff acknowledgment |
| Failure handling | Unacknowledged flag remains visible to staff |
| Acceptance | Critical item appears for review regardless of vote count |
| Security boundary | Constrain officer access to the current assigned department, including on retries. |
