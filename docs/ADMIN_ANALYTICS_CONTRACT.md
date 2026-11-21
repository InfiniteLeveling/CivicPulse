# CivicPulse – Administrative Analytics Contract

## 1. Overview
The Administrative Analytics Engine delivers high-performance, strictly aggregated, mathematically verified operational intelligence for CivicPulse municipal operators. All endpoints are restricted to authenticated users with the `admin` role and execute server-side database aggregations without exposing sensitive citizen data.

## 2. Authentication & Authorization
- **Requirement**: Valid Supabase Auth session with `profiles.role = 'admin'`.
- **Enforcement**: Handlers execute `await requireAdmin(request)`. Non-authenticated callers receive `401 UNAUTHORIZED`. Citizen callers receive `403 FORBIDDEN`.
- **Query Parameter Defense**: Injected parameters (`user_id`, `role`, `is_admin`, `bypass_rls`, `include_private`, `raw_sql`) are rejected immediately with `422 VALIDATION_ERROR`.
- **Caching**: All responses return with `Cache-Control: no-store` to prevent caching of privileged municipal insights.

---

## 3. Endpoints

### 3.1 Overview KPIs
- **Path**: `GET /api/admin/analytics/overview`
- **Query Parameters**:
  - `start` (string, optional): ISO date `YYYY-MM-DD` (UTC).
  - `end` (string, optional): ISO date `YYYY-MM-DD` (UTC). Default: today UTC. If `start` is omitted, defaults to 30 calendar days ending on `end`.
- **Response `200 OK`**:
```json
{
  "success": true,
  "data": {
    "period": {
      "start": "2026-10-23",
      "end": "2026-11-21",
      "timezone": "UTC"
    },
    "all_time_total_reports": 1240,
    "created_in_period": 142,
    "resolved_in_period": 98,
    "current_pending": 34,
    "current_in_progress": 56,
    "current_resolved": 1150,
    "current_active_backlog": 90,
    "current_unassigned_active": 12,
    "creation_cohort_resolution_rate_percent": 69.01
  }
}
```

### 3.2 Volume Trends (Time-Series)
- **Path**: `GET /api/admin/analytics/trends`
- **Query Parameters**:
  - `start` (string, optional): ISO date `YYYY-MM-DD` (UTC).
  - `end` (string, optional): ISO date `YYYY-MM-DD` (UTC).
  - `granularity` (string, optional): `"day"` | `"week"` | `"month"`. Default: `"day"`.
- **Behavior**: Returns a continuous series with zero-filled buckets for any interval containing zero events.
- **Response `200 OK`**:
```json
{
  "success": true,
  "data": {
    "period": {
      "start": "2026-11-01",
      "end": "2026-11-03",
      "timezone": "UTC"
    },
    "granularity": "day",
    "total_buckets": 3,
    "buckets": [
      { "period_start": "2026-11-01", "created_count": 5, "resolved_count": 2 },
      { "period_start": "2026-11-02", "created_count": 0, "resolved_count": 3 },
      { "period_start": "2026-11-03", "created_count": 8, "resolved_count": 4 }
    ]
  }
}
```

### 3.3 Category Distribution
- **Path**: `GET /api/admin/analytics/categories`
- **Query Parameters**:
  - `start` (string, optional): ISO date `YYYY-MM-DD` (UTC).
  - `end` (string, optional): ISO date `YYYY-MM-DD` (UTC).
- **Behavior**: Computes counts and percentages across all 7 canonical categories (`pothole`, `garbage`, `water_leakage`, `streetlight`, `drainage`, `damaged_infrastructure`, `other`). Missing categories return count 0 and percentage 0.
- **Response `200 OK`**:
```json
{
  "success": true,
  "data": {
    "period": {
      "start": "2026-10-23",
      "end": "2026-11-21",
      "timezone": "UTC"
    },
    "total_created_in_period": 142,
    "categories": [
      { "category": "pothole", "count": 52, "percentage": 36.62 },
      { "category": "garbage", "count": 38, "percentage": 26.76 },
      { "category": "water_leakage", "count": 21, "percentage": 14.79 },
      { "category": "streetlight", "count": 14, "percentage": 9.86 },
      { "category": "drainage", "count": 10, "percentage": 7.04 },
      { "category": "damaged_infrastructure", "count": 5, "percentage": 3.52 },
      { "category": "other", "count": 2, "percentage": 1.41 }
    ]
  }
}
```

### 3.4 Department Workload
- **Path**: `GET /api/admin/analytics/departments`
- **Query Parameters**: None.
- **Behavior**: Evaluates current active complaint backlog (`pending` + `in_progress`) across all registered municipal departments and includes unassigned active complaints.
- **Response `200 OK`**:
```json
{
  "success": true,
  "data": {
    "workload_basis": "current_assignment",
    "total_active_backlog": 90,
    "unassigned_active_count": 12,
    "departments": [
      {
        "department_id": "d1111111-1111-4111-8111-111111111111",
        "department_name": "Road Maintenance",
        "pending_count": 18,
        "in_progress_count": 24,
        "active_count": 42
      },
      {
        "department_id": "d2222222-2222-4222-8222-222222222222",
        "department_name": "Sanitation",
        "pending_count": 10,
        "in_progress_count": 26,
        "active_count": 36
      }
    ]
  }
}
```

### 3.5 Resolution Performance
- **Path**: `GET /api/admin/analytics/performance`
- **Query Parameters**:
  - `start` (string, optional): ISO date `YYYY-MM-DD` (UTC).
  - `end` (string, optional): ISO date `YYYY-MM-DD` (UTC).
- **Behavior**: Analyzes resolution throughput, arithmetic mean duration, exact median duration via PostgreSQL `percentile_cont(0.5)`, total active backlog, and aging backlog (> 7 days).
- **Response `200 OK`**:
```json
{
  "success": true,
  "data": {
    "period": {
      "start": "2026-10-23",
      "end": "2026-11-21",
      "timezone": "UTC"
    },
    "resolved_in_period": 98,
    "resolution_duration_sample_size": 98,
    "average_resolution_hours": 34.5,
    "median_resolution_hours": 26.0,
    "current_active_backlog": 90,
    "active_reports_older_than_7_days": 14
  }
}
```

### 3.6 Operational Priorities
- **Path**: `GET /api/admin/analytics/priorities`
- **Query Parameters**:
  - `limit` (integer, optional): Min 1, Max 20, Default 5.
- **Behavior**: Returns the highest-priority unresolved complaints for targeted municipal dispatch, along with active backlog score metrics.
- **Response `200 OK`**:
```json
{
  "success": true,
  "data": {
    "active_count": 90,
    "average_active_priority": 58.4,
    "max_active_priority": 96.0,
    "top_priority_reports": [
      {
        "id": "r1111111-1111-4111-8111-111111111111",
        "title": "Severe Main Road Cavity",
        "category": "damaged_infrastructure",
        "status": "pending",
        "priority_score": 96.0,
        "created_at": "2026-11-20T08:15:00.000Z",
        "department_name": "Road Maintenance"
      }
    ]
  }
}
```
