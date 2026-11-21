# CivicPulse Map Viewport & Marker API Contract (Phase 16)

This document provides the definitive integration contract for frontend and backend engineers consuming the geographic bounding-box map endpoint, interactive marker previews, spatial filtering, and International Date Line handling in CivicPulse.

---

## 1. System Overview & Purpose

The CivicPulse map backend endpoint enables interactive Leaflet maps to request and render civic infrastructure complaints situated strictly within the user's current geographic viewport.

### Key Guarantees:
1. **Database-Side Spatial Filtering**: All coordinate boundary checks run directly in PostgreSQL using indexed numeric comparisons.
2. **Antimeridian Wraparound**: Viewports crossing the 180° meridian (International Date Line, `west > east`) are natively supported without data loss.
3. **Location Privacy & Minimal Projection**: Only map-safe summary attributes are projected. Citizen identities, voter lists, internal triage notes, and raw Storage paths are never leaked.
4. **Controlled Bounded Payloads**: Server-enforced marker limits (default 200, max 300) with accurate `has_more` overflow indicators prevent memory exhaustion.
5. **Deterministic Ordering**: Markers are ordered predictably (`created_at DESC, id DESC` or `priority_score DESC`).

---

## 2. API Endpoint Specification

### `GET /api/reports/map`

- **URL**: `/api/reports/map`
- **Method**: `GET`
- **Authentication**: Optional / Contextual
  - *Anonymous Visitors*: Access public, listed reports (`publication = 'public'`, `visibility = 'listed'`).
  - *Authenticated Citizens*: Access public listed reports.
  - *Administrators*: Access all operational reports.
- **Cache-Control**: `no-store` (guarantees fresh coordinates and status without stale cache leaks).

---

## 3. Query Parameters

### 3.1 Required Geographic Parameters

| Parameter | Type | Range | Description |
|---|---|---|---|
| `south` | `number` | `[-90, +90]` | Southern latitude boundary. Must be `< north`. |
| `west` | `number` | `[-180, +180]` | Western longitude boundary. |
| `north` | `number` | `[-90, +90]` | Northern latitude boundary. Must be `> south`. |
| `east` | `number` | `[-180, +180]` | Eastern longitude boundary. Must not equal `west`. |

### 3.2 Optional Filter Parameters

| Parameter | Type | Default | Description |
|---|---|---|---|
| `category` | `enum` | *None* | `pothole`, `garbage`, `water_leakage`, `streetlight`, `drainage`, `damaged_infrastructure`, `other`. |
| `status` | `enum` | Active | `pending`, `in_progress`, `resolved`, or `all`. Defaults to active unresolved issues (`pending`, `in_progress`). |
| `severity` | `enum` | *None* | `low`, `medium`, `high`, `critical`. |
| `department_id` | `string` (UUID) | *None* | Filter by assigned operational department UUID. |
| `limit` | `integer` | `200` | Minimum 1, maximum 300. |
| `sort` | `enum` | `newest` | `newest` (creation date descending) or `priority_high` (Phase 14 priority score descending). |

### 3.3 Forbidden Query Parameters

To prevent authorization spoofing and enumeration attacks, the following query parameters trigger immediate HTTP 422 rejection:
`user_id`, `role`, `is_admin`, `bypass_rls`, `include_private`, `raw_sql`.

---

## 4. Geographic Bounding Box Rules & Size Policy

1. **Latitude Ordering**: Requires `south < north`. Inverted latitudes or zero-height viewports (`south === north`) are rejected.
2. **Longitude Wrapping (Antimeridian)**:
   - When `west <= east`: Standard non-crossing viewport. Longitude predicate is `longitude >= west AND longitude <= east`.
   - When `west > east`: Dateline-crossing viewport. Longitude predicate is `longitude >= west OR longitude <= east`.
   - Equal longitudes (`west === east`) represent zero-width boxes and are rejected.
3. **Viewport Size Protection (Anti-Scrape)**:
   - Maximum latitude span: `50.0°`.
   - Maximum longitude span: `60.0°`.
   - Viewports exceeding these thresholds return HTTP 422 with guidance to zoom in (`"Please zoom in to view reports"`).
