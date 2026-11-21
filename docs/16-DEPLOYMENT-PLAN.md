# Deployment and operations plan

Status: Not verified / Requires confirmation for local runtime versions, hosted projects, credentials, budgets, environment URLs and deployment. This is a future runbook. No setup has been executed.

## Environment inventory

| Proposed name | Consumer | Purpose and handling |
|---|---|---|
| NEXT_PUBLIC_SUPABASE_URL | Browser and server | Per-environment project endpoint |
| NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY | Browser and server | Public client identifier; access still requires RLS and grants |
| SUPABASE_SECRET_KEY | Restricted server admin adapter if required | Privileged provisioning or cleanup; isolate and rotate. Do not use for routine user reads |
| DATABASE_URL | Migration runner only | Protected database connection, never expose to browser or logs |
| GEMINI_API_KEY / GEMINI_MODEL | Server AI adapter | Optional server secret and selected model; omit to exercise manual fallback |
| AI_DAILY_BUDGET / AI_ENABLED | Server operations | Agreed spend threshold and feature switch; disable if no budget configured |
| NEXT_PUBLIC_SITE_URL | Client redirects and Auth configuration | Exact authorized origin per environment; validate return paths |

## From local to preview

1. Once implementation is authorized, choose a supported Node.js/Next.js pair and one package manager, check in a lockfile and document actual versions. Configure local-only environment values outside version control. Make an example file with names and descriptions, no secrets.
2. Use separate Supabase projects or isolated local and preview environments. Configure email confirmation, allowed redirect origins, staff provisioning and backups as supported by the selected plan. Create primary tables in dependency order, then indexes, grants, RLS policies and transactional operations. Apply reviewed migrations through the migration runner.
3. Create one private report-media bucket, size/type constraints and policy-bound authorized reads. Prove that raw peer access fails before adding demo fixtures. Configure staged-object expiry/reconciliation. Enable scoped Realtime invalidation only if privacy checks pass.
4. Seed synthetic categories' department mappings and isolated test accounts. Verify two-user role isolation and a note-only resolution. Enable Gemini on preview only after consent, timeout, quotas and daily cutoff are tested. Keep an AI-disabled test configuration.
5. Import the authorized GitHub repository into Vercel, choose Next.js/Node runtime, assign distinct preview and production variables and check upload limits end to end. Make previews use synthetic data. Install from locked dependencies, type-check, lint, run tests and production build using the actual project scripts once defined.
6. Smoke-test Auth confirmation/redirect, private upload, report creation, manual GPS flow, map/list, assignment, transition and citizen reload. Exercise image response size, function timeout, missing optional keys and stale versions. Record build ID and actual URL only after verification.

## Production gates and monitoring

- [ ] Pilot owner, consent, retention, incident contact and budget approved for live data.
- [ ] Secrets scoped, backups and restore tested, schema compatible with current and previous app.
- [ ] No private data in logs, public responses, storage paths or cross-account subscriptions.
- [ ] Review request failure rates, upload rejection/cleanup counts, database latency, Auth failures, provider quota and spend. Set alert routing to a named operator before launch.
- [ ] Test rollback on preview. Record the previous healthy Vercel build and database migration identifier.

On failure, disable optional integrations, pause risky writes if consistency is uncertain and roll back to a compatible app deployment. An app rollback does not undo database changes. Prefer additive schema changes and forward repair; rehearse restoration in isolation, reconcile storage and assess lost writes before any production restore. Re-run [acceptance tests](15-TESTING-STRATEGY.md) and record the incident in the [handoff](../PROJECT_CONTEXT.md).
