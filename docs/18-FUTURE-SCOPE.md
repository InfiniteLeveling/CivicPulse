# Future scope

These are candidate investments after the single-site pilot. Validate demand, data governance and operational ownership before expanding. Each experiment has a prerequisite and a decision signal.

| Extension | Prerequisites | Technical approach and feasibility | Smallest experiment and decision signal |
|---|---|---|---|
| Official government integration | Written intake and routing agreement, escalation contacts | Adapter with external reference mapping, retries and reconciliation; external process is the gating dependency | Exchange a synthetic case and reconcile closure in both systems |
| Open311-compatible integration | Target agency endpoint, service definitions, field and status mapping | Translate categories to agency service codes, keep local and remote references, handle unsupported fields | Round-trip a sandbox request; document all lossy mappings |
| Geographic jurisdiction routing | Approved polygons, boundary authority and dispute rules | Point-in-polygon lookup with an unassigned queue at ambiguous boundaries | Review edge fixtures with both owners |
| Maintenance worker application | Worker identity and assignment model, device policy | Add work orders and worker-scoped evidence capture; reuse report history | One assigned job completes on a field phone without exposing other jobs |
| Multilingual voice assistance | Selected languages, consent, speech provider evaluation | Transcribe into editable draft, localize prompts and offer text fallback | Users correct transcript and confirm location in target language |
| Offline-first PWA | Local retention policy, sync conflict rules, suitable tile rights | Encrypted or minimized draft queue, stable IDs, explicit synchronization | Lose network during intake, reconnect, create once and clear draft |
| Image similarity | Consented labeled photo pairs and cost baseline | Evaluate embeddings alongside spatial/category matching; keep confirmation | Measure false matches on similar adjacent assets before enabling |
| Predictive maintenance | Longitudinal repair and asset histories, bias review | Start with transparent recurrence analysis; assess predictive validity out of sample | Compare forecast to simple historical baseline across areas |
| PostGIS spatial analysis | Measured slow queries, database extension availability | Migrate points to indexed geography and compare distance with existing Haversine fixtures | Equivalent boundary results and measured query improvement |
| Advanced analytics | Agreed denominators, timestamps and comparable queues | Build cohort and aging summaries with labeled sample sizes | Facilities team can reproduce one report from raw events |
| Public open-data dashboards | Disclosure rules and reidentification review | Publish delayed coarse aggregates, thresholds and suppressed cells | Privacy review approves one synthetic dashboard then a controlled release |
| Institutional SaaS | Tenant ownership, billing, isolation and support model | Add tenant keys throughout auth, data, media, indexes and reporting; migrate existing site explicitly | Two tenant fixtures cannot cross any API, storage or analytics boundary |

Review the [risk register](13-RISK-ANALYSIS.md) and [open questions](21-OPEN-QUESTIONS.md) before moving an extension into a release.
