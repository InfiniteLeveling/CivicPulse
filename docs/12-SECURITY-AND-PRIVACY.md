# Security and privacy

## Access matrix for the single-campus pilot

| Capability | Anonymous | Citizen | Officer | Admin |
|---|---|---|---|---|
| Landing and authentication | Yes | Yes | Yes | Yes |
| Create, support | No | As self | No | No |
| Read peer-safe listed issue | Public projection only | Yes | Yes | Yes |
| Exact location, private text and photos | No | Own | Current department | All |
| Work status and severity | No | Verify own resolved issue only | Current department | All |
| Assignment, moderation, duplicate/reopen decisions | No | Nominate or request on own case | No | Yes |
| Raw role changes | No | No | No | Separate trusted provisioning procedure |

Visitors can read only sanitized, explicitly public and listed cases. Private publication restricts all detail to the author and responsible staff. Administrative hiding removes the case from public discovery even when the reporter originally opted in.

Auth establishes identity. Verify the session server-side, reload profile and assignment, then authorize the operation and projection. Validate at the database and storage boundary too. RLS controls rows and requires explicit safe column grants or projections. Keep service credentials isolated from ordinary reads. Browser clients must never be able to set role, actor, score or private storage path. [Supabase RLS guidance](https://supabase.com/docs/guides/database/postgres/row-level-security)

## Data handling

- Collect location on an explicit gesture, show accuracy and require confirmation. Keep peer coordinates approximate and peer text structured. Support manual input and avoid storing a location trail. Even rounded points can identify small sites; use synthetic data until the pilot approves disclosure.
- Use private buckets, random object names, short-lived signed reads (proposed five minutes) and one-hour staged expiry. Verify actual file signature, decode with pixel and byte limits, strip metadata, re-encode and reject unsupported/corrupt content. Apply limits before expensive decoding. Do not expose uploads to other citizens.
- Tell reporters who can see each field before submission. Prompt them to avoid bystanders, plates, interiors and identifying text. Offer replace/cancel. Route sensitive cases to an admin for hiding and controlled deletion. Obtain separate opt-in for third-party AI. Confirm provider retention and institutional approval before sending live photos.
- Use managed Auth sessions over HTTPS, secure cookie settings appropriate to the chosen SSR integration, origin checks and neutral auth errors. Restrict redirect targets. Verify refresh and logout invalidate access. Provision staff using verified institutional contacts and an audited grant process. Decide staff MFA and offboarding before real operations.
- Never include private keys in NEXT_PUBLIC variables, screenshots, logs, analytics or repository history. Rotate exposed secrets and invalidate affected sessions or links as appropriate. Validate Zod bounds, use parameterized database operations, escape rendered text and constrain aggregate exports.
- Apply server-enforced per-account quotas, conservative network limits on unauthenticated entry and private durable counters. Escalate suspicious repeated activity for human moderation. Community support has a unique database key. Log actor reference, action, result, request ID, version and time with restricted retention. Keep sensitive audit notes outside peer responses.

## Retention, deletion and review

Live retention period and accountable contact have **Status: Not verified / Requires confirmation**. Use synthetic fixtures before policy approval. On deletion request, authenticate the requester, inventory profile, reports, images, votes, history, optional events, backups and external AI processing. Determine required audit retention with the institution. Revoke sessions, purge authorized media, anonymize or remove identifying fields transactionally and track backup expiry. Preserve referential integrity; do not simply cascade-delete the Auth user ahead of this process. Record completion or the retention exception and inform the requester.

Verify role and reassignment boundaries through HTTP, direct Supabase data access, storage and Realtime. Check expired URLs, field projection, logout and cross-account mutation tests before pilot access. See [tests](15-TESTING-STRATEGY.md) and [risk register](13-RISK-ANALYSIS.md).
