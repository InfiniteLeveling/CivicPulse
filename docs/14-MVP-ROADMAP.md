# Solo MVP roadmap

Time boxes are estimates in elapsed hackathon hours. Start at the top and stop adding scope when a gate fails. P0 is a usable maintenance loop. P1 makes it more informative. P2 stays outside the 24–36-hour build.

| Hours | Work in dependency order | Integration and acceptance gate |
|---|---|---|
| 0–3 | Confirm synthetic pilot and roles; initialize typed App Router, shape shared enums, prepare isolated Supabase project | Local shell builds; two separate test identities can sign in and sign out |
| 3–7 | Apply primary schema, private bucket, safe reads, RLS, role provisioning and creation transaction | A second citizen cannot read private fixtures or change role through direct API |
| 7–12 | Upload and sanitize photo, enter manual point and description, persist pending report and first event | Retry identical submission with same key, verify one receipt, photo and history event |
| 12–16 | Add GPS prompt, citizen dashboard, authored list and map/list with approximate peer locations | Denied GPS and unavailable tiles still permit intake and tracking on mobile |
| 16–20 | Admin queue, manual assignment, scoped officer transition, resolution note, visible author timeline | Admin assigns, officer updates, author sees committed state after reload; unrelated officer denied |
| 20–24 | Run P0 tests on preview, fix blockers, assemble synthetic demo and fallback screenshots if available | Record actual results and known limitations; earliest demo-ready P0 candidate |
| 24–30 if available | Add deterministic routing and priority; matching plus explicit support; optional Gemini and manual fallback | Rule tests pass, AI outage does not block create, no automatic merge |
| 30–33 if available | Add resolution photo, verification and reopen review; moderation or duplicate review only if capacity | Evidence/private access and conflicting transition tests pass |
| 33–36 if available | Regression check, preview smoke test, rehearse measured demo | Freeze known-good version and label unbuilt screens |

## Scope decisions

P0 setup, Auth, database, upload, report, dashboard, map, staff management and history precede Gemini, duplicate detection, support, scoring, routing and evidence. If time slips, cut P1 integrations individually. Preserve manual assignment, a chronological queue, private storage and the note-only resolution path. If P0 security or persistence fails, demonstrate the verified portion with synthetic data and identify the unmet gate. Heatmap, advanced analytics, multilingual support, notifications, offline mode and voice are P2.

## Demo preparation

- [ ] Prepare two browser sessions with fictitious citizen and staff identities, two distinct fixtures and an adjacent but separate asset.
- [ ] Confirm account scopes, exact vs approximate location, and a visible initial event.
- [ ] Practice GPS denial, AI timeout and duplicate choice independently.
- [ ] Rehearse one real state transition and reload the citizen view.
- [ ] Turn off any unverified UI, label simulations and retain a safe fallback if the network fails.
- [ ] Record build ID, tested feature IDs, actual timings and unresolved failures in the [handoff](../PROJECT_CONTEXT.md). See [presentation](19-HACKATHON-PRESENTATION.md).
