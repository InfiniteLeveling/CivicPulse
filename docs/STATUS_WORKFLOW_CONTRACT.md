# CivicPulse Status Management & Timeline Tracking Contract (Phase 08)

This document provides the definitive integration contract for frontend and backend engineers implementing status transitions and chronological tracking for civic complaints in CivicPulse.

---

## 1. Canonical Complaint Lifecycle & State Machine

Civic complaints move through an authorized, linear state machine:

```
[ pending ] ──(Admin Triage)──> [ in_progress ] ──(Admin Resolution)──> [ resolved ]
```

### 1.1 Canonical Status Values

| Stored Enum | Meaning | Frontend Label | Badge Color |
|---|---|---|---|
| `pending` | Complaint submitted and awaiting official triage/action | Pending | Amber (`bg-amber-100 text-amber-800`) |
| `in_progress` | Field teams or municipal department actively addressing issue | In Progress | Blue (`bg-blue-100 text-blue-800`) |
| `resolved` | Official maintenance completed; recorded by administrator | Resolved | Green (`bg-emerald-100 text-emerald-800`) |

### 1.2 Transition Matrix

| Current State | Target State | Policy | Response |
|---|---|---|---|
| `pending` | `in_progress` | **Allowed** | HTTP 200, updates status, records audit event |
| `in_progress` | `resolved` | **Allowed** | HTTP 200, sets `resolved_at`, records audit event |
| `pending` | `resolved` | **Denied** | HTTP 409 `CONFLICT` ("Cannot transition complaint status from pending to resolved") |
| `in_progress` | `pending` | **Denied** | HTTP 409 `CONFLICT` ("Cannot transition complaint status from in_progress to pending") |
| `resolved` | `in_progress` | **Denied** | HTTP 409 `CONFLICT` ("Cannot transition complaint status from resolved to in_progress") |
| `resolved` | `pending` | **Denied** | HTTP 409 `CONFLICT` ("Cannot transition complaint status from resolved to pending") |
| `[state]` | `[same state]` | **Denied** | HTTP 409 `CONFLICT` ("Report is already in status '[state]'") |
| Any | Unknown enum | **Denied** | HTTP 400 `BAD_REQUEST` (Zod enum rejection) |

> [!IMPORTANT]
> Reopening complaints and after-repair citizen verification are future-phase capabilities (Phase 17). In MVP Phase 08, transitions are strictly forward-progressing.

---

## 2. API Endpoints

### 2.1 Update Complaint Status: `PATCH /api/reports/:id/status`

Privileged endpoint to update complaint status. Requires verified administrator credentials.

- **URL**: `/api/reports/:id/status`
- **Method**: `PATCH`
- **Authentication**: Required (`requireAdmin()`). Throws HTTP 401 if unauthenticated, HTTP 403 if citizen.
- **Headers**:
  - `Content-Type: application/json`
  - Cookie: Supabase session cookies (`credentials: "include"`)

#### Request Body Schema (Strict)

```typescript
{
  status: "in_progress" | "resolved"; // Required
  notes?: string;                     // Optional, trimmed, max 1000 characters
  expected_status?: "pending" | "in_progress" | "resolved"; // Optional optimistic lock guard
  after_image_path?: string;          // Mandatory when status === "resolved" (Phase 17)
}
```

