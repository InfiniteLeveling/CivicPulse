# CivicPulse | Frontend Implementation Specification

**Version:** 1.0 · Companion: `PRD.md`, `backend.md`  
**Owner:** Member A (frontend), Member C (map/AI integration)  
**Stack:** Next.js App Router, React, TypeScript, Tailwind CSS, shadcn/ui, Lucide React, React Hook Form + Zod, React Leaflet, Recharts (P1), Supabase Auth.

## 1. Design system

Create shared tokens in `src/app/globals.css` and Tailwind theme. Light mode first.

| Token | Value | Usage |
|---|---|---|
| Primary | `#2563EB` | Buttons, links, active navigation |
| Navy | `#0F172A` | Headings, admin navigation |
| Background | `#F8FAFC` | App background |
| Surface | `#FFFFFF` | Cards, forms |
| Text muted | `#475569` | Secondary text |
| Border | `#E2E8F0` | Cards and inputs |
| Pending | `#B45309` | Status text |
| In progress | `#1D4ED8` | Status text |
| Resolved | `#15803D` | Status text |
| Critical / error | `#B91C1C` | Severity and errors |

Font: Inter (system fallback); 32/24/18 px headings, 14–16 px body. 8 px spacing rhythm, 12 px cards, 8 px buttons, 64 px desktop header, 240 px sidebar. Desktop admin sidebar in navy; citizen mobile uses bottom navigation. Use labels/icons along with status colors. Primary and secondary button states: default, hover, focus-visible, disabled and loading. Never show placeholder numbers as live statistics; label seed data as demo.

## 2. Routes and pages

| Priority | Route | Access | Main layout and elements |
|---|---|---|---|
| P0 | `/` | Public | Navbar, hero, Report Issue CTA, Explore Map CTA, category tiles, how it works, privacy and footer |
| P0 | `/login`, `/register` | Public | Auth form, validation, loading, links between forms |
| P0 | `/dashboard` | Citizen | Welcome header, own issue counts, report CTA, recent reports, quick map link |
| P0 | `/report` | Citizen | Photo upload, AI suggestion, editable fields, location picker, privacy selector, duplicate dialog, submit |
| P0 | `/map` | Public | Map/list layout, category and status filters, markers, locate button, marker details |
| P0 | `/my-reports` | Citizen | Search, status tabs, list of own or supported complaints, empty state |
| P0 | `/reports/[id]` | Public or authorized | Image, title, priority breakdown, department, support button, history, proof |
| P0 | `/admin` | Admin | Summary cards, urgent issue list, management link |
| P0 | `/admin/complaints` | Admin | Search/filter/sort, priority queue, paginated list/table |
| P0 | `/admin/complaints/[id]` | Admin | Report review, severity, visibility, department, status workflow, remarks, resolution photo |
| P1 | `/admin/priority` | Admin | Dedicated explainable queue; may reuse complaint list with sort preset |
| P1 | `/admin/analytics` | Admin | Category chart, report counts, resolution rate, backlog, trend chart |
| P1 | `/admin/departments` | Admin | Department cards, active/resolved counts; fixed seeded department list is enough |
| P2 | `/notifications`, `/profile`, `/admin/settings`, `/forgot-password` | Appropriate role | Alerts, profile settings, reset flow; not core demo |

P0 admin overview can derive stats from the P0 analytics API (basic counts); charts are P1. `/map` and public report details should not be placed inside an authentication-only layout. Admin protection is server-side plus backend RLS; frontend role checks only improve UX.

## 3. Page-by-page build instructions

### 3.1 Landing (`/`)
- Header: CivicPulse logo, How it works, Explore Map, Sign In.
- Hero: headline “Your City. Your Voice. Your Impact.”, short product description, `Report an Issue` (login if needed), `Explore Civic Map`.
- Category tiles: pothole, garbage, water leakage, streetlight, drainage, other; selecting one navigates to map filter or report form with initial category.
- Three-step workflow: report → prioritize → resolve. Footer: privacy, prototype disclaimer and repo link when available.
- Optional actual public totals; do not delay P0 for a landing-page statistics API.

### 3.2 Authentication (`/login`, `/register`)
- Login: email, password, password visibility toggle, submit, register link. Register: name, email, password, confirmation.
- Supabase Auth SDK; account confirmation handling if enabled. Redirect using trusted session role; preserve intended internal route if safe.
- Never expose a public admin registration option or role selector. Show clear errors and avoid exposing sensitive authentication internals.

### 3.3 Citizen dashboard and my reports
- Cards: total own reports, pending, in progress, resolved (use own report scope consistently).
- Prominent report button; recent three own reports; link to map and full list.
- `/my-reports`: tabs All / Pending / In Progress / Resolved; separate Supported tab using `scope=supported`. Search and load more. Cards show report reference, photo if authorized, category, status, date, support count and View Details.
- Use `GET /api/reports?scope=mine` for list. Dashboard counts use `GET /api/stats?scope=mine`.

### 3.4 Report form (`/report`)
Recommended one-page form with four visible sections; avoid implementing a complex wizard in the MVP.

