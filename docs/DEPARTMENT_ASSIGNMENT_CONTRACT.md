# CivicPulse Department Directory & Assignment Contract (Phase 09)

This document provides the definitive integration contract for frontend and backend engineers implementing the department directory, administrative manual complaint assignment, reassignment, audit tracking, and optimistic concurrency control in CivicPulse.

---

## 1. Municipal Context & Department Directory

> [!NOTE]
> CivicPulse currently operates as a simulated municipal and campus civic infrastructure platform. Department records represent internal operational units responsible for task resolution, not a live automated gateway to government agency backends.

### 1.1 Supported Operational Departments

The platform seeds and manages six core municipal departments:

| Department Name | Typical Complaint Categories Handled | Description |
|---|---|---|
| **Road Maintenance** | `pothole`, road surfaces, sidewalk cracks | Campus paths and road surfaces |
| **Sanitation** | `garbage`, illegal dumping, overflowing bins | Waste collection and cleanup |
| **Water Supply** | `water_leakage`, pipe bursts, main line leaks | Water lines and leaks |
| **Electrical** | `streetlight`, exposed wiring, dark walkways | Lighting and electrical fixtures |
| **Drainage** | `drainage`, clogged storm drains, monsoon pooling | Drains and blockages |
| **Public Works** | `damaged_infrastructure`, broken benches, barriers | Shared infrastructure maintenance |

*Note: The category-to-department relationship is a recommended operational guideline, not an enforced rule. Administrators may assign any department to any complaint according to human judgment. Automatic classification and routing belong to Phase 15.*

---

## 2. API Endpoints

### 2.1 Department Directory: `GET /api/departments`

Retrieves the directory of active municipal departments for frontend selection controls (assignment dropdowns, filters, and display labels).

- **URL**: `/api/departments`
- **Method**: `GET`
- **Authentication**: Optional / Public (accessible anonymously or with session).
- **Sorting**: Alphabetical by `name` ascending (`name ASC`).

#### Success Response (HTTP 200)
```json
{
  "success": true,
  "data": {
    "departments": [
      {
        "id": "55555555-5555-5555-8555-555555555555",
        "name": "Drainage",
        "description": "Drains and blockages"
      },
      {
        "id": "66666666-6666-6666-8666-666666666666",
        "name": "Electrical",
        "description": "Lighting and electrical fixtures"
      },
      {
        "id": "77777777-7777-4777-8777-777777777777",
        "name": "Public Works",
        "description": "Shared infrastructure maintenance"
      },
      {
        "id": "88888888-8888-4888-8888-888888888888",
        "name": "Road Maintenance",
        "description": "Campus paths and road surfaces"
      },
      {
        "id": "99999999-9999-4999-8999-999999999999",
        "name": "Sanitation",
        "description": "Waste collection and cleanup"
      },
      {
        "id": "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        "name": "Water Supply",
        "description": "Water lines and leaks"
      }
    ]
  },
  "message": "Departments retrieved successfully"
}
```

---

### 2.2 Assign or Reassign Complaint: `POST /api/admin/assign`

Privileged endpoint to assign or reassign a civic complaint to an operational department.

- **URL**: `/api/admin/assign`
- **Method**: `POST`
- **Authentication**: Required (`requireAdmin()`). Throws HTTP 401 if unauthenticated, HTTP 403 if citizen.
- **Headers**:
  - `Content-Type: application/json`
  - Cookie: Supabase session cookies (`credentials: "include"`)

#### Request Body Schema (Strict)

```typescript
{
  report_id: string;                 // Required UUID v4 of the target complaint
  department_id: string;             // Required UUID v4 of the destination department
  expected_department_id?: string | null; // Optional: UUID of previously observed department (or null if unassigned)
  reason?: string;                   // Optional plain-text remarks, trimmed, max 1000 chars
}
```

