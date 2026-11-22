# CivicPulse API Contract · Phase 14 Intelligent Priority Scoring Engine

> **Document Version**: 1.0.0  
> **Status**: Verified & Production Ready  
> **Target Audience**: Frontend Engineers, Backend Architects, Integration Testers  
> **Applicable Branch**: `backend`

---

## 1. Executive Summary & Purpose

The CivicPulse Priority Scoring Engine provides an **explainable, deterministic, tamper-proof 0–100 triage score** to rank civic complaints in work queues, feeds, and maps. Instead of a naive chronological list, the engine evaluates three core operational signals:

1. **Authoritative Severity**: Initial or admin-verified issue severity (`low: 15`, `medium: 30`, `high: 50`, `critical: 70`).
2. **Community Support**: Verified citizen upvotes (`3 points/vote`, capped at `20 points`).
3. **Elapsed Unresolved Duration**: Full 24-hour periods since creation (`2 points/day`, capped at `10 points`).

The priority score is an operational triage aid to help dispatchers and citizens see urgent, aging, or heavily supported issues rise to the top. It does **not** constitute an emergency certification or replace human administrative judgment.

---

## 2. The Official CivicPulse Priority Formula

```
priority_score = min(
  100,
  severityPoints + min(3 * voteCount, 20) + min(2 * daysPending, 10)
)
```

### Component Breakdown

| Signal | Source of Truth | Scaling Rule | Min Points | Max Points |
|---|---|---|---|---|
| **Severity Points** | `reports.severity` (canonical) | `low: 15`, `medium: 30`, `high: 50`, `critical: 70` | 15 | 70 |
| **Community Support** | `report_votes` (distinct valid votes) | `3 * voteCount` | 0 | 20 |
| **Unresolved Duration** | `reports.created_at` (UTC elapsed days) | `2 * daysPending` | 0 | 10 |
| **Total Score** | Database & Pure Utility | Clamped to `[0, 100]` | **0** | **100** |

---

## 3. Severity Point Allocations

Severity is derived strictly from trusted database state (`reports.severity`). Unvalidated client submissions or raw Gemini suggestions are never treated as authoritative.

| Canonical Severity | Points Awarded | Typical Civic Examples |
|---|---|---|
| `low` | 15 | Minor litter, cosmetic curbside wear, faded road markings |
| `medium` | 30 (Default) | Standard potholes, intermittent streetlight outage, minor water seepage |
| `high` | 50 | Deep axle-damaging potholes, dark intersection lights, broken mains |
| `critical` | 70 | Open manholes, electrical wire hazard, major road collapse, raw sewage |

---

## 4. Community Support Contribution

- **Multiplier**: 3 points per valid distinct citizen upvote.
- **Cap**: Maximum 20 points (reached at 7 distinct upvotes).
- **Diminishing Returns Safeguard**: Even if a viral complaint receives 1,000 upvotes, its community support contribution is capped strictly at 20 points, preventing mob-rule gaming from overriding genuine safety concerns.
- **Vote Uniqueness**: Governed by the Phase 13 `UNIQUE(report_id, user_id)` constraint. Duplicate upvote clicks by the same user do not inflate the score.

---

## 5. Complaint Age & Days Unresolved Policy

- **Active Complaints (`pending`, `in_progress`)**:
  - `daysPending = floor(max(0, asOf - created_at) / 86400)`
  - Evaluated in completed 24-hour periods (UTC).
  - Multiplier: 2 points per completed day.
  - Cap: Maximum 10 points (reached at 5 completed days).
- **Resolved Complaints (`resolved`)**:
  - Age accumulation **stops** at `resolved_at`.
  - `daysPending = floor(max(0, resolved_at - created_at) / 86400)`
  - Resolved complaints preserve their final score snapshot and do not continue gaining urgency points after work is complete.

---

## 6. Initial Priority Score at Creation

When a new complaint is filed:
- `voteCount = 0` (0 vote points)
- `daysPending = 0` (0 age points)
- `priority_score = severityPoints` (e.g. `medium` -> `30`, `high` -> `50`, `critical` -> `70`, `low` -> `15`).

---

## 7. Priority Endpoint: GET /api/reports/:id/priority

### Request
- **Method**: `GET`
- **Path**: `/api/reports/:id/priority`
- **Authentication**: Public / Contextual (Optional session).
- **Headers**: Standard browser fetch or `credentials: "include"`.

### Access Rules
- **Public Complaints**: Accessible to any visitor or citizen.
- **Private / Unlisted Complaints**: Accessible only to the complaint owner or an administrator. Other callers receive HTTP 404 `NOT_FOUND` to prevent existence probing.

### Response (`200 OK`)
```json
{
  "success": true,
  "data": {
    "report_id": "55555555-5555-4555-8555-555555555555",
    "priority_score": 68,
    "priority_breakdown": {
      "severity": "high",
      "severity_points": 50,
      "support_count": 4,
      "support_points": 12,
      "days_unresolved": 3,
      "age_points": 6,
      "priority_score": 68,
      "max_score": 100
    },
    "calculated_at": "2026-11-21T18:30:00.000Z",
    "is_active": true
  },
  "message": "Priority breakdown retrieved successfully"
}
```

---

## 8. Priority Sorting in Feed & Admin Queue

When querying complaints via `GET /api/reports`:
- `sort=priority_high`: Highest priority score first.
- `sort=priority_low`: Lowest priority score first.

### Deterministic Tie-Breaking Order
1. `priority_score DESC` (or `ASC`)
2. `created_at ASC` (Older unresolved complaints take precedence on equal scores)
3. `id ASC` (Stable deterministic tie-breaker)

### Global Pagination Guarantee
Sorting is executed by the database **before** pagination limits and offsets are applied (`range(offset, offset + limit - 1)`). This guarantees that the globally highest-priority reports are returned on Page 1.

---

## 9. Frontend Integration & React Query Hook Example

```typescript
import { useQuery } from "@tanstack/react-query";
import type { ReportPriorityData } from "@/types/priority";

export function useReportPriority(reportId: string) {
  return useQuery<ReportPriorityData>({
    queryKey: ["reportPriority", reportId],
    queryFn: async () => {
      const res = await fetch(`/api/reports/${reportId}/priority`, {
        credentials: "include",
      });
      if (!res.ok) {
        throw new Error("Failed to load priority breakdown");
      }
      const json = await res.json();
      return json.data;
    },
    staleTime: 60 * 1000, // 1 minute
  });
}
```

### Advisory UI Label Helper
```typescript
import { getPriorityLabel } from "@/config/priority";

// Helper returning: "low" (0-29) | "moderate" (30-49) | "high" (50-69) | "critical" (70-100)
const label = getPriorityLabel(priorityData.priority_score);
```

---

## 10. Security & Anti-Tampering Defenses

1. **Client Score Mutation Prohibited**: The backend rejects client-injected `priority_score`, `severity_points`, `vote_count`, or `age_points` with HTTP 422 `VALIDATION_ERROR`.
2. **Voter Privacy**: The priority breakdown exposes aggregate scalar counts (`support_count: 4`), never individual voter UUIDs, names, or emails.
3. **Database Grants**: Only internal triggers and service functions are permitted to update `reports.priority_score`. Direct updates by `anon` or `authenticated` roles are denied by PostgreSQL column privileges.
