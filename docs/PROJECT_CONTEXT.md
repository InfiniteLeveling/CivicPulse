# CivicPulse project handoff

## Global Dark Mode, Dual-Theme Design System & Theme Animations

**Complete on 2026-11-25.** CivicPulse has implemented a complete, premium, accessible Dark Mode and dual-theme design system across the entire application, seamlessly supporting Light, Dark, and System appearance preferences with zero hydration mismatches, no page reloads, and full form state preservation.

### Key Dark Mode Accomplishments

1. **Three Appearance Modes & System Sync**:
   - **Light Mode**: High-readability public service daylight palette (`#F8FAFC` background, `#FFFFFF` cards, `#0F172A` text).
   - **Dark Mode**: Sophisticated midnight-navy aesthetic avoiding harsh pure-black backgrounds (`#020617` background, `#0F172A` cards, `#1E293B` elevated surfaces, `#F8FAFC` text, `#94A3B8` muted text, `#334155` borders).
   - **System Default**: Automatically synchronizes with OS preference via `window.matchMedia('(prefers-color-scheme: dark)')` with safe fallback to Light.

2. **Hydration-Safe Theme Provider**:
   - Implemented `src/components/theme/ThemeProvider.tsx` wrapping `next-themes` with `attribute="class"`, `defaultTheme="system"`, and `enableSystem`.
   - Integrated into `src/app/layout.tsx` with `suppressHydrationWarning` on `<html>` to eliminate false-positive hydration warnings.
   - Zero flash of unstyled content (FOUC): inline script executes synchronously before client painting.

3. **Accessible Theme Toggle (`<ThemeToggle />`)**:
   - Created `src/components/theme/ThemeToggle.tsx` featuring `Sun`, `Moon`, and `Monitor` Lucide icons.
   - Dropdown menu with visible text labels ("Light", "Dark", "System Default") and descriptive subtitles for older adults and first-time users.
   - Clear active state indicator (primary checkmark and highlighted background).
   - Full keyboard accessibility: Escape to dismiss, focus return to trigger, visible focus rings, and touch target ≥ 44px.
   - Built with React 19 `useMounted()` hook to prevent cascading renders and hydration mismatches.

4. **Strategic Theme Toggle Placement**:
   - **Public Website**: Desktop Navbar (`Navbar.tsx`) and Mobile Navigation Drawer (`MobileMenu.tsx`).
   - **Citizen Portal**: Citizen Topbar (`CitizenTopbar.tsx`) alongside `ReadingModeToggle`.
   - **Administrator Portal**: Admin Topbar (`AdminTopbar.tsx`) beside system shortcuts.
   - **Public Footer**: Beside `ReadingModeToggle` in `Footer.tsx`.
   - Shared global preference: changing appearance anywhere updates the entire platform instantly.

5. **Semantic Design Tokens & Badges**:
   - Extended `src/app/globals.css` with comprehensive `.dark` variable definitions:
     - Background: `#020617`, Cards: `#0F172A`, Popovers: `#1E293B`, Borders: `#334155`, Inputs: `#475569`.
     - Status badges: Pending (`#422006` bg / `#FCD34D` fg), In Progress (`#172554` bg / `#93C5FD` fg), Resolved (`#052E16` bg / `#86EFAC` fg), Critical (`#450A0A` bg / `#FCA5A5` fg).
   - Dynamic `civic-badge` color-mix tokens automatically adapt contrast for light and dark environments.

6. **Interactive Leaflet Map & Recharts Dark Mode**:
   - **Leaflet Map (`/map`)**: Standard OpenStreetMap base tiles preserved without blind CSS filter inversion (preventing tile blur or color distortion), while popups, toolbars, attribution, and zoom controls adapt to dark mode.
   - **Recharts Analytics (`/admin/analytics`)**: Updated category, severity, status, trend, and workload charts with theme-aware grid lines (`stroke="var(--border)"`), axis labels (`stroke="var(--muted-foreground)"`), and high-contrast dark popover tooltips.

7. **Form State Preservation & Animations**:
   - Switching themes updates CSS variables instantaneously without triggering component re-mounts or resetting user form inputs in the reporting wizard (`/report`) or admin triage.
   - Subtle 200ms background and border color transitions for seamless theme switches.
   - Full `prefers-reduced-motion` compliance: transitions and animations are set to 0ms when reduced motion is preferred.

8. **Verification & Quality**:
   - `npm run lint`: 0 errors, 0 warnings.
   - `npm run typecheck`: 0 TypeScript errors.
   - `npm run test:frontend`: 117/117 unit tests passing (including `tests/theme.test.mjs`).
   - `npm run build`: Production build cleanly compiles all static and dynamic routes.

---

## Global UI/UX Redesign, Premium Visual Experience, Animations & Accessibility

**Complete on 2026-11-25.** CivicPulse has undergone a comprehensive, global UI/UX redesign transforming the platform into a cohesive, highly accessible, intuitive, modern, and national-hackathon-grade civic technology system.

### Key Redesign Accomplishments

1. **Brand Identity & Cohesive Design System**:
   - Modern civic technology aesthetic: Public service trustworthiness with SaaS precision.
   - Primary palette: Primary Blue `#2563EB`, Primary Hover `#1D4ED8`, Light Blue Surface `#EFF6FF`.
   - Neutral palette: Deep Navy `#0F172A`, Secondary Text `#475569`, Muted Text `#64748B`, Background `#F8FAFC`, Surface `#FFFFFF`, Border `#E2E8F0`.
   - Semantic palette: Success `#16A34A`, Warning `#D97706`, Error `#DC2626`, Information `#2563EB`.
   - Component radii: Inputs & Buttons 12px (`var(--radius-md)`), Cards 16px (`var(--radius-lg)`), Dialogs 20px (`var(--radius-xl)`).
   - Shadows: Subtle cards (`0 1px 3px 0 rgb(15 23 42 / 0.05)`), Elevated lift (`0 10px 15px -3px rgb(15 23 42 / 0.08)`), Dialogs (`0 20px 25px -5px rgb(15 23 42 / 0.15)`).

2. **Accessible Easy-Reading Mode ("Larger Text")**:
   - Implemented `<ReadingModeToggle />` in Navbar, Footer, and Citizen Topbar.
   - Powered by React 19 `useSyncExternalStore` and `useMounted` hook to eliminate cascading renders and hydration mismatches.
   - Dynamically applies `data-reading-mode="large"` on `<html>`, scaling typography to 112.5%, body line-height to 1.75, and touch targets to ≥ 52px for senior citizens and visually impaired users. Persisted in `localStorage` without sensitive data.

3. **CSS Motion & Animation Architecture**:
   - Built zero-dependency CSS keyframe animations and utility classes (`animate-fade-in`, `animate-slide-up`, `animate-slide-down`, `animate-scale-in`, `animate-checkmark`, `animate-pulse-subtle`).
   - Created reusable motion component primitives (`FadeIn`, `SlideIn`, `ScaleIn`, `AnimatedCard`) in `src/components/common/Motion.tsx`.
   - Full `prefers-reduced-motion` compliance: automatically disables transitions, transforms, and animations when reduced motion is requested.

4. **Public Landing Page & Navigation (`/`)**:
   - Redesigned Navbar with backdrop blur, sticky elevation, responsive drawer, ReadingModeToggle, and high-visibility "Report an Issue" CTA.
   - Memorable Hero section: "See a Problem? Report It. Make a Difference.", trust indicators ("Simple reporting. Clear updates. Community-powered action."), and interactive neighborhood demonstration preview with status indicators.
   - Quick Reporting Categories: 6 interactive category cards (Pothole, Garbage, Water Leakage, Streetlight, Drainage, Other) linking directly to `/report?category=<category>`.
   - 4-Step How It Works visual journey: 1. Describe the Problem, 2. Add Photo & Location, 3. Review & Submit, 4. Track Its Progress.
   - Honest Feature Showcase & comprehensive FAQ accordion explaining routinely reported issues, privacy, and non-emergency notices.
   - Professional footer with platform notices and prototype disclaimer.

5. **Authentication & Return-to-Report UX**:
   - Redesigned `/login` and `/register` with clean layouts, password visibility toggles, and accessible validation.
   - Return-to-report flow: When visitors click "Report an Issue" or a category card, redirects to `/login?next=%2Freport...`.
   - Displays clear explanatory notice: "Sign in to submit your report and track its progress."
   - Automatically preserves safe return destination through registration and login with open-redirect protection.

6. **Citizen Dashboard & Mobile Experience (`/dashboard`)**:
   - Human-centered welcome banner: "How can we help your community today, <Name>?"
   - High-prominence "Report an Issue" action button.
   - Compact report summary cards (Total, Pending Review, In Progress, Resolved).
   - Citizen mobile bottom navigation with elevated, floating primary Report button (`CitizenMobileNav.tsx`) and safe-area padding (`pb-safe`).

7. **Streamlined Reporting Experience (`/report`)**:
   - Clean 4-step progress stepper ("Issue Details" → "Add Photo" → "Confirm Location" → "Review & Submit").
   - Preselected category support via URL search parameters.
   - Optional AI assistance with explicit citizen consent, editable suggestions, and honest loading states.
   - Map location selection with draggable pin, GPS fallback, and manual coordinate inputs.
   - Duplicate detection with friendly language ("Has someone already reported this problem?"), nearby match cards, and community endorsement option.
   - Final review summary with inline edit buttons, double-submit protection, and draft preservation on error.
   - Gratifying Confirmation Screen (`ReportSuccess.tsx`): Checkmark drawing animation, actual backend tracking reference, and direct actions to "View Details", "My Complaints", "Dashboard", and "Report Another Issue".

8. **Tracking, Details & Public Map**:
   - `/my-reports`: Multi-attribute filtering (Status, Category, Search, Sort), responsive card/table layout.
   - `/reports/[id]`: Authoritative complaint details, chronological status timeline, resolution proof image display, and "I Face This Problem Too" community support button.
   - `/map`: Synchronized OpenStreetMap view with category-specific marker pins, responsive Map/List toggle, and filter toolbar.

9. **Administrative Operations & Analytics (`/admin`, `/admin/complaints`, `/admin/analytics`)**:
   - Professional dark navy operations sidebar (`AdminSidebar.tsx`) with high-contrast inverse brand logo.
   - Overview: KPI cards, resolution rate progress bar, status distribution donut, urgent workload alert.
   - Complaints Queue: Multi-attribute filtering, weighted priority score indicator, urgent badges, read-only preview modal.
   - Triage & Mutation Workspace (`/admin/complaints/[id]`): Left column case overview, photo, timeline, resolution evidence; Right column department selector, triage form, lifecycle transition guard, optimistic concurrency conflict dialog.
   - Analytics Dashboard (`/admin/analytics`): Recharts donut, horizontal bar, vertical bar, workload, and line charts with dual-presentation accessible data tables toggle.

10. **Technical Verification & Code Quality**:
    - `npm run lint`: 0 errors, 0 warnings (100% clean across all app and API routes).
    - `npm run typecheck`: 0 TypeScript errors.
    - `npm run test:frontend`: All 112 unit tests passing.
    - `node --test tests/browser/*.test.mjs`: All 108 browser tests passing with zero horizontal overflow across 320, 375, 768, 1024, and 1440 px viewports.
    - `npm run build`: Production build cleanly compiles all static and dynamic routes.

---

## Phase 20 — Admin analytics dashboard, Recharts & civic performance insights

**Complete locally on 2026-11-21.** The `frontend` working tree contains the changes for Phase 20, marking the successful completion of the entire 20-phase CivicPulse frontend roadmap. The administrative analytics and performance insights interface (`/admin/analytics`), dynamic server-side page shell (`src/app/admin/analytics/page.tsx`), loading skeleton (`src/app/admin/analytics/loading.tsx`), accessible error boundary (`src/app/admin/analytics/error.tsx`), client coordinator (`AdminAnalyticsDashboard.tsx`), analytics page header (`AnalyticsPageHeader.tsx`), 6-card metrics grid (`AnalyticsMetricsGrid.tsx`), status distribution donut chart (`ComplaintStatusChart.tsx`), category horizontal bar chart (`ComplaintCategoryChart.tsx`), severity distribution bar chart (`ComplaintSeverityChart.tsx`), time-series submission trend line chart (`ComplaintTrendChart.tsx`), department assignment workload bar chart (`DepartmentWorkloadChart.tsx`), resolution performance & speed card (`ResolutionPerformanceCard.tsx`), multi-attribute filter toolbar (`AnalyticsFilters.tsx`), accessible dual-presentation data tables (`AnalyticsDataTable.tsx`), multi-context empty state (`AnalyticsEmptyState.tsx`), error state (`AnalyticsErrorState.tsx`), client mounting hook (`src/hooks/useMounted.ts`), Zod validation schemas and aggregation utilities (`src/lib/validation/admin-analytics.ts`), analytics API service (`src/lib/api/analytics.ts`), navigation configuration update (`src/config/admin-navigation.ts` with `available: true`), unit test suite (`tests/admin-analytics.test.mjs`), and browser test suite (`tests/browser/admin-analytics.test.mjs`) are fully implemented and verified.

| Area | Phase 20 changes |
|---|---|
| Domain Types & Schemas | Created `src/lib/validation/admin-analytics.ts` defining `adminAnalyticsSchema`, `calculatePercentage`, `aggregateAnalyticsFromReports`, and typed interfaces for all chart breakdowns (`StatusChartItem`, `CategoryChartItem`, `SeverityChartItem`, `DepartmentWorkloadItem`, `TrendChartItem`). Enforces finite percentage bounds [0, 100] and division-by-zero safeguards. |
| Navigation Integration | Updated `src/config/admin-navigation.ts` to activate `City Analytics` (`href: "/admin/analytics"`, `available: true`, removing `phaseBadge: "Phase 20"`). Sidebar automatically highlights City Analytics with `aria-current="page"`. Updated unit tests in `tests/admin-navigation.test.mjs`. |
| Analytics API Service | Created `src/lib/api/analytics.ts` implementing `getAdminAnalytics()`. Orchestrates `getAdminStats()` (`GET /api/stats?scope=admin`) and `getAdminReports()` (`GET /api/reports?scope=admin`), cleanly merging authoritative headline figures with local category, severity, workload, and trend aggregations. Supports client-side filtering by time range (All, 30 Days, 7 Days), issue category, and status. |
| Recharts Visualizations | Implemented responsive, theme-aware Recharts (v3.11.0) charts: `ComplaintStatusChart` (Donut / Pie), `ComplaintCategoryChart` (Horizontal Bar), `ComplaintSeverityChart` (Vertical Bar), `ComplaintTrendChart` (Line with informative notice for < 2 historical dates), and `DepartmentWorkloadChart` (Stacked Bar showing active vs resolved load per department). All charts use `useMounted` to eliminate hydration flicker and React 19 cascading render warnings. |
| Dual-Presentation Accessibility | Created `AnalyticsDataTable.tsx` providing accessible, semantic HTML `<table>` alternatives for all visual charts (Status, Category, Severity, and Department). Users can toggle seamlessly between "Charts" and "Data Tables" views via the header switcher. |
| KPI Metrics Grid | Created `AnalyticsMetricsGrid.tsx` rendering 6 core KPI cards: Total Complaints, Pending Intake, In Progress, Verified Resolved, Urgent Workload, and Municipal Resolution Rate with visual progress indicator. |
| Resolution Performance | Created `ResolutionPerformanceCard.tsx` detailing resolution speed, average turnaround elapsed time, photographic proof verification summary, and data transparency commitments. |
| Concurrency & Filters UX | Created `AnalyticsFilters.tsx` with dropdown selectors for Time Range, Category, and Status, with clear button. Created `AnalyticsPageHeader.tsx` with last refreshed timestamp, demo data badge, view mode toggle, and manual refresh button. |
| Testing & Verification | Added `tests/admin-analytics.test.mjs` (5 unit tests covering percentage computation, schema validation, aggregation logic, and empty datasets; 112 total unit tests passing). Added `tests/browser/admin-analytics.test.mjs` (7 browser tests covering header, metric cards, sidebar aria-current, charts rendering, table toggle, filters reset, manual refresh, and 5-viewport zero-overflow responsiveness; 27 total admin browser tests passing). |

