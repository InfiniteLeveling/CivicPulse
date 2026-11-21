# CivicPulse – Authenticated Community Support & Secure Upvoting Contract

**Document Version:** 1.0.0  
**Phase:** 13 – Community Support & Upvoting  
**Status:** Verified Implementation  
**Audience:** Frontend Engineers, Mobile Developers, API Consumers, Quality Assurance Engineers

---

## 1. Overview & Feature Purpose

CivicPulse allows citizens to report public infrastructure issues (potholes, garbage, water leaks, broken streetlights, drainage blockages, damaged infrastructure). When multiple citizens observe the same unresolved civic issue, rather than submitting redundant reports, they can express **community support** for an existing report.

### Core Guarantees:
1. **One-User-One-Vote**: Enforced at the database level via a composite unique constraint `UNIQUE(report_id, user_id)`.
2. **Verified Identity**: Voter identity is derived strictly from the authenticated server-side session (`requireUser()`). Clients can never pass or spoof a `user_id`.
3. **Self-Voting Prohibited**: Report creators cannot upvote their own complaints (HTTP 403). Submitting the complaint already establishes the creator's support.
4. **Active Complaints Only**: Support is restricted to `pending` and `in_progress` complaints. `resolved` complaints are closed for voting (HTTP 409).
5. **Idempotent Network Retries**: A repeated click by the same citizen returns HTTP 200 with `already_supported: true` and the unchanged count, without duplicating database rows or throwing unexpected server errors.
6. **Strict Voter Privacy**: Public responses disclose aggregate support totals only. Voter UUIDs, emails, profiles, and timestamps are never exposed.

---

## 2. API Endpoints

### 2.1 Upvote Complaint: `POST /api/reports/:id/upvote`

- **URL:** `/api/reports/:id/upvote`
- **Method:** `POST`
- **Authentication:** **Required** (Citizen account session via SSR cookies).
- **URL Parameters:** `id` (string, required): Valid UUID v4 of the target complaint.
- **Request Body:** Optional / Empty (`{}`). Any client-injected fields (`user_id`, `vote_count`, `role`, `status`, `priority_score`) are strictly rejected with HTTP 422.
- **Cache Policy:** `Cache-Control: no-store`

#### Response: First Successful Support (HTTP 201 Created)
```json
{
  "success": true,
  "data": {
    "report_id": "a1b2c3d4-e5f6-47a8-b9c0-123456789abc",
    "supported": true,
    "already_supported": false,
    "support_count": 12
  },
  "message": "Complaint supported successfully"
}
```

#### Response: Repeated Support by Same User (HTTP 200 OK)
```json
{
  "success": true,
  "data": {
    "report_id": "a1b2c3d4-e5f6-47a8-b9c0-123456789abc",
    "supported": true,
    "already_supported": true,
    "support_count": 12
  },
  "message": "You have already supported this complaint"
}
```

---

### 2.2 Support Summary: `GET /api/reports/:id/support`

- **URL:** `/api/reports/:id/support`
- **Method:** `GET`
- **Authentication:** **Optional**. Contextual:
  - **Authenticated Citizen:** Returns total `support_count`, personal `current_user_supported` boolean, and advisory `can_support` boolean.
  - **Anonymous Visitor:** Returns total `support_count` with `current_user_supported: false` and `can_support: false`.
- **URL Parameters:** `id` (string, required): Valid UUID v4.
- **Cache Policy:** `Cache-Control: no-store` (prevents cross-user cache contamination).

#### Response (HTTP 200 OK)
```json
{
  "success": true,
  "data": {
    "report_id": "a1b2c3d4-e5f6-47a8-b9c0-123456789abc",
    "support_count": 12,
    "current_user_supported": false,
    "can_support": true
  },
  "message": "Support information retrieved successfully"
}
```

---

## 3. Business Rules Matrix

| Scenario | HTTP Status | Error Code | Description / UI Guidance |
|---|---|---|---|
| Unauthenticated user clicks Support | `401 Unauthorized` | `UNAUTHORIZED` | Prompt user to log in before supporting. |
| Administrator attempts to upvote | `403 Forbidden` | `FORBIDDEN` | Administrative accounts are operational observers; citizen participation only. |
| Report creator attempts to support own report | `403 Forbidden` | `FORBIDDEN` | Report creators cannot upvote their own complaints. Submitting the complaint counts as initial reporting. |
| Inaccessible / private report of another user | `404 Not Found` | `NOT_FOUND` | Complaint not found (prevents leaking existence of hidden reports). |
| Complaint status is `resolved` | `409 Conflict` | `CONFLICT` | Resolved complaints are closed; cannot receive new community support. |
| First support from eligible citizen | `201 Created` | N/A | Vote recorded; `support_count` increments by 1; `already_supported: false`. |
| Repeat click from same citizen | `200 OK` | N/A | Idempotent; count unchanged; `already_supported: true`. |
| Malformed UUID in URL path | `422 Unprocessable Entity` | `VALIDATION_ERROR` | Invalid report ID format. |
| Client injects `user_id` or `vote_count` in body | `422 Unprocessable Entity` | `VALIDATION_ERROR` | Strict schema rejects authority overrides. |