> [!CAUTION]
> Forbidden Fields: Supplying client-controlled actor parameters (`assigned_by`, `user_id`, `role`, `status`, `priority_score`, `resolved_at`) is strictly rejected with `HTTP 422 VALIDATION_ERROR`.

#### Initial Assignment Request Example (Unassigned -> Road Maintenance)
```json
{
  "report_id": "44444444-4444-4444-8444-444444444444",
  "department_id": "88888888-8888-4888-8888-888888888888",
  "expected_department_id": null,
  "reason": "Road maintenance team dispatched for crater triage."
}
```

#### Reassignment Request Example (Road Maintenance -> Sanitation)
```json
{
  "report_id": "44444444-4444-4444-8444-444444444444",
  "department_id": "99999999-9999-4999-8999-999999999999",
  "expected_department_id": "88888888-8888-4888-8888-888888888888",
  "reason": "Initial road team found debris accumulation, transferring to sanitation."
}
```

#### Success Response (HTTP 200)
```json
{
  "success": true,
  "data": {
    "report_id": "44444444-4444-4444-8444-444444444444",
    "previous_department_id": null,
    "department": {
      "id": "88888888-8888-4888-8888-888888888888",
      "name": "Road Maintenance"
    },
    "assigned_by": "33333333-3333-4333-8333-333333333333",
    "assigned_at": "2026-11-21T14:30:00.000Z",
    "assignment_history_id": "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"
  },
  "message": "Department assigned successfully"
}
```

---

## 3. Business Rules, Constraints & Concurrency

### 3.1 Status & Lifecycle Separation
- **Status Preservation**: Assignment does **not** change complaint status (`pending` remains `pending`; `in_progress` remains `in_progress`).
- **Priority Preservation**: Assignment does **not** recalculate or modify `priority_score`.
- **Owner Preservation**: Assignment does **not** alter complaint creator `user_id`.
- **Resolved Complaints Locked**: Reassigning a complaint in `status = 'resolved'` is strictly rejected with `HTTP 409 CONFLICT` ("Cannot reassign a resolved complaint").

### 3.2 Concurrency Protection (`expected_department_id`)
To prevent silent lost updates when multiple administrators triage complaints simultaneously:
- **`expected_department_id: null`**: Asserts that the complaint is currently unassigned. If another admin assigned a department in the interim, the call fails with HTTP 409.
- **`expected_department_id: "UUID"`**: Asserts that the complaint is currently assigned to that specific department. If another admin reassigned it, the call fails with HTTP 409.
- **`expected_department_id: undefined`** (omitted): Reassignment is unconditional.

### 3.3 Duplicate Protection (No-Op Prevention)
Submitting an assignment for the department that is already active (`current_department_id === department_id`) is rejected with `HTTP 409 CONFLICT` ("Report is already assigned to this department") without creating duplicate audit history rows.

---

## 4. Frontend Integration Examples (React Query)

### 4.1 Department Directory Query Hook
```typescript
import { useQuery } from "@tanstack/react-query";

interface Department {
  id: string;
  name: string;
  description: string | null;
}

export function useDepartments() {
  return useQuery<Department[]>({
    queryKey: ["departments"],
    queryFn: async () => {
      const response = await fetch("/api/departments");
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error?.message || "Failed to load departments");
      }
      return result.data.departments;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
```

### 4.2 Complaint Assignment Mutation Hook (Admin UI)
```typescript
import { useMutation, useQueryClient } from "@tanstack/react-query";

interface AssignPayload {
  reportId: string;
  departmentId: string;
  expectedDepartmentId?: string | null;
  reason?: string;
}

export function useAssignComplaint() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ reportId, departmentId, expectedDepartmentId, reason }: AssignPayload) => {
      const response = await fetch("/api/admin/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          report_id: reportId,
          department_id: departmentId,
          expected_department_id: expectedDepartmentId,
          reason,
        }),
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error?.message || "Failed to assign complaint");
      }
      return result.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["report", variables.reportId] });
      queryClient.invalidateQueries({ queryKey: ["reports"] });
    },
  });
}
```
