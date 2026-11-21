# Frontend architecture

One Next.js App Router tree serves the citizen and staff experiences. TypeScript contracts share Zod enums and input limits with the server. Use Tailwind and shadcn/ui for controls, Lucide React for labeled icons, React Hook Form for the intake draft, React Leaflet for interactive maps and Recharts for deferred analytics.

## Proposed tree

```text
src/
  app/
    layout.tsx                     global language, Inter and landmarks
    (public)/                      landing, register, login, map, reports/[id]
    (citizen)/layout.tsx           session and mobile navigation
    (citizen)/                     dashboard, report, my-reports, profile, notifications
    (staff)/admin/layout.tsx       verified staff shell and sidebar
    (staff)/admin/                 complaints/[id], departments, priority, analytics, settings
    api/                           route adapters
  components/ui/                   accessible shared controls and dialogs
  features/reports/                intake steps, detail, timeline and cards
  features/maps/                   map-only client island and equivalent list
  features/operations/             queue, assignment and repair review
  hooks/                           location permission and upload lifecycle
  lib/client/                      typed fetch adapter and browser auth
  lib/contracts/                   shared schemas, DTOs, taxonomy
  server/                          server-only services and data access
```

## Loading and interaction boundaries

Use Server Components for layouts, initial authorized report projections, list shells and static copy. Read session on the server and call the same read service used by Route Handlers. Do not cache private projections across users. Route groups organize layouts while preserving public URLs. Reject unsafe return URLs and recheck permissions in each data operation.

Use Client Components for form state, browser geolocation, file preview, uploads, filters, dialogs, charts, optional Realtime subscriptions and map interactions. Pass serializable DTOs across boundaries. Mount Leaflet inside a client wrapper that dynamically imports the map with server rendering disabled. Reserve a fixed-height placeholder and load its stylesheet. Avoid accessing window or constructing a map during server render. Initialize only after mount and release listeners on unmount. Keep the report list available throughout.

## Data and form lifecycle

1. Collect local inputs with React Hook Form. Apply shared Zod rules before upload and again at submission. Show step-specific messages without losing entries.
2. Upload sanitized-compatible source bytes through the upload operation, keep the returned image ID and release local preview URLs when replaced. Never pass the storage path as authority to attach an object.
3. Keep AI output as a suggestion until the user edits or accepts it. Submit confirmed fields and a stable submission key. After timeout reconcile or retry using the same key.
4. Typed API adapter parses data or error envelopes. For 401 return to login, 403 show access denied, 409 reload version, 422 map errors to fields, 429 honor retry delay. Preserve safe text on transient failures.
5. Use segment loading and error boundaries with retry for lists, maps and details. Realtime can invalidate the affected authorized read. Refetch on focus as a fallback; do not broadcast full private rows.

For OpenStreetMap tiles retain visible attribution, respect cache headers and avoid offline prefetch or bulk downloads. [OSM tile usage policy](https://operations.osmfoundation.org/policies/tiles/)

Paginate list reads, lazy-load map and analytics bundles and size authorized image previews. At narrow widths stack actions in reading order and test tab focus after route transitions. Exact routes and data dependencies appear in [page contracts](06-UI-UX-DESIGN-SYSTEM.md).
