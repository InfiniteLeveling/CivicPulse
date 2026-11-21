# GitHub workflow

## Verified repository snapshot

Origin is [InfiniteLeveling/CivicPulse](https://github.com/InfiniteLeveling/CivicPulse). Before documentation generation the working tree was clean on local main tracking origin/main. Local history showed one commit b40a765 (“first commit”), containing an empty wd.txt. Remote-tracking refs origin/main, origin/backend and origin/frontend pointed to that commit. The preceding conversation also verified backend and frontend on GitHub after creation. Branch tips can move; refresh evidence before future integration.

## Proposed solo workflow

Keep main stable. Use existing backend and frontend branches for short, coherent slices when splitting work by area. For a vertical feature crossing both, pick one branch, integrate the complete slice and merge promptly. Keep contracts and their consumers in the same review whenever possible. A future develop integration branch is optional if releases need a stabilization period. It was not observed and is unnecessary for the present workflow.

At the root keep the handoff and agent instructions. docs/ holds numbered design documents. Proposed src/app, src/features, src/server and migration locations are described in the architecture documents. When implementation starts, track a lockfile and a sanitized .env.example. Configure .gitignore for real environment files, build artifacts, coverage, local dependencies and personal tooling. Check that the exception for the example file works before committing.

## From issue to release

1. Open an issue with feature ID, scope, acceptance case and dependencies. Label P0/P1/P2, record the decision owner when needed.
2. Start from current stable main. Keep commits focused; examples: “feat(reports): record initial status event”, “test(auth): verify officer scope”, “docs(api): clarify retry response”.
3. PR description identifies requirements, changed data/permissions, migration and rollback implications, screenshots for UI work, test evidence and known gaps. Self-review the actual diff. Link the issue and update affected contracts.
4. Before merge check types/build, P0 smoke tests, role isolation, atomic retries, accessibility, secret exposure and consistency between code, API and context. Review both sides of any branch integration.
5. Merge a verified increment into main, record its commit in the handoff and tag a tested milestone such as v0.1.0-demo only after rehearsal. Record real limitations and test environment in release notes.

This documentation task creates no branches, commits, pushes or tags. See [decision log](20-DECISION-LOG.md).