| Element | Behavior |
|---|---|
| Photo upload | Camera/file picker; JPEG/PNG/WebP; preview, remove/replace; re-encode to remove EXIF and compress before upload; max 2 MB |
| Privacy guidance | Ask citizen to avoid faces, plates, home addresses and sensitive locations; offer `private` visibility |
| Analyze Photo | Explain that the photo will be sent to an external AI provider and obtain consent; upload into private staging; call `POST /api/ai/classify` with authorized image ID; show loading and editable suggestions |
| AI suggestion panel | Show category, severity suggestion and short description; label severity provisional; unsupported/failed AI shows manual alternative |
| Title, description | Required title 5–120 chars; description 10–1000 chars; prefill AI description if suitable but permit edit |
| Category | Required select with values defined in PRD; manual when AI fails or consent is declined |
| Location | Detect GPS with permission, show accuracy, allow manual placement and require explicit confirmation of issue location |
| Visibility | Public (community map) or Private (reporter/admin only), explain difference before submission |
| Submit | Call duplicate preview (`POST /api/reports/duplicates`), show candidate dialog if needed, then POST create or support |

Duplicate dialog includes candidate title, distance, category, status, support count, `Support Existing Issue` and `Create Separate Issue`. When supporting, do not create another report. If creation returns `409 DUPLICATE_CANDIDATES`, show returned candidates and request fresh confirmation. Show success with report reference and navigation to detail; keep draft on retryable failure. Prevent double-click submissions. Do not silently publish uploaded images before report submission; abandoned staging media should expire or be cleaned up.

### 3.5 Map (`/map`)
- Desktop: left filter/list panel, right Leaflet map. Mobile: full map with list toggle/bottom sheet. Accessible list is mandatory fallback.
- Categories, statuses, search by report title/reference, locate button, refresh; use currently displayed data for text search in MVP (label scope). Optional geocoding is not required.
- Marker click → issue title, status, category, support count, View Details. Severity critical marker uses icon or label, not color alone.
- Use `GET /api/reports?scope=public` with pagination/filter support; use bounded list for demo. Only public issues appear, and public identity fields are never requested.
- React Leaflet must render client-side; dynamically import the map with SSR disabled from a client component, import Leaflet CSS and keep container height defined. Preserve OSM/provider attribution; do not bulk fetch tiles. Show offline/error fallback if tiles fail.

### 3.6 Complaint details (`/reports/[id]`)
- Header: public reference, title, category, severity (suggested or reviewed), status, department and created date.
- Photo display; description, issue location, non-sensitive timeline, support count, score breakdown with severity/support/age components.
- `Support Issue` requires sign-in; hide or disable if viewer already supports, issue is resolved or private. On success, refresh data from server (no independent client score manipulation).
- For resolved reports: resolution photo(s), public remark, resolved timestamp; P1 reporter-only Confirm Resolution or Request Review form.
- Handle forbidden/not found with generic safe message; no private information in public payloads.

### 3.7 Admin overview and queue
- `/admin`: total, pending, in progress, resolved cards; critical count; urgent issue preview; button to manage complaints; basic data from `/api/stats?scope=admin`.
- `/admin/complaints`: search, category/status/department filters, priority sort, pagination, table or cards; columns reference, title, status, severity, score, department, age and Manage.
- Sort active issues critical-first then score then oldest as defined in PRD. Include explanation drawer for score components. Reuse this for P1 `/admin/priority`.
- Never assume AI severity is verified. Display “AI suggested” or “Admin reviewed”.

### 3.8 Admin complaint management
- Read report evidence, location, reporter-safe data, status history, AI suggestion and proposed department.
- Dropdowns for severity and department; visibility control for unsafe public content; backend permission required.
- Contextual actions `Save Triage`, `Start Work`, `Mark Resolved`. For resolution: required after-photo and remark, disable button until ready. Upload photo using `purpose=resolution`. Backend validates transition and associated authorized image.
- Optional P1 review requests: approve reopen or keep resolved with explanation. Do not delete prior history.
- Update data and show toast after successful API response; on conflict, reload current server state.

### 3.9 Analytics / supporting pages (P1/P2)
- Recharts: status/category counts, resolution rate and reported/resolved trends from real backend values. Label date range and sample data. When totals are zero, show no-data rather than invalid percentages.
- Department cards: department name, active/resolved counts, link with filter. Heatmap: public report density only, not a prediction of danger.
- P2 notifications/profile/settings: implement after core demo. No broken placeholder buttons; hide unbuilt navigation.

## 4. Component structure

