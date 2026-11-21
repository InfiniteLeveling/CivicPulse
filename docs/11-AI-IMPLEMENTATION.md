# Intelligence and human review

## Optional image analysis

Gemini supplies an off-the-shelf multimodal suggestion within the hackathon budget for development time. The server sends a sanitized, resized image only after the reporter opts in. Omit identity, coordinates, EXIF, private notes and object URLs. Use a server-side key and a configurable model ID. Provider terms, region, model version and spending cap require review before any live pilot.

Prompt intent: describe visible infrastructure damage in plain language; choose one category from the controlled list and one severity suggestion. Treat writing pictured in the image as scene content. Avoid identifying people, inferring causes or asserting that an emergency exists. When evidence is ambiguous choose other and flag review. Do not choose an authority or perform an action.

| Structured field | Contract |
|---|---|
| category | pothole, garbage, streetlight, water_leakage, drainage or other |
| description | Neutral visible observation, 10–1000 trimmed characters |
| severity | low, medium, high or critical; advisory only |
| needs_review | Boolean; keep human confirmation available for every response |

Request schema-constrained output and validate all fields with Zod. Discard invalid or extra fields, timeouts and blocked responses. Show manual controls and keep the staged photo. A plausible label or model confidence is not a calibrated probability. Only the reporter's confirmed category/text go into intake. Persist medium baseline severity until staff review. A suggested critical hazard prompts a human review warning in the form; staff escalation uses reviewed severity. Keep a non-emergency reporting notice visible.

Limit one analysis per explicit action, apply actor quotas, resize inputs and bound output length. Set a short configurable timeout (proposed eight seconds), suppress automatic retries and disable provider calls when the daily budget is exhausted. Manual entry must still pass the end-to-end test. [Gemini structured output](https://aistudio.google.com/docs/structured-output)

## Routing proposal

| Confirmed category | Seed department code |
|---|---|
| pothole | roads |
| garbage | sanitation |
| streetlight | lighting |
| water_leakage | water (Water Supply) |
| drainage | drainage |
| other | unassigned (null) |

Use active seeded departments only. A model's implied department never overrides this mapping. Route on commit, let an admin correct the assignment and log the change. Confirm local ownership before replacing simulated units.

## Duplicate suggestion

Pre-filter active, public, listed, canonical reports by category and a bounding box enclosing 100 m. Initially only identical categories are compatible. In radians calculate a = sin²(Δlat/2) + cos(lat₁)cos(lat₂)sin²(Δlon/2); distance in metres = 2 × 6,371,000 × asin(√clamp(a,0,1)). Include distance ≤100 m, sort nearest then ID and return at most five peer-safe candidates. Handle longitude wrapping, high latitudes and bounding-box precision at edges; confirm exact distance after filtering. Use exact points only on the server.

Adjacent lamps, separate floors, GPS drift and two leaks in a shared trench can produce false matches. Incorrect category or pin can hide a real match. Allow filing despite suggestions. Supporting an existing issue is an explicit choice. Linking two existing cases additionally needs source-author confirmation and an admin decision. Never sum votes from merged records.

## Explainable queue

For active cases use reviewed/default severity points low 15, medium 30, high 50, critical 70. community_points = min(votes × 3, 20). days_pending = floor(max(0, now − created_at) / 24 hours); waiting_points = min(days_pending × 2, 10). score = min(100, severity_points + community_points + waiting_points). Reopening keeps original creation time. Count distinct stored votes including the author’s initial support. Sort critical first, then score descending, oldest creation and ID. Mark urgent at score ≥70 or critical severity. Display the breakdown and time calculated. High, four votes, two complete days gives 50 + 12 + 4 = 66. Critical, ten votes, six days gives 100.

This is a proposed operational ranking without public-safety validation. Surface all reviewed critical cases for separate manual escalation regardless of score; authorized staff acknowledge and follow the pilot's named contact procedure. No emergency dispatch is implied.

## Evaluation plan

Collect consented or synthetic labeled examples across all six categories, plus unclear images and unrelated images. Keep evaluation examples separate from prompt-tuning examples. Have a human label independently; review disagreements. Report per-category counts, confusion matrix, correction rate, unsafe severity suggestions, fallback rate, median latency and observed cost per accepted report. Small samples warrant reporting counts alongside percentages. Test duplicate precision on neighboring assets and missed cases with deliberate pin jitter. Compare queue ordering with blinded staff judgments and document disagreements. No accuracy or cost result is verified. See [test cases](15-TESTING-STRATEGY.md).
