# CivicPulse Complaint Retrieval API & Frontend Integration Contract

## 1. Overview

This document specifies the complaint retrieval APIs for CivicPulse Phase 07:
- **Public Feed**: `GET /api/reports`
- **Personal Complaint History**: `GET /api/reports?mine=true`
- **Administrative Queue**: `GET /api/reports?scope=admin`
- **Complaint Details**: `GET /api/reports/:id`

These endpoints provide secure, paginated, filtered, and sorted access to civic complaints with strict role-aware data boundaries.

---

## 2. Endpoint Specifications

### A. Public Complaint Feed (`GET /api/reports`)

- **URL**: `/api/reports`
- **HTTP Method**: `GET`
- **Authentication**: Optional. Public visitors (anonymous) and authenticated users are permitted.
- **Data Scope**: Strictly returns records marked `publication = 'public'` and `visibility = 'listed'`.
- **Projection**: Safe public fields only. Omits `user_id`, `submission_key`, private notes, and internal administrative attributes.
- **Cache-Control**: `no-store`

#### Query Parameters

| Parameter | Type | Default | Constraints | Description |
|---|---|---|---|---|
| `page` | `integer` | `1` | `>= 1` | Current page number. |
| `limit` | `integer` | `20` | `1` to `50` | Number of complaints per page. |
| `category` | `string` | — | Canonical 7 values | Filter by civic problem category. |
| `status` | `string` | — | `pending`, `in_progress`, `resolved` | Filter by current resolution status. |
| `severity` | `string` | — | `low`, `medium`, `high`, `critical` | Filter by urgency/severity level. |
| `sort` | `string` | `newest` | `newest`, `oldest`, `priority_high`, `priority_low` | Sort order with deterministic ID tie-breaking. |
| `search` | `string` | — | Max 100 characters | Case-insensitive search on title and description. |

---

### B. Personal Complaint History (`GET /api/reports?mine=true`)

- **URL**: `/api/reports?mine=true`
- **HTTP Method**: `GET`
- **Authentication**: **Required**. Unauthenticated callers receive HTTP 401 `UNAUTHORIZED`.
- **Data Scope**: Strictly scoped to complaints where `user_id = auth.uid()`.
- **Projection**: Owner view. Includes `publication`, `visibility`, attached evidence images (`report_images`), and assigned department name.
- **Security Guard**: `?user_id=...` parameter is strictly forbidden and rejected with HTTP 422 `VALIDATION_ERROR`.

---

### C. Administrative Queue (`GET /api/reports?scope=admin`)

- **URL**: `/api/reports?scope=admin`
- **HTTP Method**: `GET`
- **Authentication**: **Required**. Caller must have `role = 'admin'` in `public.profiles`. Citizen callers receive HTTP 403 `FORBIDDEN`.
- **Data Scope**: Operational access to all complaints across departments.
- **Projection**: Full operational report data including private complaints, internal visibility, and all image metadata.

---

### D. Single Complaint Details (`GET /api/reports/:id`)

- **URL**: `/api/reports/:id`
- **HTTP Method**: `GET`
- **Parameters**: `id` (path parameter, valid UUID v4).
- **Authentication**: Optional, but contextual:
  - **Owner / Admin**: Receives full authorized detail (including private complaints, publication status, visibility, and detailed image list).
  - **Public Visitor**: Permitted if and only if the complaint is marked `publication = 'public'` and `visibility = 'listed'`.
  - **Unauthorized / Private Complaint**: Returns HTTP 404 `NOT_FOUND` to safely conceal the existence of private records.

---

## 3. Canonical Enumerations & Values

### Categories (`category`)
- `pothole` — Road potholes, craters, asphalt damage
- `garbage` — Waste accumulation, uncollected bins, litter
- `water_leakage` — Burst pipes, potable water leaks, hydrant issues
- `streetlight` — Broken fixtures, dark street segments, electrical hazards
- `drainage` — Blocked storm drains, open manholes, sewage overflow
- `damaged_infrastructure` — Broken sidewalks, damaged railings, compromised structures
- `other` — Valid civic issues not fitting above categories

### Statuses (`status`)
- `pending` — Newly submitted, awaiting triage
- `in_progress` — Triaged and actively being repaired
- `resolved` — Repair completed

### Severities (`severity`)
- `low` — Minor cosmetic or minor inconvenience
- `medium` — Standard localized disruption (default)
- `high` — Significant disruption or escalating risk
- `critical` — Immediate threat to public safety or life

### Sorting Options (`sort`)
- `newest` — `created_at DESC, id DESC` (default)
- `oldest` — `created_at ASC, id ASC`
- `priority_high` — `priority_score DESC, created_at DESC, id DESC`
- `priority_low` — `priority_score ASC, created_at DESC, id DESC`

---

## 4. Response Schemas

### Standard Pagination Envelope