```
src/
  app/
    layout.tsx, globals.css, page.tsx
    (auth)/login/page.tsx, register/page.tsx
    (public)/map/page.tsx, reports/[id]/page.tsx
    (citizen)/layout.tsx, dashboard/page.tsx, report/page.tsx, my-reports/page.tsx
    admin/layout.tsx, page.tsx, complaints/page.tsx, complaints/[id]/page.tsx
    admin/priority/page.tsx, analytics/page.tsx, departments/page.tsx  # P1
    api/                    # backend routes
  components/
    ui/                     # shadcn primitives
    layout/ Navbar.tsx, Sidebar.tsx, MobileNav.tsx, Footer.tsx
    reports/ ReportForm.tsx, PhotoUpload.tsx, AISuggestion.tsx, DuplicateDialog.tsx,
             ReportCard.tsx, ReportTable.tsx, StatusBadge.tsx, SeverityBadge.tsx,
             PriorityBreakdown.tsx, StatusTimeline.tsx, ResolutionProof.tsx
    maps/ CivicMap.tsx, LocationPicker.tsx, IssueMarker.tsx
    dashboard/ StatsCard.tsx, FilterBar.tsx, CategoryChart.tsx, TrendChart.tsx
    shared/ LoadingState.tsx, EmptyState.tsx, ErrorState.tsx
  hooks/ useGeolocation.ts, useReports.ts
  lib/ api-client.ts, supabase/client.ts, supabase/server.ts
  types/ domain.ts, api.ts
```

File paths above are a blueprint, not generated application source. Shared types should be agreed with backend in hour 1.

## 5. Shared frontend data contract

Use camelCase in API payloads; database columns are snake_case. Status and category values are identical across the product.

```ts
type Category = 'pothole' | 'garbage' | 'water_leakage' | 'streetlight' | 'drainage' | 'other';
type Status = 'pending' | 'in_progress' | 'resolved';
type Severity = 'low' | 'medium' | 'high' | 'critical';
type Visibility = 'public' | 'private';
type Priority = { score: number; severityPoints: number; supportPoints: number; agePoints: number; urgent: boolean };
type ReportSummary = {
  id: string; reference: string; title: string; description: string;
  category: Category; severity: Severity; severityReviewed: boolean;
  status: Status; visibility: Visibility; latitude: number; longitude: number;
  department: { id: string; name: string } | null;
  supportCount: number; priority: Priority;
  createdAt: string; updatedAt: string; resolvedAt: string | null;
  imageUrl: string | null; viewerHasSupported: boolean;
};
type ApiResult<T> = { data: T } | { error: { code: string; message: string; details?: unknown } };
```

Use `backend.md` as canonical endpoint and payload detail. Do not compute a separate authoritative score in the browser. Maps load sanitized/public records; signed media URLs may expire, so refresh when necessary.

## 6. API integration table

| UI action | API |
|---|---|
| Login/signup/logout | Supabase Auth SDK |
| Upload image | `POST /api/uploads` (multipart) |
| Analyze image | `POST /api/ai/classify` |
| Preview duplicates | `POST /api/reports/duplicates` |
| Create issue | `POST /api/reports` |
| Map / lists | `GET /api/reports?scope=public|mine|supported|admin` |
| Report detail | `GET /api/reports/:id` |
| Support | `POST /api/reports/:id/support` |
| Admin triage | `PATCH /api/admin/reports/:id/triage` |
| Admin status / proof | `PATCH /api/admin/reports/:id/status` |
| Department dropdown | `GET /api/admin/departments` |
| Dashboard counts | `GET /api/stats?scope=mine|admin` |
| P1 resolution feedback | `POST /api/reports/:id/feedback` |
| P1 review feedback | `POST /api/admin/reports/:id/review` |

Call same-origin endpoints with authenticated session cookies. Check HTTP status and error envelope; show user-friendly errors, not raw stack traces. For P1 realtime, subscribe only to safe authorized events and refetch API; manual refresh or polling remains fallback.

## 7. UX quality and responsive checklist

- [ ] Forms labeled, keyboard navigable, validation announced, visible focus.
- [ ] Mobile width 360 px: no horizontal scroll; bottom nav and large tap targets.
- [ ] Tablet and desktop: responsive grid/sidebar; admin table horizontally scrolls or becomes cards.
- [ ] Loading skeletons on initial lists; spinner and disabled submit during request; retry when safe.
- [ ] Empty lists offer appropriate action; image/map errors have text alternatives.
- [ ] GPS denied → map pin; AI timeout → manual category and description; failed upload → retry.
- [ ] Privacy option and emergency disclaimer shown; public map never fetches private list.
- [ ] Citizen cannot see administrative UI controls, with actual authorization enforced on server.
- [ ] No placeholder actions, fabricated stats or hardcoded admin password in client code.
- [ ] Test deployed website on a phone and desktop, including upload/GPS over HTTPS.

## 8. Implementation order

1. Create shell, tokens, layout, navigation and shared types.
2. Build login/register and report form against temporary mock API data.
3. Connect uploads, AI, map/location, duplicate and create-report APIs.
4. Build list/details and status timeline.
5. Build admin list/triage/status form and evidence upload.
6. Integrate live backend, test two accounts + admin, add charts/realtime only if stable.

**Definition of done:** all P0 pages support the end-to-end demo on mobile and desktop with actual backend calls, including failure states and role boundaries. This specification intentionally prioritizes a lean MVP over every page from the larger blueprint.