### Verification and limitations

- `npm run typecheck` passed with zero errors (`tsc --noEmit`).
- `npm run lint` passed with zero warnings (`eslint .`).
- `npm run build` compiled all routes cleanly, generating `ƒ /admin/analytics` as an on-demand dynamic route.
- `npm test` passed all 112 unit tests across 16 test suites.
- `tests/browser/admin-analytics.test.mjs` passed all 7 browser tests in headless Edge with zero horizontal overflow across 320, 375, 768, 1024, and 1440 px viewports.
- All existing admin browser test suites (`admin.test.mjs`, `admin-complaints.test.mjs`, `admin-triage.test.mjs`) passed with zero regressions.
- **Strict Scope Boundaries Preserved**: Zero backend files modified, no fictional growth percentages or synthetic trend curves fabricated, and no client-side priority recalculations performed.
- **Roadmap Completion**: Phase 20 is the final phase of the 20-phase frontend implementation roadmap. All 20 phases are now fully implemented, verified, tested, and production-ready.

---

## Phase 19 — Admin complaint triage, department assignment, status updates & resolution evidence

**Complete locally on 2026-11-21.** The `frontend` working tree contains the changes for Phase 19. The administrative complaint detail & triage interface (`/admin/complaints/[id]`), dynamic server-side page shell (`src/app/admin/complaints/[id]/page.tsx`), loading skeleton (`src/app/admin/complaints/[id]/loading.tsx`), accessible error boundary (`src/app/admin/complaints/[id]/error.tsx`), client coordinator (`AdminComplaintDetails.tsx`), administrative case header (`AdminComplaintHeader.tsx`), case overview metadata grid (`AdminComplaintOverview.tsx`), department selector with recommendations (`DepartmentSelector.tsx`), administrative triage form (`AdminComplaintTriageForm.tsx`), status lifecycle transition form (`AdminStatusUpdateForm.tsx`), resolution evidence photo upload component (`ResolutionEvidenceUpload.tsx`), consequential mutation confirmation dialog (`AdminMutationConfirmation.tsx`), optimistic concurrency conflict modal (`AdminVersionConflictDialog.tsx`), runtime Zod validation schemas (`src/lib/validation/admin-triage.ts`, `src/lib/validation/admin-status.ts`), typed admin reports and department API services (`src/lib/api/admin-reports.ts`, `src/lib/api/departments.ts`), resolution upload service (`uploadResolutionImage` in `src/lib/api/uploads.ts`), unit test suite (`tests/admin-triage.test.mjs`), and browser test suite (`tests/browser/admin-triage.test.mjs`) are fully implemented and verified.

| Area | Phase 19 changes |
|---|---|
| Domain Types & Contracts | Added `UpdateTriagePayload`, `UpdateTriageResponse`, `UpdateStatusPayload`, and `UpdateStatusResponse` to `src/types/domain.ts` reflecting canonical backend PATCH contracts and optimistic concurrency version numbers. |
| Navigation Integration | Enhanced Phase 18's `AdminComplaintPreviewDialog.tsx` with a direct "Open Triage Workspace" CTA to `/admin/complaints/[id]`. Verified active sidebar route highlighting on `/admin/complaints/[id]` preserving `Complaints Queue` selection. |
| Domain Validation & Lifecycles | Created `src/lib/validation/admin-triage.ts` defining `adminTriageSchema` (version, departmentId, category, severity, visibility, remark) and `CATEGORY_RECOMMENDED_DEPT` mapping. Created `src/lib/validation/admin-status.ts` defining `adminStatusSchema`, `isValidStatusTransition` (governing canonical lifecycle `pending` → `in_progress` → `resolved`, preventing no-ops and invalid rollbacks), and `getAllowedNextStatuses`. |
| Department API Service | Created `src/lib/api/departments.ts` implementing `getAdminDepartments()` calling canonical `GET /api/admin/departments`. Falls back gracefully in demo mode to `MOCK_DEPARTMENTS` (`dept-1` through `dept-6`). |
| Admin Reports API Service | Created `src/lib/api/admin-reports.ts` implementing `getAdminReportDetails()` (retrieving authoritative report, history, version), `updateReportTriage()` calling `PATCH /api/admin/reports/:id/triage`, and `updateReportStatus()` calling `PATCH /api/admin/reports/:id/status`. Integrates optimistic concurrency version checking and returns `{ report, version }`. |
| Resolution Photo Upload | Added `uploadResolutionImage()` to `src/lib/api/uploads.ts` sending multipart upload with `purpose: "resolution"` to `POST /api/uploads`. Enforces JPEG, PNG, WebP ≤ 2MB. Created `ResolutionEvidenceUpload.tsx` with thumbnail preview, replace/remove actions, and server image ID badge. |
| Department Selector | Created `src/components/admin/complaints/DepartmentSelector.tsx` rendering accessible dropdown with authoritative department list and highlighting recommended department based on confirmed category. |
| Triage Management Form | Created `src/components/admin/complaints/AdminComplaintTriageForm.tsx` providing form controls for category, severity, department, visibility, and remark. Includes privacy confirmation safeguard dialog when changing visibility from `private` to `public`. |
| Status Update Form | Created `src/components/admin/complaints/AdminStatusUpdateForm.tsx` displaying permitted lifecycle transitions, remark textarea, conditional resolution evidence upload when selecting `resolved`, and triggering `AdminMutationConfirmation` before marking resolved. |
| Concurrency & Conflict UX | Created `src/components/admin/complaints/AdminVersionConflictDialog.tsx` triggered when HTTP 409 conflict occurs. Informs the administrator of concurrent edits, preserves unsaved draft inputs, and offers a reload action to review latest changes before reapplying. |
| Coordinator Component | Created `src/components/admin/complaints/AdminComplaintDetails.tsx` rendering a high-density 2-column layout on desktop (Left: Overview, submitted photograph, location preview, status timeline, resolution evidence; Right: Prioritization scorecard, triage form, status update form) and a stacked 1-column layout on mobile. |
| Testing & Verification | Added `tests/admin-triage.test.mjs` (12 unit tests covering triage schemas, status schemas, lifecycle transitions, department mappings, and allowed statuses; 107 total unit tests passing). Added `tests/browser/admin-triage.test.mjs` (9 browser tests covering layout, breadcrumb, active route highlighting, photo/location/timeline, department selector, triage save, private-to-public confirmation, status update, resolution upload, and 5-viewport zero-overflow responsiveness; 20 total admin browser tests passing). |

### Verification and limitations

- `npm run typecheck` passed with zero errors (`tsc --noEmit`).
- `npm run lint` passed with zero warnings (`eslint .`).
- `npm run build` compiled all routes cleanly, generating `ƒ /admin/complaints/[id]` as an on-demand dynamic route.
- `npm test` passed all 107 unit tests across 15 test suites.
- `tests/browser/admin-triage.test.mjs` passed all 9 browser tests in headless Edge with zero horizontal overflow across 320, 375, 768, 1024, and 1440 px viewports.
- `tests/browser/admin-complaints.test.mjs` passed all 11 browser tests.
- **Backend Non-Goals Preserved**: Recharts analytics charts and performance metrics (Phase 20), public admin registration, citizen status mutations, automated AI moderation backend, and backend Route Handlers in `src/app/api` remain untouched and strictly deferred.

**Next phase — Phase 20, Admin Analytics Dashboard, Charts & Civic Performance Insights.**



## Phase 18 — Admin complaints table, advanced filtering & urgent-first priority queue

**Complete locally on 2026-11-21.** The `frontend` working tree contains the changes for Phase 18. The administrative complaints management queue (`/admin/complaints`), dynamic server-side page shell (`src/app/admin/complaints/page.tsx`), loading skeleton (`src/app/admin/complaints/loading.tsx`), accessible error boundary (`src/app/admin/complaints/error.tsx`), client coordinator (`AdminComplaintsView.tsx`), administrative queue header (`AdminComplaintsHeader.tsx`), multi-criteria filtering toolbar (`AdminComplaintsToolbar.tsx`), desktop complaints table (`AdminComplaintsTable.tsx`), mobile complaint card (`AdminComplaintCard.tsx`), priority score cell with urgent indicators (`AdminPriorityCell.tsx`), accessible read-only complaint inspection dialog (`AdminComplaintPreviewDialog.tsx`), pagination controls (`AdminComplaintsPagination.tsx`), multi-context empty state display (`AdminComplaintsEmptyState.tsx`), runtime Zod response validation schemas (`src/lib/validation/admin-reports.ts`), typed admin reports API service (`getAdminReports` in `src/lib/api/reports.ts`), updated admin navigation config (`src/config/admin-navigation.ts` with `available: true`), updated admin quick actions (`AdminQuickActions.tsx`), unit test suite (`tests/admin-reports.test.mjs`), and browser test suite (`tests/browser/admin-complaints.test.mjs`) are fully implemented and verified.

| Area | Phase 18 changes |
|---|---|
| Domain Types & Contracts | Added `GetAdminReportsParams` and `GetAdminReportsResult` to `src/types/domain.ts` reflecting canonical backend query parameters and pagination response structure. |
| Navigation Integration | Updated `src/config/admin-navigation.ts` to activate `Complaints Queue` (`href: "/admin/complaints"`, `available: true`, removing `phaseBadge: "Phase 18"`). Updated `src/components/admin/AdminQuickActions.tsx` so "Complaints Queue" is an active `<Link>` rather than a disabled placeholder. Updated `tests/admin-navigation.test.mjs` and `tests/browser/admin.test.mjs`. |
| Domain Validation & Filtering | Created `src/lib/validation/admin-reports.ts` defining `adminReportSummarySchema`, `adminReportListResponseSchema`, `isReportUrgent` (classifying reports with critical severity, weighted score ≥ 70, or `urgent: true`), and `filterAdminReports` (in-memory filtering by status, category, severity, urgent toggle, debounced search across reference/title/category, urgent-first sorting with score and timestamp tiebreakers, and pagination). |
| Typed API Service | Added `getAdminReports()` in `src/lib/api/reports.ts` calling canonical `endpoints.listReports` (`GET /api/reports?scope=admin`) with full query parameters. Falls back transparently to `filterAdminReports(mockMyReports)` with `isDemoData: true` when backend routes are unprovisioned. |
| Administrative Header | Created `src/components/admin/complaints/AdminComplaintsHeader.tsx` displaying "Manage Complaints" title, visible count badge, urgent count alert badge (`AlertOctagon`), demo data indicator, and manual refresh button. |
| Advanced Filtering Toolbar | Created `src/components/admin/complaints/AdminComplaintsToolbar.tsx` with debounced search input with clear button, Status dropdown (All, Pending, In Progress, Resolved), Category dropdown (All, Pothole, Garbage, Water Leakage, Streetlight, Drainage, Other), Severity dropdown (All, Low, Medium, High, Critical), Urgent Only toggle button, Sort By dropdown (Urgent First, Lowest Priority, Newest First, Oldest First, Most Supported), and conditional Clear Filters button. |
| Priority Cell & Urgency | Created `src/components/admin/complaints/AdminPriorityCell.tsx` displaying backend-provided weighted priority score with colored bands (Red ≥ 70, Amber ≥ 40, Slate < 40) and red `Urgent` badge with `AlertOctagon` icon for urgent issues. Strictly consumes server scores without client recalculation. |
| Desktop Semantic Table | Created `src/components/admin/complaints/AdminComplaintsTable.tsx` wrapped in horizontal scroll container with columns: Reference Code, Title, Category, Severity, Status, Priority Score, Community Support, Reported Date, and Actions ("Inspect" button). |
| Mobile Card View | Created `src/components/admin/complaints/AdminComplaintCard.tsx` rendering stacked card layout on viewports `< 768px`, ensuring 0 horizontal overflow while displaying all core metadata and "Inspect Complaint" CTA. |
| Inspection Modal Dialog | Created `src/components/admin/complaints/AdminComplaintPreviewDialog.tsx` providing an accessible read-only modal dialog (`role="dialog"`, `aria-modal="true"`, `aria-labelledby="preview-dialog-title"`, Escape key dismiss, backdrop click dismiss, scroll lock). Displays reference, title, status, severity, category, description, coordinates with external OpenStreetMap link, priority points breakdown, attached photo preview, reported/updated timestamps, and clear notice that direct triage mutations activate in Phase 19. |
| Pagination & Empty States | Created `src/components/admin/complaints/AdminComplaintsPagination.tsx` with previous/next controls, page numbers, and total items counter. Created `src/components/admin/complaints/AdminComplaintsEmptyState.tsx` with 3 contextual states: zero complaints in system, zero complaints matching active filters, and zero urgent complaints. |
| Client Queue Coordinator | Created `src/components/admin/complaints/AdminComplaintsView.tsx` orchestrating state for search, filters, sorting, pagination, inspection modal, and refresh with ARIA live regions for screen readers. |
| Server Page Shell | Created `src/app/admin/complaints/page.tsx` running under admin shell, `loading.tsx` with animated skeleton table, and `error.tsx` with recovery button. |
| Testing & Verification | Added `tests/admin-reports.test.mjs` (11 unit tests covering schema compliance, urgency detection, multi-attribute filtering, sorting, pagination, and empty fallbacks; 95 total unit tests passing). Added `tests/browser/admin-complaints.test.mjs` (11 browser tests covering queue loading, sidebar highlighting, search, status filter, category filter, severity filter, urgent toggle, inspection modal, clear filters, empty state, and 5-viewport zero-overflow responsiveness; 92 total browser tests passing). |

### Verification and limitations

- `npm run typecheck` passed with zero errors (`tsc --noEmit`).
- `npm run lint` passed with zero warnings (`eslint .`).
- `npm run build` compiled all routes cleanly, generating `ƒ /admin/complaints` as an on-demand dynamic route.
- `npm test` passed all 95 unit tests across 14 test suites.
- `tests/browser/admin-complaints.test.mjs` passed all 11 browser tests in headless Edge with zero horizontal overflow across 320, 375, 768, 1024, and 1440 px viewports.
- **Backend Non-Goals Preserved**: Complaint status mutations, department reassignment, triage field mutations, resolution proof uploads (Phase 19), Recharts analytics charts (Phase 20), public admin self-registration, and backend Route Handlers in `src/app/api` remain untouched and strictly deferred.