> [!IMPORTANT]
> **Phase 17 Proof-Aware Resolution Policy**: Transitioning a complaint to `resolved` strictly requires an administrator-submitted after-repair photograph (`after_image_path`). The path must point to an eligible draft staged via `POST /api/admin/reports/:id/resolution-evidence`. Bypassing this requirement returns HTTP 422 `VALIDATION_ERROR` (`RESOLUTION_EVIDENCE_REQUIRED`). Direct SQL updates without an associated `after` image in `public.report_images` are blocked by database trigger `reports_resolution_evidence_check`.
}
```

> [!CAUTION]
> Forbidden Fields: Supplying client-controlled actor parameters (`changed_by`, `user_id`, `role`, `resolved_at`, `priority_score`, `department_id`) is strictly rejected with `HTTP 400 BAD_REQUEST`.

#### Request Example (Admin updates to in_progress)
```json
{
  "status": "in_progress",
  "notes": "Inspection dispatched to Park Street site.",
  "expected_status": "pending"
}
```

#### Success Response (HTTP 200)
```json
{
  "success": true,
  "data": {
    "id": "77777777-7777-4777-8777-777777777777",
    "previous_status": "pending",
    "status": "in_progress",
    "updated_at": "2026-11-21T13:45:00.000Z",
    "resolved_at": null,
    "history_entry_id": "88888888-8888-4888-8888-888888888888",
    "version": 2
  },
  "message": "Complaint status updated successfully"
}
```

#### Success Response (Admin resolves complaint)
```json
{
  "success": true,
  "data": {
    "id": "77777777-7777-4777-8777-777777777777",
    "previous_status": "in_progress",
    "status": "resolved",
    "updated_at": "2026-11-21T15:30:00.000Z",
    "resolved_at": "2026-11-21T15:30:00.000Z",
    "history_entry_id": "99999999-9999-4999-8999-999999999999",
    "version": 3
  },
  "message": "Complaint status updated successfully"
}
```

---

### 2.2 Retrieve Complaint Timeline: `GET /api/reports/:id/history`

Retrieves the chronological audit timeline for a complaint.

- **URL**: `/api/reports/:id/history`
- **Method**: `GET`
- **Authentication**: Optional for public listed reports; required for private reports.
- **Access Control & Privacy Projection**:
  - **Public Visitors & Citizens**: Receive status progression, versions, and timestamps. Sensitive operational `notes` and actor `changed_by` UUIDs are strictly omitted.
  - **Complaint Owner**: Permitted to view timeline of their own private reports (notes omitted).
  - **Administrators**: Receive complete timeline including operational remarks and actor UUIDs.
  - **Unauthorized**: Unauthorized requests to private complaints receive `HTTP 404 NOT_FOUND` (concealing record existence).

#### Success Response (Citizen / Public Viewer)
```json
{
  "success": true,
  "data": {
    "report_id": "77777777-7777-4777-8777-777777777777",
    "current_status": "in_progress",
    "history": [
      {
        "id": "11111111-1111-4111-8111-111111111111",
        "report_id": "77777777-7777-4777-8777-777777777777",
        "version": 1,
        "previous_status": null,
        "status": "pending",
        "changed_at": "2026-11-21T12:00:00.000Z"
      },
      {
        "id": "22222222-2222-4222-8222-222222222222",
        "report_id": "77777777-7777-4777-8777-777777777777",
        "version": 2,
        "previous_status": "pending",
        "status": "in_progress",
        "changed_at": "2026-11-21T13:45:00.000Z"
      }
    ]
  },
  "message": "Status history retrieved successfully"
}
```

#### Success Response (Administrator)
```json
{
  "success": true,
  "data": {
    "report_id": "77777777-7777-4777-8777-777777777777",
    "current_status": "in_progress",
    "history": [
      {
        "id": "11111111-1111-4111-8111-111111111111",
        "report_id": "77777777-7777-4777-8777-777777777777",
        "version": 1,
        "previous_status": null,
        "status": "pending",
        "changed_at": "2026-11-21T12:00:00.000Z",
        "changed_by": "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"
      },
      {
        "id": "22222222-2222-4222-8222-222222222222",
        "report_id": "77777777-7777-4777-8777-777777777777",
        "version": 2,
        "previous_status": "pending",
        "status": "in_progress",
        "changed_at": "2026-11-21T13:45:00.000Z",
        "changed_by": "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        "notes": "Inspection dispatched to Park Street site."
      }
    ]
  },
  "message": "Status history retrieved successfully"
}
```

---

## 3. Concurrency Protection & Conflict Handling

### 3.1 Optimistic Concurrency with `expected_status`
When two administrators view the same complaint simultaneously:
1. Admin A submits: `status = "in_progress", expected_status = "pending"`.
   - Update succeeds, transitioning complaint to `in_progress`.
2. Admin B submits: `status = "in_progress", expected_status = "pending"`.
   - PostgreSQL locks the row via `FOR UPDATE`.
   - The backend checks `target_report.status` (now `in_progress`) against `expected_status` (`pending`).
   - Mismatch triggers `HTTP 409 CONFLICT`:
     ```json
     {
       "success": false,
       "error": {
         "code": "CONFLICT",
         "message": "Complaint status changed. Expected pending but current status is in_progress"
       }
     }
     ```

### 3.2 Frontend UI Handling of HTTP 409
When receiving `HTTP 409 CONFLICT`:
1. Show an inline toast/banner: *"The complaint status was updated by another administrator."*
2. Automatically invalidate and refetch the complaint details query (`queryClient.invalidateQueries({ queryKey: ["report", id] })`).
3. Re-render the action buttons to reflect the latest valid next transitions.
4. **Never blindly retry a mutation against stale state.**

---

## 4. Frontend Integration Examples (React Query)

### 4.1 Update Status Mutation Hook (Admin UI)
```typescript
import { useMutation, useQueryClient } from "@tanstack/react-query";

interface UpdateStatusPayload {
  reportId: string;
  status: "in_progress" | "resolved";
  notes?: string;
  expectedStatus?: "pending" | "in_progress" | "resolved";
}

export function useUpdateComplaintStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ reportId, status, notes, expectedStatus }: UpdateStatusPayload) => {
      const response = await fetch(`/api/reports/${reportId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          status,
          notes,
          expected_status: expectedStatus,
        }),
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error?.message || "Failed to update complaint status");
      }

      return result.data;
    },
    onSuccess: (_, variables) => {
      // Invalidate report details, status history, and administrative lists
      queryClient.invalidateQueries({ queryKey: ["report", variables.reportId] });
      queryClient.invalidateQueries({ queryKey: ["report-history", variables.reportId] });
      queryClient.invalidateQueries({ queryKey: ["reports"] });
    },
  });
}
```

### 4.2 Timeline Tracking Query Hook (Citizen & Admin UI)
```typescript
import { useQuery } from "@tanstack/react-query";

export function useComplaintTimeline(reportId: string) {
  return useQuery({
    queryKey: ["report-history", reportId],
    queryFn: async () => {
      const response = await fetch(`/api/reports/${reportId}/history`, {
        method: "GET",
        credentials: "include",
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error?.message || "Failed to retrieve status timeline");
      }

      return result.data;
    },
    staleTime: 30_000, // 30 seconds
  });
}
```