4. **Boundary Inclusions**:
   - Points lying exactly on bounding coordinates (`latitude == south`, `latitude == north`, `longitude == west`, `longitude == east`) are included.

---

## 5. Response Contract

### 5.1 Success Example with Matches (HTTP 200)

```json
{
  "success": true,
  "data": {
    "markers": [
      {
        "id": "77777777-7777-4777-8777-777777777777",
        "latitude": 22.5726,
        "longitude": 88.3639,
        "title": "Large pothole near campus entrance",
        "category": "pothole",
        "status": "pending",
        "severity": "high",
        "priority_score": 68,
        "department": {
          "id": "11111111-0000-4000-8000-000000000001",
          "name": "Road Maintenance"
        },
        "created_at": "2026-11-21T10:00:00.000Z"
      }
    ],
    "viewport": {
      "south": 22.50,
      "west": 88.30,
      "north": 22.70,
      "east": 88.50,
      "crosses_antimeridian": false
    },
    "returned_count": 1,
    "limit": 200,
    "has_more": false
  },
  "message": "Map reports retrieved successfully"
}
```

### 5.2 Success Example for Empty Viewport (HTTP 200)

```json
{
  "success": true,
  "data": {
    "markers": [],
    "viewport": {
      "south": 22.50,
      "west": 88.30,
      "north": 22.70,
      "east": 88.50,
      "crosses_antimeridian": false
    },
    "returned_count": 0,
    "limit": 200,
    "has_more": false
  },
  "message": "No reports found in this map area"
}
```

---

## 6. Error Responses

| HTTP Status | Error Code | Scenario | Message |
|---|---|---|---|
| `422 Unprocessable` | `VALIDATION_ERROR` | Missing or non-numeric coordinate | "south must be a valid finite number between -90 and 90" |
| `422 Unprocessable` | `VALIDATION_ERROR` | Inverted latitude (`south >= north`) | "Southern latitude must be strictly less than northern latitude" |
| `422 Unprocessable` | `VALIDATION_ERROR` | Degenerate zero-width box | "Western and eastern longitudes cannot be identical" |
| `422 Unprocessable` | `VALIDATION_ERROR` | Viewport span too large | "Viewport latitude span exceeds maximum allowed span of 50°. Please zoom in." |
| `422 Unprocessable` | `VALIDATION_ERROR` | Forbidden parameter | "Unauthorized query parameter 'user_id' is not permitted" |
| `422 Unprocessable` | `VALIDATION_ERROR` | Invalid limit | "limit cannot exceed 300" |
| `500 Server Error` | `INTERNAL_SERVER_ERROR` | Database query failure | "Failed to retrieve map complaints" |

---

## 7. Frontend Leaflet Integration Guidance

### 7.1 Reading Map Bounds in Leaflet

In React Leaflet or standard Leaflet:
```typescript
function getNormalizedBounds(map: L.Map) {
  const bounds = map.getBounds();
  const south = Math.max(-90, bounds.getSouth());
  const north = Math.min(90, bounds.getNorth());
  
  // Normalize longitude to [-180, +180]
  let west = bounds.getWest();
  let east = bounds.getEast();
  west = ((((west + 180) % 360) + 360) % 360) - 180;
  east = ((((east + 180) % 360) + 360) % 360) - 180;

  return { south, west, north, east };
}
```

### 7.2 Request Timing & Debouncing

- Trigger marker fetch on the Leaflet `moveend` event (do not trigger on continuous `move` or animation frames).
- Debounce requests by 300ms–500ms to avoid unnecessary traffic during fast user panning.
- Maintain an `AbortController` or query cancellation token to discard in-flight requests from prior viewports when newer bounds become active.

### 7.3 Marker Click & Detail Navigation

- When a user clicks a map marker, display a popup with the marker's `title`, `category`, `status`, `severity`, and `priority_score`.
- For full details, navigate the citizen to `/reports/[id]`. The report detail API ([docs/REPORT_RETRIEVAL_CONTRACT.md](REPORT_RETRIEVAL_CONTRACT.md)) provides complete authorized descriptions and images.