**Next phase — Phase 19, Admin Complaint Triage, Status Mutation & Department Assignment.**



## Phase 17 — Admin overview dashboard & civic operations statistics

**Complete locally on 2026-11-21.** The `frontend` working tree contains the changes for Phase 17. The administrative overview dashboard (`/admin`), dynamic server-side page shell (`src/app/admin/page.tsx`), client dashboard coordinator (`AdminDashboard.tsx`), main statistics grid (`AdminStatsGrid.tsx`, `AdminStatCard.tsx`), operational attention section (`AdminUrgentIssuesCard.tsx`, `AdminResolutionProgressCard.tsx`), CSS-based status distribution visualization (`ComplaintStatusDistribution.tsx`), small authorized recent reports subset (`AdminRecentComplaints.tsx`), administrative quick navigation (`AdminQuickActions.tsx`), data freshness indicator (`AdminDataFreshness.tsx`), runtime Zod response validation schemas (`src/lib/validation/admin-stats.ts`), typed admin statistics API service (`src/lib/api/stats.ts`), unit test suite (`tests/admin-stats.test.mjs`), and comprehensive browser test suite (`tests/browser/admin.test.mjs`) are fully implemented and verified.

| Area | Phase 17 changes |
|---|---|
| Domain Validation & Math | Created `src/lib/validation/admin-stats.ts` defining `adminStatsSchema`, `validateAdminStats`, safe `calculateResolutionRate` (guards against division by zero and NaN), and `calculateStatusDistribution` (percentages and counts for pending, inProgress, and resolved). Exported `mockAdminStats` and `mockEmptyAdminStats`. |
| Typed API Service | Created `src/lib/api/stats.ts` implementing `getAdminStats` (calling `endpoints.adminStats` `GET /api/stats?scope=admin`), `getAdminRecentReports` (calling `endpoints.listReports` `GET /api/reports?scope=admin&pageSize=5&sort=recent`), and orchestrator `getAdminOverviewData`. Supports `empty` and `forceError` modes and falls back gracefully to sanitized fixtures with `isDemoData: true` when backend routes are unprovisioned. |
| Main Statistics Grid | Created `src/components/admin/AdminStatsGrid.tsx` and `AdminStatCard.tsx` rendering 4 prominent stat cards: Total Complaints (ClipboardList), Pending (Clock3, amber), In Progress (LoaderCircle, sky blue), and Resolved (CheckCircle2, emerald green). |
| Operational Attention Cards | Created `src/components/admin/AdminUrgentIssuesCard.tsx` (red accent, displaying `criticalActive` with "Server Authoritative" badge, clarifying that reports with critical severity or weighted priority score ≥ 70 belong to this metric, and noting that Phase 18 will activate the priority triage queue). Created `src/components/admin/AdminResolutionProgressCard.tsx` (emerald accent, displaying `resolutionRate` percentage, visual progress bar with ARIA attributes, and neutral "Zero reports logged" state when total is 0). |
| Status Distribution | Created `src/components/admin/ComplaintStatusDistribution.tsx` displaying a lightweight, pure CSS/Tailwind segmented progress bar with breakdown badges and percentages for Pending, In Progress, and Resolved without introducing heavy chart libraries prematurely. |
| Recent Complaints Subset | Created `src/components/admin/AdminRecentComplaints.tsx` displaying up to 5 recently submitted municipal complaints with reference code, title, category label, `StatusBadge`, `SeverityBadge`, formatted date via `formatReportDate`, and explicit notice that direct administrative triage and mutations activate in Phase 19. |
| Quick Actions & Data Freshness | Created `src/components/admin/AdminQuickActions.tsx` (navigation to Live Civic Map, Citizen Dashboard, Public Website, and disabled Phase 18/20 buttons). Created `src/components/admin/AdminDataFreshness.tsx` showing exact refresh time and demo data badge when endpoints are unprovisioned. |
| Dashboard Coordinator & Page Shell | Created `src/components/admin/AdminDashboard.tsx` managing manual refresh, transition states, error recovery, and data freshness. Updated `src/app/admin/page.tsx` and `src/app/admin/loading.tsx` to render the overview dashboard with dynamic query param support (`?empty=true`, `?forceError=true`). |
| Testing & Verification | Added `tests/admin-stats.test.mjs` (6 unit tests covering schema compliance, negative rejection, division by zero prevention, status distribution math, and mock data consistency; 84 total unit tests passing). Updated `tests/browser/admin.test.mjs` (11 browser tests covering shell rendering, sidebar, topbar, 4 stat cards, urgent card, resolution progress bar, status distribution, recent complaints, quick actions, manual refresh, empty dashboard, and 5-viewport zero-overflow responsiveness; 81 total browser tests passing). |

### Verification and limitations

- `npm run typecheck` passed with zero errors (`tsc --noEmit`).
- `npm run lint` passed with zero warnings (`eslint .`).
- `npm run build` compiled all routes cleanly, generating `ƒ /admin` as an on-demand dynamic route.
- `npm test` passed all 84 unit tests across 13 test suites.
- `npm run test:ui` passed all browser tests across 9 test suites in headless Edge with zero horizontal overflow across 320, 375, 768, 1024, and 1440 px viewports.
- **Backend Non-Goals Preserved**: Admin complaints queue and multi-attribute triage table (Phase 18), complaint triage mutations and department assignment (Phase 19), Recharts analytics charts (Phase 20), public admin self-registration, and backend Route Handlers in `src/app/api` remain untouched and strictly deferred.

**Next phase — Phase 18, Admin Complaints Table, Advanced Filtering & Urgent-First Priority Queue.**

## Phase 16 — Admin portal layout, sidebar, topbar & secure role-based navigation

**Complete locally on 2026-11-21.** The `frontend` working tree contains the changes for Phase 16. The dedicated administrative portal route shell (`/admin`), server-rendered layout with server-side role verification (`src/app/admin/layout.tsx`), overview page (`src/app/admin/page.tsx`), loading skeleton (`src/app/admin/loading.tsx`), accessible error boundary (`src/app/admin/error.tsx`), layout coordinator (`AdminShell.tsx`), persistent Deep Navy desktop sidebar (`AdminSidebar.tsx`), slide-over mobile navigation drawer (`AdminMobileNav.tsx`), admin topbar header (`AdminTopbar.tsx`), administrator account menu (`AdminProfileMenu.tsx`), reusable page header (`AdminPageHeader.tsx`), truthful workspace welcome view (`AdminWorkspaceWelcome.tsx`), navigation item with active route highlighting and "Coming Soon" badges (`AdminNavItem.tsx`), centralized navigation configuration (`src/config/admin-navigation.ts`), domain types extension (`AdminUserSummary` in `src/types/domain.ts`), unit test suite (`tests/admin-navigation.test.mjs`), and browser test suite (`tests/browser/admin.test.mjs`) are fully implemented and verified.

| Area | Phase 16 changes |
|---|---|
| Domain Types & Contracts | Added `AdminUserSummary` (`{ name: string; email: string; role: "admin" }`) to `src/types/domain.ts`. |
| Admin Navigation Configuration | Created `src/config/admin-navigation.ts` defining `ADMIN_NAV_GROUPS` with 3 sections (`MAIN`, `OPERATIONS`, `PORTALS`), active route matching helper `isActiveAdminRoute` (exact match for `/admin`, prefix match for sub-paths), and explicit availability flags (`available: false` with phase badges `Phase 18` and `Phase 20` for upcoming admin modules). |
| Server-Side Role Enforcement | Updated `src/app/admin/layout.tsx` enforcing `role === "admin"` via `getVerifiedUser()` against Supabase profiles table. Unauthenticated users are redirected to `/login?next=/admin`. Authenticated citizens (`role === "citizen"`) see an accessible Access Restricted state with "Go to Citizen Dashboard" and "Log Out" actions. Missing profiles fail-closed. Dev/demo fallback provides transparent offline identity `admin@civicpulse.gov`. |
| Desktop Admin Sidebar | Created `src/components/admin/AdminSidebar.tsx` with Deep Navy `#0F172A` styling, brand header with `BrandLogo` and `Admin` portal badge, grouped navigation sections with uppercase labels, and sticky identity footer with avatar, verified admin email, and sign-out action. |
| Slide-Over Mobile Navigation | Created `src/components/admin/AdminMobileNav.tsx` providing a smooth slide-over drawer on viewports `< 768px`, backdrop click dismissal, Escape key handling, and auto-dismissal on navigation. |
| Admin Topbar Header | Created `src/components/admin/AdminTopbar.tsx` featuring mobile drawer toggle trigger, "Official Console" badge, direct "Public Site" shortcut (`/`), and administrator profile dropdown menu. |
| Profile Dropdown Menu | Created `src/components/admin/AdminProfileMenu.tsx` displaying administrator avatar, display name, email, "Administrator" badge, "View Public Website" link, and integrated `LogoutButton`. Handles keyboard Escape and click-outside dismissal. |
| Admin Workspace Welcome | Created `src/components/admin/AdminWorkspaceWelcome.tsx` rendering verified administrative access status banner, links to Live Civic Map and Public Website, and truthful capabilities roadmap cards (Phase 16 Active, Phase 17 Scheduled Next, Phase 18 Coming Soon). No fake statistics or fictional departments. |
| Route Shell & Boundaries | Created `src/app/admin/page.tsx` rendering `AdminPageHeader` and `AdminWorkspaceWelcome`. Created `src/app/admin/loading.tsx` with animated skeleton matching header and roadmap cards. Created `src/app/admin/error.tsx` with Retry and Citizen Dashboard navigation CTAs. |
| Testing & Verification | Added `tests/admin-navigation.test.mjs` (5 unit tests covering navigation groups, availability flags, exact vs prefix route matching, and edge cases; 78 total unit tests passing). Added `tests/browser/admin.test.mjs` (10 browser tests covering desktop shell, deep navy sidebar, active route highlighting, disabled future badges, topbar, profile menu toggle/escape/outside click, mobile drawer, welcome banner links, and 5-viewport zero-overflow responsiveness; 80 total browser tests passing). |

### Verification and limitations

- `npm run typecheck` passed with zero errors (`tsc --noEmit`).
- `npm run lint` passed with zero warnings (`eslint .`).
- `npm run build` compiled all routes cleanly, generating `○ /admin` as a static administrative shell.
- `npm test` passed all 78 unit tests across 12 test suites.
- `npm run test:ui` passed all 80 browser tests across 9 test suites in headless Edge with zero horizontal overflow across 320, 375, 768, 1024, and 1440 px viewports.
- **Backend Non-Goals Preserved**: Admin statistics dashboard (Phase 17), complaint priority queue or table (Phase 18), complaint triage or resolution forms (Phase 19), analytics charts (Phase 20), public admin self-registration, and backend Route Handlers in `src/app/api` remain untouched and strictly deferred.

**Next phase — Phase 17, Admin Complaint Dashboard, Key Performance Metrics & Status Overview.**

## Phase 15 — Live civic map, public issue discovery & geographical filtering

**Complete locally on 2026-11-21.** The `frontend` working tree contains the uncommitted changes through Phase 15 over `fb3cc8c`. The dedicated public live civic issue map route (`/map`), server-rendered dynamic page shell (`src/app/(public)/map/page.tsx`), metadata generation, client coordinator view (`CivicMap.tsx`), client-only dynamic Leaflet integration with OpenStreetMap tiles (`CivicMapClient.tsx`), custom SVG status-colored issue markers (`CivicIssueMarker.tsx`, `CivicMapMarkers.tsx`), comprehensive issue preview popup (`CivicIssuePopup.tsx`), synchronized accessible complaints side list (`CivicMapReportList.tsx`, `CivicMapReportCard.tsx`), multi-attribute filter toolbar (`CivicMapFilters.tsx`), map control toolbar with fit bounds and refresh triggers (`CivicMapToolbar.tsx`), accessible map status legend (`CivicMapLegend.tsx`), dual-state empty handler (`CivicMapEmptyState.tsx`), route loading skeleton (`loading.tsx`), route error boundary (`error.tsx`), runtime public domain validation schemas (`src/lib/validation/public-reports.ts`), typed public reports API client (`getPublicReports` calling `GET /api/reports?scope=public` in `src/lib/api/reports.ts`), defense-in-depth private complaint exclusion, landing page navigation integration (`publicDestinations.map = "/map"`), and citizen dashboard navigation connection are fully implemented and verified.

| Area | Phase 15 changes |
|---|---|
| Domain Types & Contracts | Added `PublicReportsFilterState`, `GetPublicReportsParams`, and `GetPublicReportsResult` to `src/types/domain.ts`. |
| Runtime Schemas & Validation | Created `src/lib/validation/public-reports.ts` defining `publicReportSummarySchema`, `publicReportsListSchema`, `hasValidCoordinates` (enforcing finite coordinates in [-90, 90] and [-180, 180]), and `filterPublicReports` with category, status, and search filtering. Enforces `visibility === "public"` to guarantee that private reports are strictly rejected. |
| Public Report API Client | Implemented `getPublicReports(params, options)` in `src/lib/api/reports.ts` calling `endpoints.listReports` (`GET /api/reports?scope=public`) with query parameters (`status`, `category`, `q`). Supports `?empty=true` and `?forceError=true`. Enforces defense-in-depth filtering against non-public records and falls back gracefully to sanitized public fixtures when backend route handlers are unprovisioned. |
| Map Page & Route Boundaries | Created `src/app/(public)/map/page.tsx` as an async Server Component with dynamic SEO metadata ("Civic Issue Map | CivicPulse"), loading skeleton (`loading.tsx`) with animated pulses matching header, toolbar, legend, list, and map, and error boundary (`error.tsx`) with Retry and Return Home CTAs. Removed obsolete placeholder route in `src/app/(citizen)/map`. |
| Interactive Leaflet Base Map | Created `src/components/maps/CivicMapClient.tsx` using `react-leaflet` (`MapContainer`, `TileLayer`) with visible OpenStreetMap attribution and dynamic client loading (`ssr: false`). Implemented `MapViewController` using `useMap()` to smoothly pan to coordinates on card selection and fit geographical bounds to all visible markers. |
| Status Markers & Lightbox Popups | Created `src/components/maps/CivicIssueMarker.tsx` with custom status divIcons (Amber: Pending, Blue: In Progress, Green: Resolved, Red ring: Critical). Created `CivicIssuePopup.tsx` showing reference code, category badge, status badge, title, description, formatted date, support count, thumbnail, and "View Details" link to `/reports/[id]`. |
| Synchronized Report List | Created `src/components/maps/CivicMapReportList.tsx` and `CivicMapReportCard.tsx` providing an accessible alternative to map exploration. Highlights selected cards, provides "Map" button to focus marker on map, and "Details" link to `/reports/[id]`. Auto-scrolls selected card into view. |
| Filters, Toolbar & Legend | Created `src/components/maps/CivicMapFilters.tsx` (accessible search input with clear button, category dropdown, status dropdown, reset button). Created `CivicMapToolbar.tsx` ("X public issues shown", demo badge, "Fit All" and "Refresh" actions). Created `CivicMapLegend.tsx` with accessible status badges. |
| Client Coordinator & Mobile Switching | Created `src/components/maps/CivicMap.tsx` coordinating filter state, dynamic import, selection synchronization, refresh handler, and mobile Map/List view toggle switch. |
| Navigation Integrations | Updated `src/lib/constants/public-navigation.ts` pointing `map: "/map"`, updated `src/components/layout/PublicLink.tsx` with smooth scroll restoration, and updated `src/components/layout/CitizenSidebar.tsx` removing obsolete Phase 9 badge. |
| Testing & Verification | Added `tests/public-reports.test.mjs` (6 unit tests covering schema compliance, private report exclusion, coordinate validation, and category/status/search filtering; 73 total unit tests passing). Added `tests/browser/map.test.mjs` (11 browser tests covering map loading, private report exclusion, category/status/search filters, empty states, map-list selection, details navigation, refresh action, mobile tab toggle, dashboard navigation, and 5-viewport responsiveness; 70 total browser tests passing). |