---

## 4. `can_support` Advisory UX Flag

The `can_support` field returned in `GET /api/reports/:id/support` indicates whether the Support button should be interactive:

$$\text{can\_support} = (\text{authenticated}) \land (\text{role} = \text{citizen}) \land (\text{status} \in \{\text{pending}, \text{in\_progress}\}) \land (\text{caller} \neq \text{creator}) \land (\neg \text{current\_user\_supported})$$

### Frontend Button States:
1. **Anonymous**: Display `Support (12)` $\rightarrow$ Clicking opens Login modal.
2. **Creator of Complaint**: Display `12 Supporters` $\rightarrow$ Button disabled with tooltip *"You submitted this complaint"*.
3. **Eligible Citizen**: Display active button `Support (12)` $\rightarrow$ Clicking triggers `POST /api/reports/:id/upvote`.
4. **Already Supported**: Display button in active/pressed state `Supported (12)` $\rightarrow$ Clicking confirms already supported without count change.
5. **Resolved Complaint**: Display `12 Supporters` $\rightarrow$ Button disabled with badge *"Resolved issue"*.

---

## 5. Frontend Integration Workflow

```mermaid
flowchart TD
    A["1. Citizen views report card or detail"] --> B["2. Query GET /api/reports/:id/support"]
    B --> C{"Check can_support"}
    C -->|true| D["3. Show active 'Support' button"]
    C -->|false (already supported)| E["Show 'Supported' state"]
    C -->|false (creator or resolved)| F["Show support count with disabled button"]
    D --> G["4. Citizen clicks 'Support'"]
    G --> H["5. Call POST /api/reports/:id/upvote"]
    H --> I{"Response Status"}
    I -->|201 Created| J["6. Update UI: 'Supported' and count + 1"]
    I -->|200 OK (repeat)| K["7. Update UI: 'Supported' (count unchanged)"]
    I -->|401 Unauthorized| L["8. Redirect to Login"]
    I -->|403 Forbidden| M["9. Show message: Cannot support own complaint"]
    I -->|409 Conflict| N["10. Show message: Report is resolved"]
```

---

## 6. Integration with Other Phases

### Phase 07 (Report Retrieval)
The public report detail item (`ReportDetailItem`) and list items (`PublicReportItem`) expose optional support fields (`support_count`, `current_user_supported`, `can_support`). Frontend feeds can render support badges directly.

### Phase 12 (Duplicate Detection)
When a citizen checks for duplicates before submitting a complaint (`POST /api/reports/check-duplicates`), the backend returns nearby matching reports with their real UUIDs (`matches[i].id`). The frontend duplicate notice card can present:
- **Action A:** `"View Existing Report"` $\rightarrow$ Navigates to `/reports/[id]` where the citizen can click Support.
- **Action B:** `"Support this complaint"` $\rightarrow$ Directly calls `POST /api/reports/:id/upvote`.

### Phase 14 (Priority Scoring Dependency)
Phase 14 will incorporate community support into the automated priority scoring algorithm:
$$\text{priority\_score} = \min(100, \text{severityPoints} + \min(3 \times \text{voteCount}, 20) + \min(2 \times \text{daysPending}, 10))$$
Phase 13 provides the authoritative, tamper-proof `voteCount` derived directly from distinct `report_votes` records. Phase 13 **does not modify `reports.priority_score`**.

---

## 7. TypeScript React Hook Example

```typescript
import { useState } from "react";
import type { SupportReportResponseData, ReportSupportSummary } from "@/types/support";

export function useReportSupport(reportId: string) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function upvote(): Promise<SupportReportResponseData | null> {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/reports/${reportId}/upvote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json?.error?.message || "Failed to support complaint");
      }

      return json.data;
    } catch (err: any) {
      setError(err.message || "An error occurred");
      return null;
    } finally {
      setLoading(false);
    }
  }

  async function fetchSummary(): Promise<ReportSupportSummary | null> {
    try {
      const res = await fetch(`/api/reports/${reportId}/support`);
      const json = await res.json();
      if (!res.ok || !json.success) return null;
      return json.data;
    } catch {
      return null;
    }
  }

  return { upvote, fetchSummary, loading, error };
}
```
