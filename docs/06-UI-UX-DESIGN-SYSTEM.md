# UI and UX design system

## Foundations

Use Inter with system sans fallback. On a phone use a single column, 16 px gutters and bottom navigation for Home, Map, My complaints and Profile. Give Report issue a prominent labeled action. At 640 px allow paired fields, at 768 px allow list/detail panes, and at 1024 px use a persistent staff sidebar with queue, departments and analytics where authorized. Desktop content spans a twelve-column grid up to 1280 px with 24 px gutters. Keep long form text within roughly 65 characters per line.

Use a 4 px spacing unit: 8 for related controls, 16 within cards, 24 between field groups and 32 between sections. Body 16/24, field labels 14/20 medium, page title 32/40 bold, section title 24/32, metadata 14/20. Support zoom and wrapping without clipping.

| Token | Value | Use |
|---|---|---|
| Primary blue / in progress | #2563EB | Primary actions, selected navigation and working status |
| Deep navy | #0F172A | Headings, body copy, dark status text |
| Background / surface | #F8FAFC / #FFFFFF | Canvas and cards |
| Secondary text / border | #475569 / #E2E8F0 | Secondary copy and decorative dividers. Form controls use a stronger outline. |
| Critical / pending / resolved | #DC2626 / #D97706 / #16A34A | Icon, stripe and written label; use navy text on pale surfaces for amber and green badges |

## Phase 2 component library

Run `npm run dev` and open `/dev/ui` for the interactive development reference. The tabs cover controls, civic indicators and feedback. All actions change local demonstration state. The production route returns 404.

Use shadcn primitives from `src/components/ui` and CivicPulse components from `src/components/common`. Inter headings scale with the viewport. Use `.type-display` for hero text, `.body-large`, `.body-small` and `.caption` for supporting text, and `.content-container` for page gutters and the 80 rem maximum width. Default body text is 1 rem. The 4 px spacing scale, 8 px controls and 12 px cards and dialogs are defined in the theme. Primary actions use #1D4ED8 on hover, pale selections use #EFF6FF and informational accents use #0284C7.

- `FormField` passes the control ID, required state, validation and description attributes to its child. Spread those props onto the focusable input. A pending field disables editing. Text inputs and textareas accept native `readOnly`.
- `Button` provides primary, secondary, outline, ghost, destructive and link variants. Give icon-only sizes an accessible name. Set `loading` while a submission is pending.
- `StatusBadge` and `SeverityBadge` accept domain enums. Supply severity provenance only when known. `PriorityBadge` accepts the backend's integer score and independent urgency flag. Invalid scores have an explicit label.
- `ConfirmDialog` focuses Cancel on open and restores trigger focus on dismissal. A pending confirmation blocks repeat actions. Return the operation's Promise so failure can leave the dialog open for retry.
- Cards, headings, loading indicators and feedback states accept display values or action slots from their callers. Preview the brand on both light and navy surfaces.

## Component behavior

- Buttons use verb labels, 44 px target goal, distinct hover fill and a visible offset focus ring. Primary submits, secondary cancels. Keep the submitting label visible and suppress repeat clicks. Never convey status with color alone.
- Inputs retain visible labels, help and linked inline errors. Forms group photo, location and review into steps. Announce validation summary and move focus to the first error. Use explicit consent for sending an image to AI.
- Dialogs name the action, trap focus, support Escape and return focus to the opener. Confirmation dialogs identify the report reference. Criticality and destructive actions have text and icon.
- Cards group reference, category, status, age and next action. Tables have headers, sort state and a compact stacked mobile view. Priority rows expand to show the three score contributions.
- Announce routine notifications politely. Keep actionable errors inline until dismissed. Use skeletons matching the content footprint, label busy regions and avoid animated shimmer under reduced motion. Empty lists explain the active filter and offer reset or a first-report action.
- Provide skip navigation, landmarks, logical heading levels, meaningful image descriptions, sequential tab order, labeled icon buttons and a keyboard-operable location alternative. Check normal text at 4.5:1 and large text or meaningful UI boundaries at 3:1 against the actual background.

## Page contracts

Each route below is proposed. Auth means Supabase Auth, operation names map to [API specification](10-API-SPECIFICATION.md). Hide future navigation until its feature is available.

| Page and route | Layout and primary controls | Interaction and destination | Data dependency and failure state |
|---|---|---|---|
| Landing / | Tagline, workflow, sign in and report actions | Report sends anonymous visitor to login with safe return path | Static copy; no citizen data |
| Registration /register | Email, password, privacy summary and Create account | Validate, submit, show email confirmation then login | Auth sign-up; resend with neutral response |
| Login /login | Credentials, submit, recovery link | Success opens citizen or staff home; recovery uses Auth email flow | Auth session and profile; generic invalid credentials |
| Citizen dashboard /dashboard | Report issue button, recent owned cases and map shortcut | Open intake, detail or full list | List mine; first-use card when empty |
| Report issue /report | Stepper, title, privacy selector, preview, optional Analyze, editable category, description, GPS/pin and review | Back preserves entries, Support opens existing detail, Submit opens receipt | Upload, classify, candidates, upvote, create; preserve draft on retry |
| Civic map /map | Map/list toggle, bounds filter and marker list | Select marker or keyboard row, open detail; clear area filter | Peer-safe list, optional tiles; list works without tiles |
| My complaints /my-reports | Authored and Supported tabs, status filters, pagination | Change status filter resets cursor; open selected case | List mine; distinguish empty from load error |
| Complaint details /reports/[id] | Status, versioned timeline, authorized photos and next actions | Support, confirm, request reopen or nominate duplicate when eligible | Detail, upvote, status, reopen, duplicate nomination; refresh on conflict |
| Citizen profile /profile | Own identity summary, locale settings when available, sign out | Save own preferences, request deletion through pilot contact | Auth, own profile and preferences; inline save errors |
| Notifications /notifications | Unread count, event list, mark read | Select notice, mark read then open report if still accessible | Inbox and mark read; unavailable reports show generic message |
| Admin dashboard /admin | Operational summary, unassigned cases, recent entries | Select a filter or report; link to queue | Staff list; P2 aggregates via analytics; unavailable counts labeled |
| Complaint management /admin/complaints | Search, status/category selects, paginated table | Search or reset, open detail | List with filters; officer scope enforced |
| Priority queue /admin/priority | Active cases, score breakdown, critical review flag | Expand reasons, open staff detail | List sort priority; fall back to chronological queue |
| Admin issue details /admin/complaints/[id] | Exact point, history, assignment, severity, evidence and status form | Save with version, moderate or review duplicate/reopen when authorized | Detail, departments, assign, severity, upload, status and review operations |
| Department management /admin/departments | Active codes, names and routing preview | Select department to filter queue; MVP maintains catalog via reviewed seeds | Departments read; no inline role or catalog editing in MVP |
| Analytics /admin/analytics | Period selector, totals, coarse heatmap, accessible table, export | Update period or download aggregates | Analytics and export; suppress sparse cells and show sample size |
| Admin settings /admin/settings | Signed-in role, department, sign out, pilot contact | View current access, sign out or follow contact instructions | Auth and own profile; privileged role changes handled outside UI |

Measure completion on narrow screens with map tiles disabled and keyboard-only controls before treating any page as ready. See [tests](15-TESTING-STRATEGY.md).