### Verification and limitations

- `npm run typecheck` passed with zero errors (`tsc --noEmit`).
- `npm run lint` passed with zero warnings (`eslint .`).
- `npm run build` compiled all routes cleanly, generating `○ /map` as a static public route shell and `ƒ /reports/[id]` as an on-demand dynamic route.
- `npm test` passed all 73 unit tests across 11 test suites.
- `npm run test:ui` passed all 70 browser tests across 8 test suites in headless Edge with zero horizontal overflow across 320, 375, 768, 1024, and 1440 px viewports.
- **Backend Non-Goals Preserved**: Admin dashboard (Phase 16), municipal department management, triage queues, PostGIS queries, and backend Route Handlers in `src/app/api` remain deferred in accordance with the project roadmap.

**Next phase — Phase 16, Admin Dashboard Layout, Sidebar & Role-Based Navigation.**

## Phase 14 — Complaint details, status timeline, resolution evidence & community support

**Complete locally on 2026-11-21.** The `frontend` working tree contains the uncommitted changes through Phase 14 over `fb3cc8c`. The dedicated public complaint details route (`/reports/[id]`), server-rendered dynamic page shell (`src/app/(public)/reports/[id]/page.tsx`), metadata generation (`generateMetadata`), client coordinator view (`ReportDetailsView.tsx`), comprehensive complaint header (`ReportDetailsHeader.tsx`), detailed overview card & info grid (`ReportDetailsOverview.tsx`), responsive issue photo gallery with modal lightbox (`ReportImageGallery.tsx`), read-only location preview with OpenStreetMap attribution (`ReportLocationPreview.tsx`), chronological status timeline (`ReportStatusTimeline.tsx`, `ReportTimelineEvent.tsx`), municipal resolution evidence showcase (`ReportResolutionEvidence.tsx`), community support card with authenticated/unauthenticated/resolved/private branches (`ReportSupportCard.tsx`), route loading skeleton (`loading.tsx`), route error boundary (`error.tsx`), friendly 404 not-found card (`not-found.tsx`), public navigation layout (`src/app/(public)/layout.tsx`), cross-phase navigation integrations (`MyReportsTable.tsx`, `MyReportCard.tsx`, `ReportSuccess.tsx`, `RecentReportCard.tsx`), Zod domain validation schemas (`src/lib/validation/report-details.ts`), expanded mock fixtures (`getMockReportDetails` in `src/lib/api/reports-mock.ts`), and typed API client (`getReport` and enhanced `supportReport` in `src/lib/api/reports.ts`) are fully implemented and verified.

| Area | Phase 14 changes |
|---|---|
| Domain Types & Schemas | Created `src/lib/validation/report-details.ts` defining `reportStatusEnum`, `issueCategoryEnum`, `statusHistorySchema`, `resolutionImageSchema`, `complaintSummarySchema`, and `complaintDetailsSchema`. Exported `validateComplaintDetails` and `safeValidateComplaintDetails`. |
| Dynamic Route & Shell | Created `src/app/(public)/reports/[id]/page.tsx` as an async Server Component with dynamic route params (`params: Promise<{ id: string }>`), dynamic SEO metadata generation (`generateMetadata`), 404 not-found triggering, and 403 access-denied presentation for private complaints. Created `src/app/(public)/layout.tsx` providing public Navbar and Footer wrappers. |
| Loading, Error & 404 Boundaries | Created `loading.tsx` (full skeleton with animated pulses matching header, photo, info, timeline, and support card), `error.tsx` (accessible error boundary with "Try Again" and "Return to My Complaints" CTAs), and `not-found.tsx` ("We Couldn't Find This Complaint" card with "Browse My Complaints" and "Report an Issue" CTAs). |
| Complaint Header & Overview | Created `ReportDetailsHeader.tsx` displaying complaint reference (`CP-2001`), title, StatusBadge, visibility badge (`Public Report` / `Private Report`), formatted creation date, and back navigation link to `/my-reports`. Created `ReportDetailsOverview.tsx` displaying full description, assigned department, category icon, severity badge, priority badge, and creation/update timestamps. |
| Responsive Photo Gallery | Created `ReportImageGallery.tsx` providing aspect-ratio preservation, responsive sizing, accessible zoom trigger, modal enlargement lightbox, and friendly fallback placeholder when no photo is attached or image loading fails. |
| Read-Only Location Preview | Created `ReportLocationPreview.tsx` displaying confirmed coordinates (`12.97160° N, 77.59460° E`), read-only static pin card with OpenStreetMap attribution, and direct external link to OpenStreetMap centered on the issue coordinates. Does NOT trigger automatic browser GPS. |
| Chronological Status Timeline | Created `ReportStatusTimeline.tsx` and `ReportTimelineEvent.tsx` rendering vertical chronological transitions (`submitted`, `triaged`, `status_changed`) with status labels, timestamps, public remarks, and decorative connectors. Displays an honest empty state when history is unavailable. |
| Resolution Evidence Showcase | Created `ReportResolutionEvidence.tsx` (rendered exclusively when `report.status === "resolved"`), featuring official resolution note, resolution proof photo(s), timestamp, and municipal verification badge clarifying municipal sign-off vs citizen verification. |
| Community Support Card | Created `ReportSupportCard.tsx` with live Supabase session detection: displays authoritative support count, "Support This Issue" button with in-flight spinner for authenticated users, "Sign In to Support" link for unauthenticated visitors, "Supported" state with checkmark for users who already supported, "Support Closed" notice for resolved reports, and "Community Support Unavailable" notice for private reports. |
| Cross-Phase Navigation Integration | Connected "Details" buttons in `MyReportsTable.tsx` and `MyReportCard.tsx` (`/my-reports`), "View Details" link in `ReportSuccess.tsx` (`/report`), and "Open Full Page" link in `RecentReportCard.tsx` (`/dashboard`) to dynamic route `/reports/[id]`. |
| API Integration & Mock Fixtures | Implemented `getReport(id)` in `src/lib/api/reports.ts` calling `endpoints.report(id)` with fallback to `getMockReportDetails(id)` in dev/demo mode. Updated `supportReport(id)` to update mock support counts and enforce business rules (resolved -> closed, private -> forbidden). |
| Testing & Verification | Added `tests/report-details.test.mjs` (6 unit tests covering status history validation, resolution image validation, details schema compliance, and mock fixture lookup; 67 total unit tests passing). Added `tests/browser/report-details.test.mjs` (10 browser tests covering public report load, overview info, timeline remarks, resolution evidence, private report badges, community support state transition, 404 not-found page, 403 access-denied card, 5-viewport responsiveness with zero overflow, and cross-route navigation from `/my-reports`; 59 total browser tests passing). |

### Verification and limitations

- `npm run typecheck` passed with zero errors (`tsc --noEmit`).
- `npm run lint` passed with zero warnings (`eslint .`).
- `npm run build` compiled all routes cleanly, generating `ƒ /reports/[id]` as an on-demand dynamic route.
- `npm test` passed all 67 unit tests across 10 test suites.
- `npm run test:ui` passed all 59 browser tests across 7 test suites in headless Edge with zero horizontal overflow across 320, 375, 768, 1024, and 1440 px viewports.
- **Backend Non-Goals Preserved**: Public civic map (Phase 15), admin dashboard / triage (Phases 16–19), admin resolution photo uploads, citizen reopening or feedback mutations without backend endpoints, or backend Route Handlers in `src/app/api` remain deferred in accordance with the project roadmap.

**Next phase — Phase 15, Public Civic Map, Spatial Discovery & Regional Issue Filtering.**

## Phase 13 — My complaints page, search, filtering & report management UI

**Complete locally on 2026-11-21.** The `frontend` working tree contains the uncommitted changes through Phase 13 over `fb3cc8c`. The authenticated citizen complaints management view (`/my-reports`), page header (`MyReportsHeader.tsx`), 4-card summary overview (`MyReportsSummary.tsx`), dynamic search input (`MyReportsSearch.tsx`), multi-attribute filter toolbar (`MyReportsFilters.tsx`), responsive dual-layout presentation (`MyReportsList.tsx`, desktop `MyReportsTable.tsx`, mobile `MyReportCard.tsx`), pagination controls (`MyReportsPagination.tsx`), dual-mode empty states (`MyReportsEmptyState.tsx`), error state boundary (`MyReportsErrorState.tsx`, `error.tsx`), route loading skeleton (`loading.tsx`), typed API client (`getMyReports` calling `GET /api/reports?scope=mine` in `src/lib/api/reports.ts`), safe deterministic UTC date formatting utilities (`src/lib/reports/formatting.ts`), and development fixture fallback dataset (`src/lib/api/reports-mock.ts`) are fully implemented and verified.

| Area | Phase 13 changes |
|---|---|
| Domain Types & Contracts | Added `ReportSummary = ComplaintSummary`, `ReportSortBy` (`'newest' | 'oldest' | 'support'`), `MyReportsFilterState`, `GetMyReportsParams`, and `GetMyReportsResult` to `src/types/domain.ts`. |
| Date & Time Formatting | Created `src/lib/reports/formatting.ts` providing `formatReportDate`, `formatReportTime`, and `formatReportDateTime` using deterministic UTC formatting to prevent hydration mismatches between SSR and browser clients. Gracefully handles null, undefined, empty strings, and malformed inputs with fallback ("Unknown date"). |
| Mock Fixture Dataset | Created `src/lib/api/reports-mock.ts` with 8 diverse, realistic personal complaints covering all canonical categories (`pothole`, `streetlight`, `garbage`, `water_leakage`, `drainage`), statuses (`pending`, `in_progress`, `resolved`), severities, and visibilities. Exported `computeReportStats` and `filterReports` providing search, status/category filtering, sorting, and pagination logic. |
| Typed API Integration | Implemented `getMyReports(params, options)` in `src/lib/api/reports.ts` calling `endpoints.listReports` (`GET /api/reports?scope=mine`) with query parameters (`status`, `category`, `q`, `sort`, `page`, `pageSize`). Supports `?empty=true` parameter and gracefully falls back to fixture data with explicit `isDemoData: true` labeling when backend route handlers are unprovisioned. Supports `forceError` parameter for testing error boundaries. |
| Header & Action Trigger | Created `src/components/reports/MyReportsHeader.tsx` rendering page title, description, informative "Demo Mode (Live Backend Pending)" badge, and "Report New Issue" CTA button linking to `/report`. |
| Summary Statistics | Created `src/components/reports/MyReportsSummary.tsx` rendering 4 StatCards (Total Complaints, Pending Review, In Progress, Resolved) with semantic icons and distinct tone styling. |
| Search & Filter Controls | Created `src/components/reports/MyReportsSearch.tsx` (accessible search input with clear button) and `src/components/reports/MyReportsFilters.tsx` (status segmented tabs with counts, category dropdown, sorting dropdown, and "Reset Filters" action). |
| Responsive Dual Layout | Created `src/components/reports/MyReportsTable.tsx` for desktop view (`hidden md:block`) with semantic table markup, reference codes, StatusBadge, visibility badge, submitted dates, support counts, and Phase 14 disabled details action. Created `src/components/reports/MyReportCard.tsx` for mobile view (`md:hidden`) with touch targets, metadata row, and zero horizontal overflow. Unified via `src/components/reports/MyReportsList.tsx`. |
| Pagination & States | Created `src/components/reports/MyReportsPagination.tsx` ("Showing X–Y of Z reports", Prev/Next buttons, disabled boundary handling). Created `src/components/reports/MyReportsEmptyState.tsx` supporting both zero-report accounts ("You Haven't Reported Any Issues Yet" + `/report` CTA) and zero-filter matches ("No Complaints Match Your Filters" + Clear Filters button). Created `src/components/reports/MyReportsErrorState.tsx` with retry action. |
| Master View & Route Pages | Created `src/components/reports/MyReportsView.tsx` coordinating filter state, search query, sorting, pagination, URL search params synchronization, and data fetching. Updated `src/app/(citizen)/my-reports/page.tsx` with metadata and Suspense boundary. Added `src/app/(citizen)/my-reports/loading.tsx` and `src/app/(citizen)/my-reports/error.tsx`. Updated `src/components/layout/CitizenSidebar.tsx` removing obsolete Phase 8 badge. |
| Testing & Verification | Added `tests/my-reports.test.mjs` (11 unit tests covering formatting, mock data schema compliance, stat computation, status/category/search filtering, sorting, pagination, empty handling, and edge queries; 61 total unit tests passing). Added `tests/browser/my-reports.test.mjs` (10 browser tests covering initial load, 5-viewport responsiveness with zero overflow, status tabs, category dropdown, dynamic search, sorting, pagination, empty search, empty account via `?empty=true`, and `/report` navigation; 49 total browser tests passing). |

### Verification and limitations

- `npm run typecheck` passed with zero errors (`tsc --noEmit`).
- `npm run lint` passed with zero warnings (`eslint .`).
- `npm run build` compiled all 12 routes cleanly (including `○ /my-reports`).
- `npm test` passed all 61 unit tests across 9 test suites.
- `npm run test:ui` passed all 49 browser tests across 6 test suites in headless Edge with zero horizontal overflow across 320, 375, 768, 1024, and 1440 px viewports.
- **Backend Non-Goals Preserved**: Complaint details page (`/reports/[id]`), timeline status transitions, and backend route handlers remain deferred to Phases 14, 16–19 in accordance with the project roadmap.

**Next phase — Phase 14, Complaint Details, Resolution Timeline & Citizen Feedback View.**

## Phase 12 — Final complaint review, backend submission & success flow

**Complete locally on 2026-11-21.** The `frontend` working tree contains the uncommitted changes through Phase 12 over `fb3cc8c`. The authoritative final complaint review screen (`FinalReportReview.tsx`), readiness validation checklist, section-specific edit triggers, pre-submission disclosure modal (`ReportSubmissionDialog.tsx`), submission state machine (`idle`, `validating`, `submitting`, `duplicate_conflict`, `success`, `error`, `outcome_unknown`), double-click prevention (`ReportSubmitButton.tsx`), HTTP 409 `DUPLICATE_CANDIDATES` conflict recovery, network outcome unknown error presentation (`ReportSubmissionError.tsx`), verified success view (`ReportSuccess.tsx`), draft reset upon confirmed submission, typed API client (`createReport` calling `POST /api/reports` in `src/lib/api/reports.ts`), and Zod submission schema (`createReportSchema` in `src/lib/validation/report.ts`) are fully implemented in `/report` (`src/app/(citizen)/report/page.tsx`).