```typescript
export interface ReportPagination {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
  has_next_page: boolean;
  has_previous_page: boolean;
}
```

### Public Feed Item (`PublicReportItem`)

```json
{
  "id": "77777777-7777-4777-8777-777777777777",
  "reference": "CP-77777777-7777-4777-8777-777777777777",
  "title": "Large pothole on Park Street",
  "description": "Deep crater causing severe vehicular disruption near college entrance.",
  "category": "pothole",
  "severity": "medium",
  "status": "pending",
  "priority_score": 0,
  "latitude": 22.5726,
  "longitude": 88.3639,
  "department_name": "Road Maintenance",
  "image_count": 1,
  "image_path": "drafts/11111111-1111-4111-8111-111111111111/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa.jpg",
  "created_at": "2026-11-21T13:20:00.000Z",
  "updated_at": "2026-11-21T13:20:00.000Z"
}
```

### Owner Feed Item (`OwnerReportItem`)

```json
{
  "id": "77777777-7777-4777-8777-777777777777",
  "reference": "CP-77777777-7777-4777-8777-777777777777",
  "title": "Large pothole on Park Street",
  "description": "Deep crater causing severe vehicular disruption near college entrance.",
  "category": "pothole",
  "severity": "medium",
  "status": "pending",
  "priority_score": 0,
  "latitude": 22.5726,
  "longitude": 88.3639,
  "publication": "private",
  "visibility": "listed",
  "department_name": "Road Maintenance",
  "image_count": 1,
  "images": [
    {
      "id": "img-uuid-1",
      "storage_path": "drafts/11111111-1111-4111-8111-111111111111/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa.jpg",
      "type": "before",
      "created_at": "2026-11-21T13:19:00.000Z"
    }
  ],
  "created_at": "2026-11-21T13:20:00.000Z",
  "updated_at": "2026-11-21T13:20:00.000Z"
}
```

### Report Detail Item (`ReportDetailItem`)

```json
{
  "id": "77777777-7777-4777-8777-777777777777",
  "reference": "CP-77777777-7777-4777-8777-777777777777",
  "title": "Large pothole on Park Street",
  "description": "Deep crater causing severe vehicular disruption near college entrance.",
  "category": "pothole",
  "severity": "medium",
  "status": "pending",
  "priority_score": 0,
  "latitude": 22.5726,
  "longitude": 88.3639,
  "publication": "public",
  "visibility": "listed",
  "is_owner": true,
  "department": {
    "id": "dept-uuid",
    "name": "Road Maintenance",
    "description": "City roads, potholes, asphalt paving"
  },
  "images": [
    {
      "id": "img-uuid-1",
      "storage_path": "drafts/11111111-1111-4111-8111-111111111111/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa.jpg",
      "type": "before",
      "created_at": "2026-11-21T13:19:00.000Z"
    }
  ],
  "created_at": "2026-11-21T13:20:00.000Z",
  "updated_at": "2026-11-21T13:20:00.000Z",
  "resolved_at": null
}
```

---

## 5. Frontend Screen Mapping

| Frontend Route | API Endpoint | Description |
|---|---|---|
| `/dashboard` | `GET /api/reports?page=1&limit=5&sort=newest` | Recent public complaints widget for the landing dashboard. |
| `/my-reports` | `GET /api/reports?mine=true&page=1&limit=20` | Citizen personal complaint history with full status and evidence. |
| `/reports/[id]` | `GET /api/reports/:id` | Full complaint detail page with department, status, and photos. |
| `/map` | `GET /api/reports?page=1&limit=50` | Interactive map markers for public complaints. |
| `/admin/complaints`| `GET /api/reports?scope=admin&page=1&limit=20` | Administrative triage table across all department queues. |

---

## 6. Frontend Fetch Examples

### Fetch Personal Reports (`/my-reports`)

```typescript
import type { ApiResponse } from "@/types/api";
import type { OwnerReportItem, ReportListResponse } from "@/types/report";

export async function fetchMyReports(page = 1, status?: string) {
  const params = new URLSearchParams({ mine: "true", page: String(page) });
  if (status) params.set("status", status);

  const res = await fetch(`/api/reports?${params.toString()}`);
  const data = (await res.json()) as ApiResponse<ReportListResponse<OwnerReportItem>>;

  if (!data.success) {
    throw new Error(data.error.message);
  }

  return data.data; // { items: OwnerReportItem[], pagination: ReportPagination }
}
```

### Fetch Complaint Detail (`/reports/[id]`)

```typescript
import type { ApiResponse } from "@/types/api";
import type { ReportDetailItem } from "@/types/report";

export async function fetchReportDetail(reportId: string) {
  const res = await fetch(`/api/reports/${reportId}`);
  const data = (await res.json()) as ApiResponse<ReportDetailItem>;

  if (!data.success) {
    if (res.status === 404) {
      return null; // Not found or private
    }
    throw new Error(data.error.message);
  }

  return data.data;
}
```
