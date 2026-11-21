# User flows

## Entry and identity

```mermaid
flowchart TD
  A[Open landing] --> B{Existing account?}
  B -->|No| C[Register email and password]
  C --> D[Confirm email if configured]
  D --> E[Sign in]
  B -->|Yes| E
  E --> F{Verified session and profile?}
  F -->|Yes| G[Open role-scoped dashboard]
  F -->|No| H[Show neutral error or resend option]
  G --> I[Sign out or session expires]
  I --> J[Clear private state and return to login]
```

Reject invalid email locally and server-side. Registration always provisions a citizen. Staff use the same identity provider and a separately assigned role. On expiry preserve only safe unsent fields in memory, reauthenticate and revalidate permissions before retry. Do not silently replay a mutation. Cancel subscriptions and clear private image previews on logout.

## Intake and matching

```mermaid
flowchart TD
  A[Choose photo] --> B{Upload accepted?}
  B -->|No| C[Replace or retry photo]
  C --> A
  B -->|Yes| D{Consent to analysis?}
  D -->|Yes| E[Analyze sanitized image]
  E --> F[Review suggestion or enter manually on failure]
  D -->|No| F
  F --> G[Confirm category and description]
  G --> H{GPS allowed and accurate?}
  H -->|Yes| I[Review detected pin]
  H -->|No| J[Select pin or enter coordinates]
  I --> K[Check nearby active reports]
  J --> K
  K --> L{Citizen recognizes same issue?}
  L -->|Yes| M[Support existing report and open detail]
  L -->|No or ambiguous| N[Review and submit distinct report]
  N --> O[Receive reference and pending event]
```

Show distance bands and category so the reporter can distinguish neighboring assets. P0 skips the matching step. If candidate lookup fails, indicate that matching is unavailable and allow filing. A failed classification leaves the category and text editable. A failed upload cannot satisfy a required photo. On validation errors focus the first invalid field. On interrupted submission reuse the submission key and reconcile against the stored result. On Supabase outage keep edits in the open form and show retry; never show a receipt before commit.

## Authority and resolution

```mermaid
flowchart TD
  A[Pending report] --> B[Rule routes or admin assigns]
  B --> C[Assigned officer or admin starts work]
  C --> D[Record repair note and optional evidence]
  D --> E[Resolved awaiting author]
  E --> F{Author verifies?}
  F -->|Yes| G[Verified]
  F -->|Disputes repair| H[Submit reason for reopening]
  G --> H
  H --> I{Admin approves?}
  I -->|Yes| C
  I -->|No| J[Keep prior status and record decision]
```

Assignment alone leaves status pending. If unassigned, an admin can act or assign. Staff select a permitted transition and submit the displayed version; conflict reloads the latest timeline. Evidence upload precedes the resolution transaction. A failed required attachment chosen by staff leaves the draft available for retry or explicit removal. P0 permits a repair note alone. Only the original author confirms or requests reopening. No response leaves the issue resolved and unverified.

## Moderation and duplicate review

An admin opens the report, reviews sensitive content, selects hide or restore, records a reason and confirms. Hiding changes peer visibility immediately and retains staff and author access. Return forbidden when role or assignment fails, without committing any change. For a duplicate link, the source author nominates a visible active target and the admin checks both locations and versions. Preserve both histories and record the canonical reference. Reject cycles or changed targets. Intake support never creates a second report or merges one automatically. See [workflow operations](10-API-SPECIFICATION.md).