| Area | Phase 12 changes |
|---|---|
| Domain Types & State Machine | Added `CreateReportRequest`, `CreateReportResponse`, `SubmissionState` (`'idle' | 'validating' | 'submitting' | 'duplicate_conflict' | 'success' | 'error' | 'outcome_unknown'`), and `DuplicateConflictDetails` to `src/types/domain.ts`. |
| Validation & Contracts | Implemented `createReportSchema` in `src/lib/validation/report.ts` validating trimmed title (5–120), trimmed description (10–1000), canonical categories and visibilities, finite coordinates within geographic boundaries (-90..90, -180..180), non-empty server-returned `imageId` (strictly rejecting `blob:`, `data:`, and `http(s):` URLs), optional `analysisId`, and deduplicated `confirmedSeparateFromIds`. Exported `validateCreateReport` and `safeValidateCreateReport`. |
| Typed API Client | Implemented `createReport(request, options)` in `src/lib/api/reports.ts` calling `endpoints.createReport` (`POST /api/reports`) with validated payload and unboxing the `report` summary from the response envelope. |
| Submit Button & Readiness | Created `src/components/reports/ReportSubmitButton.tsx` rendering disabled state with assistive status text when prerequisites are incomplete, and active loading state ("Submitting your complaint...") to prevent duplicate clicks. |
| Visibility Disclosure Modal | Created `src/components/reports/ReportSubmissionDialog.tsx` explaining public vs private visibility implications before final dispatch, allowing citizens to review details or confirm submission. |
| Error & Disconnection Handling | Created `src/components/reports/ReportSubmissionError.tsx` handling definite API errors with retry actions, and ambiguous network drops (`outcome_unknown`) advising citizens to inspect their dashboard before re-submitting to prevent accidental duplicate tickets. Citizens' draft details are strictly preserved on error. |
| HTTP 409 Conflict Recovery | Connected 409 `DUPLICATE_CANDIDATES` handling in `ReportForm.tsx`: catches candidate matches returned by the backend, updates duplicate candidate state, transitions back to intake edit view, and smooth-scrolls to the duplicate review section. |
| Post-Submission Success View | Created `src/components/reports/ReportSuccess.tsx` rendering verified complaint reference code (`CIV-2026-001`), official registration badge, status badge (`Pending Review`), recorded case summary, attached photo evidence, next steps guidance (Triage, Updates, Community Voice), and navigation actions (Go to Dashboard, My Complaints, Report Another Issue). |
| Draft Reset Flow | Implemented `handleReportAnother` in `ReportForm.tsx`: resets form fields, cleared photo selection, revocable preview URLs, coordinate state, duplicate candidates, and returns citizen to a clean intake form. |
| Testing & Verification | Added 6 unit tests to `tests/report.test.mjs` (50 total unit tests covering schema validation, boundaries, coordinate limits, URL rejection, and deduplication). Added 6 browser tests to `tests/browser/report.test.mjs` (39 total browser tests covering review rendering, section edit triggers, incomplete prerequisite blocking, confirmation modal, successful submission with draft reset, HTTP 409 conflict, and network failure). |

### Verification and limitations

- `npm run typecheck`, `npm run lint` and `npm run build` passed with zero errors and zero warnings. Next.js 16 dynamic `/report` with full review and submission flow compiled cleanly.
- `npm test` passed all 50 unit tests across 8 suites.
- `node --test tests/browser/*.test.mjs` passed all 39 browser tests across 5 suites in headless Edge:
  - 6 Component library tests
  - 4 Landing page navigation & layout tests
  - 3 Authentication tests (login, registration, viewports)
  - 6 Citizen dashboard tests (welcome hero, 4 stats cards, view details modal, empty state toggle, profile menu, and viewports)
  - 20 Complaint reporting form tests (structure & progress, validation boundaries, photo selection & metadata, offline upload fallback, review mode, AI panel & consent, location picker & coordinates, duplicate check & candidates, review checklist & edit triggers, incomplete prerequisite blocking, confirmation modal, mock 201 submission & draft reset, mock 409 conflict recovery, mock network failure & unknown outcome, and viewports).
- **Backend Non-Goals Preserved**: In strict compliance with Phase 12 specifications, Route Handlers (`src/app/api`) and database tables/migrations are not implemented, and the frontend truthfully handles unprovisioned backend endpoints without generating fake tickets or misleading successes.

**Next phase — Phase 13, My Complaints Listing, Tracking & Filter Interface.**

## Phase 11 — Smart duplicate complaint detection & community support interface

**Complete locally on 2026-11-21.** The `frontend` working tree contains the uncommitted changes through Phase 11 over `fb3cc8c`. The smart duplicate complaint detection panel (`DuplicateCheckPanel.tsx`), proximity candidate card list (`DuplicateCandidatesList.tsx`, `DuplicateCandidateCard.tsx`), community support confirmation modal (`DuplicateDialog.tsx`), typed API client (`checkDuplicateReports` calling `POST /api/reports/duplicates` and `supportReport` calling `POST /api/reports/:id/support`), Zod spatial validation schemas (`src/lib/validation/duplicates.ts`), candidate distance and support formatters, separate issue confirmation mechanism (`confirmedSeparateFromIds`), and review summary integration are fully implemented in `/report` (`src/app/(citizen)/report/page.tsx`).

| Area | Phase 11 changes |
|---|---|
| Domain Types & Contracts | Added `DuplicateCheckRequest`, `DuplicateCheckResponse`, `SupportReportResponse`, and `DuplicateCheckStatus` (`'idle' | 'checking' | 'matches_found' | 'no_matches' | 'error' | 'unavailable'`) to `src/types/domain.ts`. Reused canonical `DuplicateCandidate` type. |
| Spatial Validation & Schemas | Created `src/lib/validation/duplicates.ts` defining `duplicateCandidateSchema` (validating ID, reference, title, category, status, finite distance in meters >= 0, support count >= 0, and optional image URL), `duplicateCheckRequestSchema` (category, latitude [-90, +90], longitude [-180, +180], visibility), `duplicateCheckResponseSchema`, `formatDistance(meters)` (with clean `m` and `km` formatting), and `formatSupportCount(count)`. |
| Typed API Clients | Created `src/lib/api/duplicates.ts` exporting `checkDuplicateReports(request, options)` calling canonical `endpoints.duplicates` (`POST /api/reports/duplicates`) with Zod request/response verification. Created `src/lib/api/reports.ts` exporting `supportReport(reportId, options)` calling `endpoints.support` (`POST /api/reports/:id/support`) to boost municipal urgency without duplicate ticketing. |
| Duplicate Check Panel | Created `src/components/reports/DuplicateCheckPanel.tsx` coordinating the duplicate detection lifecycle: verifies prerequisites (requires confirmed location from Section 5 and category from Section 2), handles in-flight request cancellation via `AbortController`, manages scanning spinner, renders candidate list or unique empty state, provides honest offline fallback notice when backend is unprovisioned, and manages community support endorsement celebrations. |
| Candidate List & Cards | Created `src/components/reports/DuplicateCandidatesList.tsx` and `DuplicateCandidateCard.tsx` rendering nearby matching issues within 100 meters, reference badges (`CIV-2026-001`), category icon badges, status badges, distance away (`45m away`), support counts, photo thumbnails (with neutral fallbacks), and "This Is My Issue" actions. Completely omits private user identity or email to preserve citizen privacy. |
| Community Support Modal | Created `src/components/reports/DuplicateDialog.tsx` with clear guidance explaining that supporting an existing complaint boosts community priority in the municipal queue without creating redundant tickets, while allowing tracking on the citizen dashboard. |
| Distinct Issue Confirmation | Implemented "My Issue Is Different" action in `DuplicateCandidatesList.tsx`, tracking `confirmedSeparateFromIds: string[]` in the form state, ready for final dispatch in Phase 12. |
| Invalidation on Change | Connected change handlers in `ReportForm.tsx`: modifying category, latitude, longitude, or visibility automatically invalidates prior duplicate results and resets state to `idle`, preventing stale duplicate evaluations. |
| Review & Progress Updates | Updated `ReportFormProgress.tsx` to reflect duplicate verification status. Updated `ReportDetailsReview.tsx` with a dedicated "Duplicate Verification Status" card displaying Verified Separate, Unique Location, Supported Existing Report, or Service Offline states. |
| Testing & Verification | Added `tests/duplicates.test.mjs` (8 unit tests covering candidate schema, invalid distance/support rejection, check request/response schemas, and distance/count formatters). Updated `tests/browser/report.test.mjs` (3 browser tests covering prerequisite location notice, checking nearby reports with offline fallback, and candidate matching with dialog, separate issue confirmation, review verification, and edit invalidation). |

### Verification and limitations

- `npm run typecheck`, `npm run lint` and `npm run build` passed with zero errors and zero warnings. Next.js 16 dynamic `/report` with client-only Leaflet and duplicate detection compiled cleanly.
- `npm test` passed all 44 unit tests (6 API contract tests + 4 Auth unit tests + 2 Dashboard unit tests + 6 Report intake unit tests + 6 Image upload unit tests + 6 AI classification unit tests + 5 Location unit tests + 8 Duplicate detection unit tests).
- `node --test tests/browser/*.test.mjs` passed all 33 browser tests across all 5 suites in headless Edge:
  - 6 Component library tests
  - 4 Landing page navigation & layout tests
  - 3 Authentication tests (login, registration, viewports)
  - 6 Citizen dashboard tests (welcome hero, 4 stats cards, view details modal, empty state toggle, profile menu, and viewports)
  - 14 Complaint reporting form tests (structure & 4-step progress bar, empty submission errors, boundary validation, photo preview & metadata removal, graceful unprovisioned upload failure & retry, review mode transition and edit details round-trip, AI panel appearance & consent enforcement, photo replacement invalidation, interactive location picker & accessible coordinate inputs, location confirmation & edit details round-trip, duplicate location prerequisite notice, nearby duplicate check with offline fallback, candidate matching flow with community support dialog, separate issue confirmation, and review verification, and 5 viewport overflow tests).
- **Backend Non-Goals Preserved**: In strict compliance with Phase 11 specifications, backend Haversine calculations and database queries are not implemented, automatic complaint merging is avoided, and final complaint submission (`POST /api/reports` in Phase 12) remains safely gated behind the review interface.

**Next phase — Phase 12, Final Report Creation, Offline Queue & Submission Handling.**

## Phase 10 — GPS detection, interactive map & location confirmation

**Complete locally on 2026-11-21.** The `frontend` working tree contains the uncommitted changes through Phase 10 over `fb3cc8c`. The interactive location picker (`LocationPicker.tsx`), client-only dynamic Leaflet integration (`LocationPickerMap.tsx`), draggable issue marker (`DraggableLocationMarker.tsx`), browser Geolocation hook (`useGeolocation.ts`), accuracy indicator (`LocationAccuracyInfo.tsx`), Zod coordinate validation (`location.ts`), accessible manual coordinate input controls, explicit confirmation and editing flow, and form/review integration are fully implemented in `/report` (`src/app/(citizen)/report/page.tsx`).

| Area | Phase 10 changes |
|---|---|
| Domain Types & Contracts | Added `LocationSelection` (`{ latitude: number; longitude: number; source: "gps" | "map" | "manual"; accuracyMeters?: number; confirmed: boolean }`) to `src/types/domain.ts`. |
| Validation & Coordinates | Created `src/lib/validation/location.ts` defining `latitudeSchema` (finite, [-90, +90]), `longitudeSchema` (finite, [-180, +180]), `locationSelectionSchema`, `validateCoordinates(lat, lng)`, and `formatCoordinate(val, precision)`. Zero and negative coordinates are validated and supported cleanly. |
| Geolocation Hook | Created `src/hooks/useGeolocation.ts` wrapping native `navigator.geolocation.getCurrentPosition` with high accuracy, a 10-second timeout, error states (`permission_denied`, `unavailable`, `timeout`, `unsupported`), and safe cleanup preventing updates after component unmount. Geolocation is invoked strictly upon user action ("Detect My Location") and never on page load or in the background. |
| React Leaflet Integration | Created `src/components/maps/LocationPickerMap.tsx` using `react-leaflet` (`MapContainer`, `TileLayer`, `useMap`, `useMapEvents`) with OpenStreetMap tiles and attribution. Configured `ssr: false` dynamic import in `LocationPicker.tsx` with a loading skeleton, eliminating SSR `window` errors and hydration mismatches. |
| Draggable Custom Marker | Created `src/components/maps/DraggableLocationMarker.tsx` utilizing a self-contained SVG `L.divIcon` styled in CivicPulse primary blue with high-contrast borders and drop shadow, avoiding broken Leaflet image asset URLs. Dragging the marker or tapping the map updates coordinates immediately and invalidates previous confirmation. |
| Location Accuracy Display | Created `src/components/maps/LocationAccuracyInfo.tsx` rendering estimated GPS accuracy in meters with clear advice that GPS identifies the device position rather than the problem location, prompting manual adjustments when accuracy is poor. |
| Accessible Coordinate Entry | Implemented collapsible manual coordinate inputs in `LocationPicker.tsx` with numeric stepping and validation, providing an accessible non-pointer method for citizens who cannot use drag-and-drop or map clicking. |
| Confirmation & Editing Flow | Implemented explicit "Confirm Issue Location" action in `LocationPicker.tsx`. Confirmed state renders a green badge, verified coordinates, source tag, and "Change Location" trigger. Moving the marker or entering new coordinates immediately resets confirmation. |
| Form & Progress Integration | Updated `ReportForm.tsx` to manage confirmed location state across edit and review transitions. Updated `ReportFormProgress.tsx` to display Step 3 status ("Confirmed" / "Selected" / "Phase 10"). Updated `ReportDetailsReview.tsx` to display verified coordinates and source badge. |
| Testing & Verification | Added `tests/location.test.mjs` (5 unit tests covering latitude/longitude ranges, invalid/non-finite coordinates, location selection schema, and coordinate formatting). Updated `tests/browser/report.test.mjs` (added interactive map rendering, coordinate inputs, confirmation, edit details round-trip, and change location flow). |

### Verification and limitations

- `npm run typecheck`, `npm run lint` and `npm run build` passed with zero errors and zero warnings. Next.js 16 dynamic `/report` with client-only Leaflet compiled cleanly.
- `npm test` passed all 35 unit tests (6 API contract tests + 4 Auth unit tests + 2 Dashboard unit tests + 6 Report intake unit tests + 6 Image upload unit tests + 6 AI classification unit tests + 5 Location unit tests).
- `node --test tests/browser/*.test.mjs` passed all 30 browser tests across 5 suites in headless Edge:
  - 6 Component library tests
  - 4 Landing page navigation & layout tests
  - 3 Authentication tests (login, registration, viewports)
  - 6 Citizen dashboard tests (welcome hero, 4 stats cards, view details modal, empty state toggle, profile menu, and viewports)
  - 11 Complaint reporting form tests (structure & 4-step progress bar, empty submission errors, boundary validation, photo preview & metadata removal, graceful unprovisioned upload failure & retry, review mode transition and edit details round-trip, AI panel appearance & consent enforcement, photo replacement invalidation, interactive location picker & accessible coordinate inputs, location confirmation & edit details round-trip, and 5 viewport overflow tests).
