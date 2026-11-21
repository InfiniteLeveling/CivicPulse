# Hackathon presentation

## 30-second pitch

“When a campus light breaks, a photo in a group chat can show the damage, but it rarely tells the student who took the job or whether the repair held. CivicPulse is designed to give that report a location, an owner and a visible history. Nearby residents can support the same issue. Maintenance can document the repair and the original reporter can verify it. We propose starting on one campus, where both ends of that handoff can be tested.”

## Slide outline

| Slide | Show | Say |
|---|---|---|
| Problem and audience | One light, several messages, one maintenance desk | Fragmentation is a hypothesis to validate with residents and operators |
| Proposed solution | Intake → assignment → repair → verification | The reference and history connect reporter to desk |
| Architecture | App Router and Node handlers, Supabase Auth/PostgreSQL/private Storage, optional Gemini | Deterministic rules and manual intake keep core workflow independent of AI |
| Innovation | Two close lamps, score breakdown, author confirmation | Suggested matches preserve distinct assets; staff can explain queue order |
| Alternatives | Group chat, structured ticket desk, map-based civic portal | Chat has low entry friction; ticket desks support ownership; map portals support geographic discovery. Test whether the combined campus workflow improves handoff. No competitor benchmark was conducted |
| Social impact | Sample outcomes to measure | Track completeness, first-action time and disputes. Report counts and context before claiming impact |
| Trust and limitations | Peer-safe map versus staff detail | Staff see precise position; photos are private. No automatic emergency dispatch, guaranteed repairs or validated safety ranking |
| Roadmap | Single campus pilot, jurisdiction routing, institutional integration | First secure one accountable desk and validate operating rules |

## Four-minute demonstration script

FixMyStreet already lets residents locate a problem on a map, see existing reports and route a case to an authority. Present those capabilities as the comparison baseline. The CivicPulse pilot should test the narrower question of whether editable photo suggestions, explainable queue order and citizen verification improve the campus handoff. [FixMyStreet project description](https://github.com/mysociety/fixmystreet)

Use a verified build only for interactions that passed their tests. At the inspected baseline there is no runnable application. For a design-only presentation, show the [flow diagrams](05-USER-FLOWS.md) and [page contracts](06-UI-UX-DESIGN-SYSTEM.md), describe the following actions in future tense and label all data synthetic.

| Time | Presenter action and spoken narrative |
|---|---|
| 0:00–0:30 | Deliver the pitch. Introduce the student and maintenance desk. Point out the single reference both will use. |
| 0:30–1:05 | Show intake. “Our student photographs the lamp and checks the pin. If location permission is denied, the form accepts a manual position. Before sending, the student can see who will have access.” |
| 1:05–1:40 | Show the optional classification and two nearby assets. “The suggestion is editable. These lamps are close enough to be candidates, but only the reporter recognizes whether it is the same fixture.” Choose a separate issue or explain support on the existing one. |
| 1:40–2:15 | Show the created reference and switch to the staff queue. “This category can route to lighting. An admin can correct ownership. Age and support add capped points to severity, and critical hazards get a human review.” Show the 66-point example from the intelligence specification. |
| 2:15–2:55 | Open staff detail. “The assigned officer starts work. On completion they record a repair note and, when available, attach evidence. Each change has an actor and a version.” If only P0 is verified, show the note-only path. |
| 2:55–3:30 | Return to the citizen timeline. “Resolved records the desk's account. Verified records the reporter's confirmation. A disputed repair can return for review.” Label deferred steps explicitly. |
| 3:30–4:00 | Close on the pilot. “Our next test is whether a student and a real facilities desk can complete this loop without extra messages. We will measure completion, routing corrections and time to first action.” State actual build/test status and partnership status. |

## Likely judge questions

- **What if AI is wrong or down?** The user confirms category and text. Manual reporting and deterministic routing work without provider access.
- **Why not use a group chat or current helpdesk?** Compare intake completeness, duplicate handling and visible repair history against the institution's actual workflow during discovery.
- **Can votes bury an urgent hazard?** Support and age are capped. Staff review critical hazards separately and can correct severity with a recorded reason.
- **Who fixes the problem?** A participating operator must accept ownership. Until an agreement exists the desk and reports are simulated.
- **What evidence supports impact or accuracy?** No local baseline or evaluation is verified. Show the proposed tests, then report observed results when available.
- **How would it scale?** Measure query plans first, then consider spatial indexes, jurisdiction rules and tenant isolation. See [future scope](18-FUTURE-SCOPE.md).
