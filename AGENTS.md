# CivicPulse repository instructions

Read [PROJECT_CONTEXT.md](PROJECT_CONTEXT.md) first. Inspect the current tree, branch, working changes and relevant history before editing. Read the feature requirements plus the affected UI, API, database, privacy or testing documents. Preserve work already present. Distinguish confirmed constraints, working proposals and verified implementation. The current user's task determines whether code, documentation or external actions are in scope.

## Implementation conventions

- Inspect the current branch before editing. Implement backend work only on `backend`. Report a missing backend branch or a different checkout before switching. Preserve frontend work and the shared Next.js configuration. Push only with explicit authorization. Integration into `main` requires reviewed PRs in the order documented in the [integration guide](docs/INTEGRATION_GUIDE.md).
- For implemented endpoints, keep [API_CONTRACT.md](docs/API_CONTRACT.md), shared TypeScript types and the emitting Route Handlers in sync.

- Prioritize an independently verifiable P0 slice. Use TypeScript, Next.js App Router and the documented modular monolith. Reuse existing components and schemas, and justify new dependencies against the requested feature.
- Keep handlers thin. Validate untrusted inputs with shared Zod contracts and enforce the verified session, role, ownership and current department on the server. Protect database rows, sensitive columns and storage objects independently.
- Put workflow changes, routing, ranking and authorization decisions in services. Keep report/history updates atomic. Support safe retries and reject stale versions. Never let browser-provided role, score or storage path confer authority.
- Keep private keys, image processing and optional AI access server-side. Preserve manual reporting when GPS or Gemini fails. Exclude private fields from logs and peer views.
- Follow the [design system](docs/06-UI-UX-DESIGN-SYSTEM.md) including Inter, responsive layouts, named controls, focus management, a keyboard-accessible location input and equivalent list view.
- Run relevant checks through normal entry points, including direct data-access isolation tests when policies change. Record exact results and failures. Never mark a feature complete without verification.
- Keep changes within the authorized scope. If a working proposal suffices for reversible progress, document the assumption. Ask only when a genuine unresolved decision affects permission, scope or a consequential implementation choice.

## End-of-session handoff

1. Inspect the final diff and compare it with the request and acceptance criteria.
2. Update the context snapshot with actual revision or uncommitted state, implemented slices, test environment/results, blockers and next milestone. Omit credentials, personal data and unverified deployment claims.
3. Update the affected numbered specs alongside changed behavior. Add an entry to the [decision log](docs/20-DECISION-LOG.md) when a major technical or product choice changes; retain superseded decisions and link their replacements.
4. Close resolved [questions](docs/21-OPEN-QUESTIONS.md) with evidence and state the impact of unresolved ones. Describe partial work and blocked checks accurately so the next session can resume.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