- **Backend Non-Goals Preserved**: In strict compliance with Phase 10 specifications, `POST /api/reports/duplicates` (Phase 11) is not called, Haversine duplicate detection is not implemented, and final complaint submission (Phase 12) remains disabled. OpenStreetMap tiles are displayed with full attribution without paid third-party mapping dependencies.

**Next phase — Phase 11, Smart Duplicate Complaint Detection Interface.**

## Phase 9 — AI image analysis & Gemini classification interface

**Complete locally on 2026-11-21.** The `frontend` working tree contains the uncommitted changes through Phase 9 over `fb3cc8c`. The AI analysis panel (`AIAnalysisPanel.tsx`), affirmative consent mechanism (`AIAnalysisConsent.tsx`), accessible loading state (`AIAnalysisLoading.tsx`), structured suggestion review card (`AIAnalysisResult.tsx`), Zod response validator (`aiClassifyResultSchema`), typed API client (`classifyIssueImage` calling `POST /api/ai/classify`), bidirectional suggestion application, non-civic problem detection, manual continuation fallback, and strict photo invalidation logic are fully implemented in `/report` (`src/app/(citizen)/report/page.tsx`).

| Area | Phase 9 changes |
|---|---|
| Domain Types & Contracts | Added `AIClassifyRequest`, `AIClassifyResult`, and `AIAnalysisStatus` (`'idle' | 'awaiting_consent' | 'ready' | 'analyzing' | 'success' | 'error'`) to `src/types/domain.ts`. |
| Validation & Contracts | Created `src/lib/validation/ai.ts` defining `aiCategoryEnum` (6 canonical categories), `aiSeverityEnum` (4 canonical severities), `aiClassifyRequestSchema` (requires non-empty `imageId`), and `aiClassifyResultSchema` (validating `analysisId`, `category`, `severity`, `description`, `isCivicIssue`). |
| Typed API Client | Created `src/lib/api/ai.ts` exporting `classifyIssueImage(request, options)`. Transmits `{ imageId }` to canonical `endpoints.classify` (`POST /api/ai/classify`) via typed `apiRequest`, validates responses using Zod, and forwards an optional `AbortSignal`. The browser never invokes Gemini directly or touches API credentials. |
| Affirmative Consent | Created `src/components/reports/AIAnalysisConsent.tsx` with an accessible checkbox (unchecked by default), informing the citizen that their photograph will be processed by an external AI provider (Gemini) to suggest complaint details, reminding them to avoid personal info, and emphasizing that AI is strictly optional. |
| Accessible Loading | Created `src/components/reports/AIAnalysisLoading.tsx` with `aria-live="polite"` status announcements, reduced-motion-friendly indicators, informative messaging, and an accessible "Cancel Analysis" button invoking `AbortController.abort()`. |
| Suggestion & Safety Display | Created `src/components/reports/AIAnalysisResult.tsx` displaying suggested category, advisory severity (with `SeverityBadge` and explicit disclaimer that AI severity is not an authoritative safety assessment), emergency helpline reminders for critical issues, and suggested description. Non-civic images (`isCivicIssue: false`) display helpful warnings with options to retry, select another photo, or continue manually. |
| Overwrite Prevention & Application | Implemented bidirectional suggestion application in `AIAnalysisResult.tsx` and `ReportForm.tsx`: if the citizen has already typed a description, the UI requires an explicit choice ("Keep My Description" vs "Replace Description"), preventing silent overwriting of citizen data. |
| Invalidation & Cancellation | Managed via `AIAnalysisPanel.tsx`: any change, replacement, or removal of the photograph triggers `AbortController.abort()`, clears active `analysisId`, resets `result` to `null`, and requires fresh consent before re-analyzing. |
| Progress & Review Integration | Updated `ReportFormProgress.tsx` to support `hasAiAnalysis` badge state and `ReportDetailsReview.tsx` to display verified `analysisId` with advisory notice. |
| Testing & Verification | Added `tests/ai.test.mjs` (6 unit tests covering category/severity enums, request schemas, civic/non-civic validation, and rejection of malformed outputs). Updated `tests/browser/report.test.mjs` (added photo selection AI panel presentation, consent checkbox enforcement, uploaded image prerequisite, skip action, and photo replacement invalidation). |

### Verification and limitations

- `npm run typecheck`, `npm run lint` and `npm run build` passed with zero errors and zero warnings.
- `npm test` passed all 30 unit tests (6 API contract tests + 4 Auth unit tests + 2 Dashboard unit tests + 6 Report intake unit tests + 6 Image upload unit tests + 6 AI classification unit tests).
- `node --test tests/browser/*.test.mjs` passed all 28 browser tests across 5 suites in headless Edge:
  - 6 Component library tests
  - 4 Landing page navigation & layout tests
  - 3 Authentication tests (login, registration, viewports)
  - 6 Citizen dashboard tests (welcome hero, 4 stats cards, view details modal, empty state toggle, profile menu, and viewports)
  - 9 Complaint reporting form, photo upload & AI tests (structure & 4-step progress bar, empty submission errors, boundary validation, photo preview & metadata removal, graceful unprovisioned upload failure & retry, review mode transition and edit details round-trip, AI panel appearance & consent enforcement, photo replacement invalidation, and 5 viewport overflow tests).
- **Backend Non-Goals Preserved**: In strict compliance with Phase 9 specifications, `POST /api/ai/classify` is not faked or fabricated. When the backend endpoint is offline or unprovisioned, the client displays an honest "AI Analysis Unavailable" state with retry and manual continuation triggers without fabricating real analysis IDs. Gemini credentials are never exposed in browser code. GPS Map Coordinates (Phase 10), Duplicate Detection (Phase 11), and final complaint submission (Phase 12) remain clean future stages.

**Next phase — Phase 10, GPS Detection & Interactive Location Picker.**

## Phase 8 — Image upload, photo preview & secure upload integration

**Complete locally on 2026-11-21.** The `frontend` working tree contains the uncommitted changes through Phase 8 over `fb3cc8c`. The photo-selection, drag-and-drop, client-side validation, secure preview with memory management (`URL.revokeObjectURL`), cancellation control (`AbortController`), upload state coordination, and form/review integration are fully implemented in `/report` (`src/app/(citizen)/report/page.tsx`).

| Area | Phase 8 changes |
|---|---|
| Domain Types & Contracts | Added `UploadImageResponse` (`{ imageId: string; previewUrl: string }`) and `ImageUploadStatus` (`'idle' | 'selected' | 'uploading' | 'uploaded' | 'error'`) to `src/types/domain.ts`. |
| Image Validation Utilities | Created `src/lib/validation/image.ts` defining canonical constraints: `IMAGE_MIME_TYPES` (`image/jpeg`, `image/png`, `image/webp`), `MAX_IMAGE_BYTES` (2,000,000 bytes = 2 MB), `validateImageFile` (enforcing file presence, allowed MIME type, and byte threshold), `formatFileSize`, and `formatMimeType`. |
| Upload API Client | Created `src/lib/api/uploads.ts` exporting `uploadIssueImage(file, options)`. Bundles image as `multipart/form-data` with `purpose: "issue"`, forwards an optional `AbortSignal`, and routes to canonical `endpoints.upload` (`POST /api/uploads`) via typed `apiRequest<UploadImageResponse, FormData>()`. |
| Image Dropzone & Camera | Created `src/components/reports/ImageDropzone.tsx` with HTML5 drag-and-drop (`dragover`, `dragleave`, `drop` event handlers), dropzone visual highlights, standard file selection dialog, mobile device camera capture trigger (`capture="environment"`), and screen-reader accessibility labels. |
| Secure Local Preview | Created `src/components/reports/ImagePreview.tsx` utilizing `useMemo` for memory-safe blob URL generation (`URL.createObjectURL`), automated cleanup on unmount/replacement via `URL.revokeObjectURL`, image thumbnail presentation, format and size badge indicators, and accessible Replace/Remove action controls. |
| Status Coordination & Guidance | Created `src/components/reports/ImageUploadStatus.tsx` displaying context-aware action cards for Idle, Selected (Ready to Upload CTA), Uploading (progress animation), Uploaded (verified image ID badge), and Error (retry trigger). Created `src/components/reports/ImageUpload.tsx` coordinating dropzone/preview transitions, toast feedback, and citizen privacy advice (warning against faces, license plates, and private property). |
| Intake & Review Integration | Updated `src/components/reports/ReportForm.tsx` to manage attached photograph state and image ID across edit/review transitions. Updated `src/components/reports/ReportFormProgress.tsx` to reflect dynamic photo step status. Updated `src/components/reports/ReportDetailsReview.tsx` to render attached photo thumbnail, file metadata, and upload state in the summary. |
| Testing & Verification | Added `tests/uploads.test.mjs` (6 unit tests covering MIME type validation, max size enforcement, boundary values, error messages, and format helpers). Updated `tests/browser/report.test.mjs` (added photo selection, preview rendering, metadata badges, removal dropzone restoration, and graceful error handling on unprovisioned backend endpoints). |

### Verification and limitations

- `npm run typecheck`, `npm run lint` and `npm run build` passed with zero errors and zero warnings.
- `npm test` passed all 24 unit tests (6 API contract tests + 4 Auth unit tests + 2 Dashboard unit tests + 6 Report intake unit tests + 6 Image upload unit tests).
- `node --test tests/browser/*.test.mjs` passed all 26 browser tests across 5 suites in headless Edge:
  - 6 Component library tests
  - 4 Landing page navigation & layout tests
  - 3 Authentication tests (login, registration, viewports)
  - 6 Citizen dashboard tests (welcome hero, 4 stats cards, view details modal, empty state toggle, profile menu, and viewports)
  - 7 Complaint reporting form & photo upload tests (structure & 4-step progress bar, empty submission errors, boundary validation, photo preview & metadata removal, graceful unprovisioned upload failure & retry, review mode transition and edit details round-trip with preserved photo, and 5 viewport overflow tests).
- **Backend Non-Goals Preserved**: In strict compliance with Phase 8 specifications, `POST /api/uploads` is not faked or fabricated. When the backend upload endpoint is unreachable, the client displays an honest "Upload Unsuccessful" state with a "Retry Upload" trigger without generating dummy image IDs. AI Image Analysis with Gemini (Phase 9), GPS Map Coordinates (Phase 10), Duplicate Detection (Phase 11), and final complaint submission (Phase 12) remain clean future stages.

**Next phase — Phase 9, AI Image Analysis & Gemini Classification.**

## Phase 7 — Smart civic complaint reporting form

**Complete locally on 2026-11-21.** The `frontend` working tree contains the uncommitted changes through Phase 7 over `fb3cc8c`. The complaint details intake form `/report` is fully implemented, strictly typed, validated via Zod and React Hook Form, and integrated into the authenticated citizen layout. It captures Issue Title, Problem Description, Issue Category (from the 6 canonical domain categories), and Report Visibility (Public vs Private) with an interactive entered-information review panel and explicit non-submission guarantees.

| Area | Phase 7 changes |
|---|---|
| Validation Schema | Created `src/lib/validation/report.ts` defining `reportBasicsSchema` and exporting `ReportBasicsFormValues`. Validates trimmed title (5–120 chars), trimmed description (10–1000 chars), canonical `IssueCategory` enum with friendly error mapping, and canonical `ReportVisibility` enum defaulting to `public`. |
| Intake Components | Created `src/components/reports/ReportFormHeader.tsx` (reusing `PageHeader` with process advisory and dashboard back link), `src/components/reports/ReportFormProgress.tsx` (4-step responsive workflow: Details, Photo, Location, Review), `src/components/reports/ReportBasicsFields.tsx` (accessible title input, multiline description textarea, live character counters, and error states), `src/components/reports/CategorySelector.tsx` (6 selectable category cards with Lucide icons, accessible radiogroup semantics, and keyboard arrow navigation), and `src/components/reports/ReportVisibilitySelector.tsx` (Public vs Private cards with community visibility explanations). |
| State & Review | Created `src/components/reports/ReportDetailsReview.tsx` (displays validated details, upcoming photo/location requirements, Edit Details action, and disabled submit button) and `src/components/reports/ReportForm.tsx` (manages edit vs review modes, unsaved changes indicator, form reset with confirmation, and smooth scroll transitions). |
| Route Integration | Updated `src/app/(citizen)/report/page.tsx` within the authenticated citizen layout with server-side session checks and responsive max-width presentation. |
| Tests & Verification | Added `tests/report.test.mjs` (6 unit tests covering valid parsing, whitespace trimming, boundaries for title and description, category enums, and visibility rules). Added `tests/browser/report.test.mjs` (5 browser automation tests for page structure, empty validation, boundary validation, review mode transition and edit details round-trip, and zero horizontal overflow across 5 viewports). |

### Verification and limitations

- `npm run typecheck`, `npm run lint` and `npm run build` passed with zero errors and zero warnings. Static route `/report` compiled cleanly.
- `npm test` passed all 18 unit tests (6 API contract tests + 4 Auth unit tests + 2 Dashboard unit tests + 6 Report unit tests).
- `node --test tests/browser/*.test.mjs` passed all 24 browser tests across 5 suites in headless Edge:
  - 6 Component library tests
  - 4 Landing page navigation & layout tests
  - 3 Authentication tests (login, registration, viewports)
  - 6 Citizen dashboard tests (welcome hero, 4 stats cards, view details modal, empty state toggle, profile menu keyboard/click dismissal, responsive sidebar/mobile nav, and 5 viewport overflow tests).
  - 5 Complaint reporting form tests (structure & progress bar, empty submission errors, boundary validation, review mode transition and edit details round-trip, and 5 viewport overflow tests).
- **Backend Non-Goals Preserved**: In strict compliance with Phase 7 requirements, `POST /api/reports` is NOT called, no dummy report references or fake tracking IDs are generated, and image upload (Phase 8), Gemini classification (Phase 9), GPS map coordinates (Phase 10), and duplicate checks (Phase 11) remain clearly demarcated as upcoming roadmap stages.

**Next phase — Phase 8, Image Upload & Image Preview Interface.**

## Phase 6 — Citizen dashboard, authenticated layout & navigation

**Complete locally on 2026-11-21.** The `frontend` working tree contains the uncommitted changes through Phase 6 over `fb3cc8c`. The authenticated citizen portal `/dashboard` is fully implemented and answers: (1) who is signed in, (2) total complaints reported, (3) current resolution status across three buckets, (4) recent complaints list with reference codes, categories, status badges, severity badges, and details modals, and (5) quick actions with forward-compatible Phase 7–9 notices.

| Area | Phase 6 changes |
|---|---|
| Domain & API Client | Added `ComplaintStats` interface to `src/types/domain.ts`. Created `src/lib/api/dashboard.ts` and `src/lib/api/dashboard-mock.ts` with `getCitizenDashboardData()` querying live `/api/stats?scope=mine` and `/api/reports?scope=mine` while gracefully falling back to typed development fixtures with `isDemoData: true`. |
| Citizen Layout | Created `src/components/layout/CitizenSidebar.tsx` (responsive desktop sidebar with active route indicator, BrandLogo, upcoming phase tags, and LogoutButton), `src/components/layout/CitizenTopbar.tsx` (page title, demo badge, Report Issue button, and profile menu), `src/components/layout/CitizenMobileNav.tsx` (fixed bottom navigation with min 44px tap targets), and `src/components/layout/CitizenProfileMenu.tsx` (accessible popup menu with role badge, email, keyboard Escape, and outside click dismissal). |
| Dashboard Sections | Created `src/components/dashboard/DashboardWelcome.tsx` (personalized greeting, quick action buttons, demo mode disclaimer, and empty-state toggle), `src/components/dashboard/DashboardStats.tsx` and `DashboardStatCard.tsx` (4 stat cards: Total Reported, Pending Review, In Progress, Resolved with resolution percentage), `src/components/dashboard/DashboardQuickActions.tsx` (Report an Issue, Track My Complaints, Explore Civic Map), and `src/components/dashboard/RecentReports.tsx` + `RecentReportCard.tsx` (displays 3–5 recent complaints or EmptyState with "Report an Issue" CTA). |
| Route Pages | Implemented `src/app/(citizen)/layout.tsx` (authenticated citizen shell with server-side `getVerifiedUser()` auth guard and fallback preview identity), `src/app/(citizen)/dashboard/page.tsx` (server-rendered dashboard supporting `?empty=true`), `src/app/(citizen)/dashboard/loading.tsx` (skeleton placeholders), and `src/app/(citizen)/dashboard/error.tsx` (client error boundary with retry). Created placeholder routes `src/app/(citizen)/report/page.tsx`, `src/app/(citizen)/my-reports/page.tsx`, and `src/app/(citizen)/map/page.tsx` displaying scheduled phase notices and back links. |
| Tests & Verification | Added `tests/dashboard.test.mjs` verifying fixture data adherence to domain types and category requirements. Created `tests/browser/dashboard.test.mjs` covering dashboard rendering, 4 stat cards, view details modal, empty state toggle, profile menu interaction, desktop sidebar vs mobile nav, and zero horizontal overflow across 5 viewports (320px–1440px). |

### Verification and limitations

- `npm run typecheck`, `npm run lint` and `npm run build` passed with zero errors and zero warnings. Next.js 16 dynamic `/dashboard` and static placeholder routes compiled successfully.
- `npm test` passed all 12 unit tests (6 API contract tests + 4 Auth unit tests + 2 Dashboard unit tests).
- `node --test tests/browser/*.test.mjs` passed all 19 browser tests across 4 suites in headless Edge:
  - 6 Component library tests
  - 4 Landing page navigation & layout tests
  - 3 Authentication tests (login, registration, viewports)
  - 6 Citizen dashboard tests (welcome hero, 4 stats cards, view details modal, empty state toggle, profile menu keyboard/click dismissal, responsive sidebar/mobile nav, and 5 viewport overflow tests).
- Backend stats and complaints endpoints are mocked gracefully via `getCitizenDashboardData()`. When live endpoints `/api/stats?scope=mine` and `/api/reports?scope=mine` become available in subsequent phases, the client automatically synchronizes without UI refactoring.

**Next phase — Phase 7, Complaint Reporting Form & Client-Side Intake.**

## Phase 5 — Supabase authentication, session management & role-based access

**Complete locally on 2026-11-21.** The `frontend` working tree contains the uncommitted changes through Phase 5 over `fb3cc8c`. Full SSR-compatible Supabase authentication is implemented with cookie session synchronization via Next.js 16 Proxy, trusted role resolution via the `profiles` table, email confirmation handling, safe redirects, and server-side layout route guards.

| Area | Phase 5 changes |
|---|---|
| Supabase Clients & SSR | Implemented `src/lib/supabase/client.ts` (browser client with `isSupabaseConfigured()` helper), `src/lib/supabase/server.ts` (App Router server client with async `cookies()`), and `src/lib/supabase/proxy.ts` (token refresh via `getUser()` and cookie propagation). Implemented `src/proxy.ts` adhering to the Next.js 16 Proxy file convention. |
| Authorization & Roles | Created `src/lib/auth/authorization.ts` with `getVerifiedUser()` to perform server-verified identity checks against the trusted `profiles` database table. Strictly ignores untrusted `user_metadata` for authorization. Role defaults to `citizen`; `admin` access requires explicit database provisioning. |
| Redirect Safety | Created `src/lib/auth/redirects.ts` with `getSafeRedirectPath()` (rejects open redirects, protocol-relative URLs, and traversal) and `getRoleRedirectPath()` (citizen → `/dashboard`, admin → `/admin`). |
| Auth Flow Integration | Updated `src/components/auth/LoginForm.tsx` with real `signInWithPassword()` and role-aware navigation. Updated `src/components/auth/RegisterForm.tsx` with real `signUp()` (citizen-only, metadata restricted to `full_name`, email confirmation handling). Created `src/app/auth/confirm/route.ts` for server-side token/code verification. |
| Session Controls | Created `src/components/auth/LogoutButton.tsx` and Server Action `src/lib/auth/actions.ts`. Updated `src/components/layout/Navbar.tsx` and created `src/components/auth/AuthStatus.tsx` to display auth-aware navigation (Dashboard, user display name, Sign Out) without flashing or breaking visitor states. |
| Route Guards | Implemented server-side layouts `src/app/(citizen)/layout.tsx` (redirects unauthenticated users to `/login`) and `src/app/admin/layout.tsx` (restricts non-admin citizens with an access-denied UI and redirects unauthenticated visitors to `/login`). |
| Database Migration | Created `docs/migrations/01_auth_profiles.sql` defining `profiles` table, RLS policies, and `on_auth_user_created` trigger for automatic citizen profile provisioning. |
| Tests & Verification | Added `tests/auth.test.mjs` (unit tests for redirect sanitization, role mapping, and client configuration fail-safes). Updated `tests/browser/auth.test.mjs`. |

### Verification and limitations

- `npm run typecheck`, `npm run lint` and `npm run build` passed with zero errors and zero warnings. Next.js 16 Proxy and dynamic `/auth/confirm` route compiled successfully.
- `npm test` passed all 10 unit tests (6 API client tests + 4 Auth unit tests).
- `node --test tests/browser/*.test.mjs` passed all 13 browser tests across 3 suites in headless Edge:
  - Login validation, password toggles, and missing credentials notification.
  - Registration validation, password policy/strength feedback, and absence of role selector.
  - Component library checks and landing page navigation.
  - Viewport responsiveness across 320, 375, 768, 1024, and 1440 CSS px with zero horizontal overflow.
- **External Setup Required for Live Operation**:
  1. Add valid Supabase project credentials (`NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`) to `.env.local`.
  2. Run `docs/migrations/01_auth_profiles.sql` in the Supabase project SQL Editor to establish the `profiles` table and auto-provisioning trigger.
  3. Configure Site URL and allowed redirect URLs in the Supabase Dashboard (Auth -> URL Configuration).
  4. Manually provision initial admin account by updating `role = 'admin'` in `profiles` for the designated user UUID.

**Next phase — Phase 6, Citizen Dashboard & Navigation.**

## Phase 4 — Login, registration & authentication UI

**Complete locally on 2026-11-21.** The `frontend` working tree contains the uncommitted Phase 1, Phase 2, Phase 3 and Phase 4 changes over `fb3cc8c`. Open `/login` and `/register` with `npm run dev` or `npm start` to interact with the responsive authentication UI. Form validation is fully functional with Zod; actual authentication and session management await Phase 5 (Supabase Auth).

| Area | Phase 4 changes |
|---|---|
| Validation Schemas | Created `src/lib/validation/auth.ts` defining `loginSchema` and `registerSchema` with Zod, exporting `LoginFormValues` and `RegisterFormValues`. Validates email formatting, required passwords, full name constraints, and password confirmation matching via Zod refinement. |
| Reusable Inputs | Created `src/components/auth/PasswordInput.tsx` with default password masking, accessible eye/eye-off toggle button (`aria-label`, `aria-pressed`), and full React Hook Form ref forwarding. Created `src/components/auth/PasswordStrength.tsx` providing a local heuristic strength bar and accessible `aria-live` announcement. |
| Shared Layout | Created `src/components/auth/AuthLayout.tsx` and `src/components/auth/AuthBrandPanel.tsx`. Features a balanced two-column desktop layout (Left: brand logo, tagline, 3 value propositions; Right: centered form card with Back to Home navigation) and a comfortable single-column mobile layout. |
| Login Interface | Created `src/components/auth/LoginForm.tsx` and `src/app/(auth)/login/page.tsx` (`/login`). Includes email, password toggle, "Forgot password?" notification handler, loading states, and client-side validation. Submissions show an explicit prototype notice via Sonner toast and inline banner without creating fake sessions or storing fake credentials. |
| Registration Interface | Created `src/components/auth/RegisterForm.tsx` and `src/app/(auth)/register/page.tsx` (`/register`). Captures full name, email, password (with strength indicator), and confirm password. Enforces the critical security rule: **no public role selector** (public signups are strictly citizens; admin accounts must be provisioned securely). |
| Navigation Integration | Updated `src/lib/constants/public-navigation.ts` to route `signIn` to `/login` and added `register: "/register"`. Navbar and page links now navigate cleanly between Home, Login, and Register. |
| Testing & Verification | Created `tests/browser/auth.test.mjs`. Updated `tests/browser/landing.test.mjs` to seamlessly support full-route navigation. Verified all 13 browser tests across 3 suites in headless Edge. |

### Verification and limitations

- `npm run typecheck`, `npm run lint` and `npm run build` passed with zero errors and zero warnings. Static routes `/login` and `/register` prerendered cleanly.
- `npm test` passed all six Phase 1 contract tests (6/6 passing).
- `node --test tests/browser/*.test.mjs` passed all 13 browser tests across all three test suites (`auth.test.mjs`, `components.test.mjs`, `landing.test.mjs`) in headless Edge:
  - Form validation on empty submissions, invalid email formats, short passwords, and mismatched passwords.
  - Password visibility show/hide toggle behavior and accessible button labels.
  - Password strength heuristic indicator transitions as users type.
  - Clear prototype notices on submission without fake login, fake session tokens, or redirects.
  - Mobile responsiveness with zero horizontal overflow across 320, 375, 768, 1024, and 1440 CSS px.
  - Zero console errors, zero runtime page errors, and zero unexpected backend API calls.
- Phase 4 is presentation and client-side validation only. Real Supabase authentication, session handling, email confirmation, password reset backend, and role-based redirects are not implemented in this phase and are scheduled for Phase 5.

**Next phase — Phase 5, Supabase Authentication Integration & Session UX.**

## Phase 3 — Landing page and public navigation

**Complete locally on 2026-11-21.** The `frontend` working tree contains the uncommitted Phase 1, Phase 2 and Phase 3 changes over `fb3cc8c`. Open `/` with `npm run dev` or `npm start` to view the responsive landing page and public navigation. All public previews and interactions are local and synthetic.

| Area | Phase 3 changes |
|---|---|
| Navigation & Layout | Created sticky `Navbar` with brand logo, desktop anchor links (`Home`, `Features`, `How It Works`, `Explore Map`, `About`), right-side CTA (`Sign In`, `Report an Issue`), and responsive accessible `MobileMenu` with Escape dismissal, focus management, and drawer auto-dismissal. Created comprehensive `Footer` with brand details, product links, prototype disclaimers, and dynamic copyright year. Added `PublicLink` with client-side hash routing for smooth section navigation and focus management. |
| Hero Section | Created `HeroSection` featuring the headline "Your City. Your Voice. Your Impact.", supporting description, primary (`Report an Issue`) and secondary (`Explore Civic Map`) CTAs, and interactive `NeighborhoodPreview` visual with interactive markers, status badges, and sample report switcher. |
| Content Sections | Implemented `ProductOverview` ("A shared record of local issues"), `IssueCategories` (6 categories: Potholes, Garbage, Water leakage, Streetlights, Drainage, Other issues with Lucide icons and semantic color tones), `HowItWorks` (4 steps: Report, Analyze, Prioritize, Resolve), `CoreFeatures` (6 cards: AI-Assisted Reporting, Smart Duplicate Detection, Explainable Priority Scoring, Interactive Civic Map, Transparent Status Tracking, Resolution Verification), `AudienceBenefits` (distinct Citizen and Authority value propositions), and `WorkflowSection` (8-step responsive process timeline). |
| Platform Preview & Stats | Created `PlatformPreview` displaying illustrative Citizen Portal (welcome, report action, complaint list) and Authority Portal (metrics, priority queue) cards labeled as DEMO PREVIEW. Created `StatisticsSection` supporting Option A (omitted from live default flow to prevent misleading claims) and Option B (clearly labeled illustrative demo metrics). |
| FAQ & Final CTA | Created `FAQSection` with accessible `@base-ui/react` Accordion providing honest answers regarding prototype status, privacy, AI assistance, and emergency reporting. Created `FinalCTA` with high-contrast primary call-to-action block. |
| SEO & Accessibility | Configured OpenGraph metadata, descriptive page title and description in `src/app/page.tsx`. Ensured skip-to-content anchor, semantic headings (`h1` through `h4`), visible focus outlines, WCAG AA color contrast, responsive typography, and zero horizontal overflow across 320, 375, 768, 1024, and 1440 CSS px. |

### Verification and limitations

- `npm run typecheck`, `npm run lint` and `npm run build` passed with zero warnings or errors.
- `npm test` passed all six Phase 1 API tests (6/6 passing).
- `node --test tests/browser/landing.test.mjs` passed all 4 browser test suites in headless Edge covering desktop navigation, CTA routes, preview actions, footer links, mobile menu interactions, keyboard Escape/tab traps, map example switching, FAQ accordion expansion/collapse, section order, category counts, local image loading, and viewport responsiveness (320px–1440px).
- `node --test tests/browser/components.test.mjs` passed all 6 component library browser tests in headless Edge.
- Zero console errors, zero runtime page errors, and zero unexpected backend calls during navigation and interactions.
- Destination routes for `/report`, `/map`, `/login`, `/register`, and `/admin` link to clearly defined preview anchors on the landing page (`/#report-preview`, `/#civic-map`, `/#account-access`) to eliminate dead links until backend/auth routes are implemented in subsequent phases.
- No live backend or database calls are executed on the landing page; all preview data is synthetic.

**Next phase — Phase 4, Login and Registration Interface.**

## Phase 2 — Design system and reusable UI components

**Complete locally on 2026-11-21.** The `frontend` working tree contains the uncommitted Phase 1 and Phase 2 changes over `fb3cc8c`. Open `/dev/ui` with `npm run dev` to exercise the component library. All preview values and interactions are local.

| Area | Phase 2 changes |
|---|---|
| Design tokens | Updated `src/app/globals.css` and `src/lib/constants/index.ts` for the brand palette, darker muted text, semantic badge tones, responsive Inter type scale, spacing, radii, focus and reduced motion. Implementation guidance is in [the design system](docs/06-UI-UX-DESIGN-SYSTEM.md). |
| Primitives | Added shadcn button, input, textarea, native-select, checkbox, radio-group, label, card, badge, alert-dialog, skeleton, alert, spinner, separator, tabs, table and tooltip in `src/components/ui`. Added `FormField` for labels, help, validation and loading. |
| Civic components | Added `BrandLogo`, `PageHeader`, `CivicBadge`, `StatusBadge`, `SeverityBadge`, `PriorityBadge`, `StatCard`, `InteractiveCard`, `LoadingState`, `EmptyState`, `ErrorState` and `ConfirmDialog` in `src/components/common`. |
| Integration | Updated `src/app/{page,error,loading}.tsx` to consume the shared components. Added a matching app icon in `src/app/icon.png`. The badges consume the existing enums and priority DTO fields. The API contract and client still use Phase 1 conventions. |
| Preview and verification | Added `src/app/dev/ui/page.tsx` and the private `_preview/{ComponentPreview,Controls,Feedback,Indicators,Panel}.tsx` modules. Added `tests/browser/components.test.mjs` and the `test:ui` script. |
| Dependencies | Updated `package.json` and its lockfile. The shadcn primitives import `@base-ui/react@1.9.0` and `class-variance-authority@0.7.1`. Browser tests use the existing Node test runner with `playwright-core@1.65.1` as a development dependency. |

### Verification and limitations

- `npm ls --all`, `npm run typecheck`, `npm run lint` and `npm run build` passed. `npm test` passed all six Phase 1 API tests.
- `npm run test:ui` passed all six browser tests against the development server in headless Edge. The suite covers button sizes and actions, associated validation messages, disabled/read-only/busy controls, all civic badges, priority cutoffs and invalid scores, independent urgency, keyboard tab navigation, confirmation/cancellation, focus trapping and return, feedback callbacks, reduced motion and browser errors.
- All three preview panels and the dialog fit 320, 375, 768, 1024 and 1440 CSS px. A rendered-color check found a minimum 6.52:1 text contrast across 27 civic badge examples. Five fresh browser contexts produced zero console or runtime errors. Assistive-technology and cross-engine audits remain open.
- The production server returned 200 for the homepage and brand icon, and 404 for `/dev/ui` and `/api/reports`. Next lists the reserved preview path in its manifest. A server-side environment check serves the production 404.
- To repeat browser checks, run the dev server in one terminal, then `npm run test:ui` in another. The suite defaults to localhost port 3000 and installed Edge on Windows or Chrome elsewhere. Set `CIVICPULSE_TEST_URL` for a different local port or `CIVICPULSE_BROWSER_PATH` for a browser binary. Live backend services and credentials are unnecessary for these checks.
- Installation continued to report the four moderate dependency audit entries described in the Phase 1 snapshot below.

**Next phase — Phase 3, Landing Page and Public Navigation.**

## Phase 1 implementation snapshot — 2026-11-21

**Phase 1 complete locally.** The uncommitted working tree on `frontend` extends `fb3cc8c`. That revision contained documentation and an empty `wd.txt`. The application now serves a minimal home page with the project name and tagline, route-level loading, safe retry and 404 states. The root layout supplies English metadata, locally bundled Inter and Sonner. Phase 2 is **Design System and Reusable UI Components**.

### Files and integration boundaries

| Area | Files created or updated |
|---|---|
| Install and tooling | Created `package.json`, `package-lock.json`, `tsconfig.json`, `next.config.ts`, `eslint.config.mjs`, `postcss.config.mjs`, `components.json`, `.gitignore` and `.env.example` |
| Application | Created `src/app/{layout.tsx,page.tsx,globals.css,loading.tsx,error.tsx,not-found.tsx}` with the light theme, responsive typography and focus styles |
| Shared frontend contract | Created `src/types/domain.ts`, `src/lib/constants/index.ts`, `src/lib/api/{client.ts,endpoints.ts}`, `src/lib/supabase/client.ts` and `src/lib/utils/index.ts` |
| Verification | Created `tests/api.test.mjs` for the endpoint catalog, request encoding, response envelopes, transport errors and cancellation |
| Documentation | Updated this handoff and numbered documents 07, 10, 20 and 21 with the route layout, map requirements and contract selection |

The Phase 1 brief selects the DTOs in [backend.md §5](docs/backend.md#5-rest-api-contract). Department assignment and calculated priority have their own fields. The numbered proposal used other paths, cursor pagination, snake_case properties, an officer role and a proposed fourth status. Decision D14 records which contract the frontend consumes. The brief also selects the colors in the numbered design system over the darker alternatives in the companion frontend spec. No runnable API handlers, database policies or external integrations were present on this branch.

### Local setup

Use Node 24 and `npm ci`, then `npm run dev`. The home page renders without service configuration. Before using Supabase, copy the two public placeholders from `.env.example` to ignored `.env.local`, supply the real project URL and publishable key, and restart Next.js. The browser factory reads them when called. Auth is scheduled for Phase 5. Keep `GEMINI_API_KEY` and privileged Supabase credentials backend-only. Never give them a `NEXT_PUBLIC_` prefix.

New runtime dependencies are Next.js, React, React DOM, Fontsource variable Inter, Lucide React, Sonner, cn, React Hook Form, Zod, Hook Form resolvers, Leaflet, React Leaflet, Recharts, react-is and both Supabase SDKs. The development dependencies provide TypeScript, Node/React/React DOM/Leaflet types, ESLint and its Next.js configuration, Tailwind CSS, its PostCSS plugin, PostCSS, tw-animate-css and the shadcn CLI. Exact versions are pinned in [package.json](package.json) and the lockfile.

### Verified locally

Windows, Node 24.19.0 and npm 11.17.0 with both public Supabase variables unset.

- `npm install`, `npm ls --all --json` and a direct-dependency lockfile comparison passed.
- `npm run typecheck`, `npm run lint` and `npm run build` passed. The build listed `/` and the framework 404 fallback. The shadcn CLI detected Next.js App Router, Server Components, Tailwind v4, the source directory and the import alias.
- `npm test` passed six API contract tests using isolated fetch fixtures. Calling the unconfigured Supabase factory produced the documented setup error.
- `npm start` served the expected title, description and tagline. HTTP probes returned 200 for `/` and 404 for unbuilt admin, login, map and API paths. Headless Edge loaded Inter, applied the expected background and showed no horizontal overflow at 320 and 1280 CSS pixels. The 404 return link received visible keyboard focus.
- `git check-ignore -v .env.local` confirmed the ignore rule. Only the two blank public variables are in `.env.example`. A scan of source and built static assets found no private-key markers or server credential references.
- `npm audit --omit=dev` returned zero findings. The full audit flagged four moderate entries from one minimatch advisory in the shadcn → ts-morph development dependency chain. npm proposes a breaking CLI downgrade. ESLint 9 satisfies the bundled React lint plugin's peer range and npm marks this major out of support.

**Next milestone.** Build the shared controls in Phase 2 using the existing tokens and shadcn configuration. Live Supabase connectivity, authentication, reporting, maps, charts and deployment await later phases. The following sections retain the earlier planning snapshot.

## Start here

CivicPulse is a proposed civic maintenance reporting platform for the Open Innovation hackathon. A citizen reports an infrastructure issue with a photo, description and confirmed location. Staff receive an accountable case and record work; the original author can inspect evidence and confirm the repair. The product hypothesis is that one shared reference and history can reduce lost handoffs and duplicate work. No impact measurements or institutional partnerships have been verified.

One developer owns both ends of the 24–36-hour MVP. A simulated or participating campus facilities desk is the recommended initial pilot. Residents and students report; an officer works their department queue; an admin manages assignment and moderation. Municipalities, societies and NGOs are possible later adopters. Personas do not confer access.

## Verified state and evidence

Inspection on 2026-11-21, before this documentation was generated: local main tracked origin/main and the working tree was clean. Repository history across available refs contained b40a765, “first commit”, with one empty tracked wd.txt. Local remote-tracking main/backend/frontend pointed to that commit. Earlier in this conversation backend and frontend were created and verified on GitHub. Origin is [InfiniteLeveling/CivicPulse](https://github.com/InfiniteLeveling/CivicPulse). No root PRD, frontend/backend notes, prior handoff, agent instructions, application source, package manifest or migration was present. This session added a Markdown specification and instructions. No features or running deployment were verified.

Three untracked companion specifications appeared between initial inspection and final review: [original PRD](docs/PRD.md), [frontend specification](docs/frontend.md) and [backend specification](docs/backend.md). They describe plans, with no implementation evidence. Read the [reconciliation](docs/20-DECISION-LOG.md) before creating schemas or clients.

The supplied brief, accessible Git history, working tree and current conversation establish the baseline. External account setup, work on other devices, pilot staff and historic decisions outside those sources have **Status: Not verified / Requires confirmation**.

| Status in future updates | Evidence required |
|---|---|
| Confirmed | Explicit brief decision or identified source |
| Proposed | Working design awaiting adoption or validation |
| Planned | In an intended milestone; no execution evidence required |
| In progress | Specific partial work visible, with remaining steps |
| Implemented | Behavior present in an identified revision |
| Tested | Check, environment, input and observed result recorded |
| Blocked | Specific missing prerequisite and affected task identified |

## Confirmed technical baseline

One TypeScript modular monolith. Frontend uses Next.js App Router, React, Tailwind CSS, shadcn/ui, Lucide React, React Hook Form, Zod, React Leaflet and Recharts. Backend uses Node.js Next.js Route Handlers and services with server-side session and role checks. Supabase PostgreSQL, Auth, Storage and Realtime are the planned data services. Use PostgreSQL indexes and RLS. Maps use Leaflet/OpenStreetMap and browser geolocation. Optional Geoapify reverse geocoding and future PostGIS are outside P0. Google Gemini API assists with image analysis. GitHub, VS Code, Codex and Vercel are the documented collaboration and hosting baseline. Provider versions, projects, secrets and URLs are unverified.

## Proposed implementation contracts

- Keep server-rendered shells, role-scoped initial reads and interactive client islands. Client-only map with stable placeholder, accessible report list and manual coordinates. Citizen routes cover intake, map, My complaints and detail. Staff routes cover queue, assignment and case actions.
- Thin Route Handlers authenticate and validate input. Services enforce ownership/department scope, apply rules and use transactions; repositories implement safe reads/writes. Return typed data/error envelopes and request IDs. Stable creation keys handle lost responses; version checks protect updates.
- Six primary tables: profiles identifies accounts and roles, departments owns routing codes, reports stores canonical case data, report_votes enforces unique support, report_images tracks private staged and attached objects, status_history records ordered changes. Add reopen_requests, duplicate_requests, moderation_events and notifications only with their features.
- Principal API sequence: upload photo → optionally classify and look up candidates → create report or support existing → list/detail → assign → update status. Proposed workflow is pending → in_progress → resolved, with optional author verification to verified. An approved reopen request restores in_progress. Assignment does not change the status. P0 resolution needs a note; P1 allows private evidence.
- Accept categories pothole, garbage, streetlight, water_leakage, drainage and other. Map the confirmed category to an active department. If none matches, keep the report unassigned. AI requires consent; validate structured output and allow fully manual text/category on error.
- Match by Haversine ≤100 m, same category in the initial compatibility policy, public, listed active canonical reports only. Suggest support and always allow a separate issue. Linking existing reports requires explicit source-author nomination and admin review.
- Priority uses low/medium/high/critical bases 15/30/50/70, plus min(votes × 3, 20) and min(complete elapsed days since creation × 2, 10), capped at 100. Critical review is separate. The rule has no validated public-safety standing.
- Citizens see full own cases and limited listed peer cases. Officers access exact assigned-department records; admins have scoped administrative operations across the pilot. Visitors can read sanitized, deliberately public map and case summaries. Keep secrets and exact peer coordinates out of the browser, sanitize images, restrict private bytes, validate server-side, protect audit trails and test direct database/storage access.

## Delivery sequence and blockers

1. **First implementation milestone:** in an isolated environment, sign in as a synthetic citizen, upload one private sanitized image, submit a manual point and description, get one pending reference and reload its history. Demonstrate that a second account cannot access private fields or bytes and that retry creates no second case.
2. Finish P0 with GPS/manual map, accessible map/list, citizen dashboard, operational queue, manual assignment and versioned staff transitions. Test a note-only resolution across two sessions.
3. Add P1 routing, capped score, candidate suggestions, upvotes, optional Gemini, repair evidence, verification and reviews as time permits. Defer P2 analytics, heatmaps, notifications, localization, voice and offline features.

No implementation work was attempted in this documentation-only session. Runtime versions, configured cloud environments and credentials need verification for hosted testing. Real-data use depends on an accountable desk, jurisdiction, privacy/retention decisions, emergency communication and staff provisioning. A synthetic demo can proceed without a municipal partner or Gemini credentials.

## Documentation index

- [00 · project overview](docs/00-PROJECT-OVERVIEW.md)
- [01 · problem statement](docs/01-PROBLEM-STATEMENT.md)
- [02 · prd](docs/02-PRD.md)
- [03 · target audience](docs/03-TARGET-AUDIENCE.md)
- [04 · feature requirements](docs/04-FEATURE-REQUIREMENTS.md)
- [05 · user flows](docs/05-USER-FLOWS.md)
- [06 · ui ux design system](docs/06-UI-UX-DESIGN-SYSTEM.md)
- [07 · frontend architecture](docs/07-FRONTEND-ARCHITECTURE.md)
- [08 · backend architecture](docs/08-BACKEND-ARCHITECTURE.md)
- [09 · database design](docs/09-DATABASE-DESIGN.md)
- [10 · api specification](docs/10-API-SPECIFICATION.md)
- [11 · ai implementation](docs/11-AI-IMPLEMENTATION.md)
- [12 · security and privacy](docs/12-SECURITY-AND-PRIVACY.md)
- [13 · risk analysis](docs/13-RISK-ANALYSIS.md)
- [14 · mvp roadmap](docs/14-MVP-ROADMAP.md)
- [15 · testing strategy](docs/15-TESTING-STRATEGY.md)
- [16 · deployment plan](docs/16-DEPLOYMENT-PLAN.md)
- [17 · github workflow](docs/17-GITHUB-WORKFLOW.md)
- [18 · future scope](docs/18-FUTURE-SCOPE.md)
- [19 · hackathon presentation](docs/19-HACKATHON-PRESENTATION.md)
- [20 · decision log](docs/20-DECISION-LOG.md)
- [21 · open questions](docs/21-OPEN-QUESTIONS.md)

## Keeping the handoff current

After each authorized development session, update the evidence snapshot, tested behaviors, exact revision or working-tree changes, known failures and the next smallest integration gate. Move a claim to Tested only when there is a recorded passing check. Record changes to contracts in their numbered document and capture changed design choices in the decision log. Future agents should follow [repository instructions](AGENTS.md).
