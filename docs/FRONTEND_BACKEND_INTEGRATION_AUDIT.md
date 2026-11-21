# CivicPulse – Frontend-Backend Integration Audit (Phase 21)

**Document Version:** 1.0.0  
**Audit Date:** 2026-11-22  
**Auditor:** Principal Full-Stack Integration Architect  
**Backend Revision:** `4405909` (Branch: `backend`)  
**Frontend Revision Inspected:** `fb3cc8c165e0c10ce233f09b55773148ffcd45b1` (Remote Branch: `origin/frontend`)  

---

## 1. Executive Summary & Audit Context

CivicPulse is designed as a unified, full-stack Next.js App Router application where frontend components communicate with backend route handlers using same-origin relative URLs (`/api/...`) and secure HTTP-only cookies.

A read-only inspection of the remote `origin/frontend` branch revealed that the teammate's branch is currently at the baseline project specifications commit (`fb3cc8c`). Active UI components (shadcn/ui forms, Leaflet map views, and admin charts) have not yet been pushed to GitHub. Therefore:
- **Backend API Readiness for Frontend Integration:** **100% READY & VERIFIED (480 automated tests passing)**.
- **Live In-Browser End-to-End UI Integration:** **BLOCKED** (Awaiting teammate's frontend UI commit and pull request).
- This document serves as the authoritative, definitive integration specification for the frontend developer.

---

## 2. API Base URL Policy & Client Communication Standards

- **Relative Same-Origin Routing:** All frontend API calls must use relative URLs (e.g. `fetch('/api/reports')`). Hardcoding `http://localhost:3000` or deployment URLs in client components is strictly forbidden.
- **Credentials & Session Transmission:** `fetch` calls must omit manual `Authorization` headers for browser requests; session cookies are managed automatically via `@supabase/ssr` with `credentials: 'same-origin'` (default).
- **Standardized Response Envelope:** Every backend API response conforms to:
  ```ts
  // Success (HTTP 200 / 201)
  interface ApiResponseSuccess<T> {
    success: true;
    data: T;
    message?: string;
  }

  // Error (HTTP 4xx / 5xx)
  interface ApiResponseError {
    success: false;
    error: {
      code: string;
      message: string;
      details?: unknown;
    };
  }
  ```

---

## 3. Feature-by-Feature Integration Specifications

### 3.1 Authentication & Session
- **Endpoint:** `GET /api/auth/me`
- **Frontend Caller:** Layout Header, Auth Context Provider
- **Expected Behavior:** Returns `HTTP 200` with `{ user: { id, email, role: "citizen" | "admin" } }` if logged in, or `HTTP 401` if unauthenticated.

### 3.2 Complaint Creation & Multimodal Upload Workflow
1. **Photo Upload:**
   - **Endpoint:** `POST /api/upload` (`multipart/form-data`)
   - **Form Fields:** `file` (File, <= 3MB, JPEG/PNG/WebP), `purpose: "complaint_before"`
   - **Response:** `{ image: { bucket: "civic-evidence", storage_path: "drafts/<user_id>/<uuid>.<ext>" } }`
2. **AI Suggestion (Optional):**
   - **Endpoint:** `POST /api/ai/classify` (`application/json`)
   - **Body:** `{ image_path: "drafts/<user_id>/<uuid>.<ext>" }`
   - **Response:** `{ suggested_category, suggested_severity, suggested_title, suggested_description }`
   - **Fallback:** If AI fails or returns empty, the UI displays manual category dropdowns without blocking the user.
3. **Duplicate Proximity Check (Pre-submission):**
   - **Endpoint:** `POST /api/reports/check-duplicates` (`application/json`)
   - **Body:** `{ latitude: number, longitude: number, category: string }`
   - **Response:** `{ duplicates: DuplicateCandidate[], has_duplicates: boolean }`
   - **Behavior:** Displays modal warning if duplicates exist within 100 meters.
4. **Complaint Submission:**
   - **Endpoint:** `POST /api/reports` (`application/json`)
   - **Body:** `{ title, description, category, latitude, longitude, image_path, severity? }`
   - **Response:** `HTTP 201 Created` with `{ report: ReportRecord }`. Automatically resolves department and sets initial status to `"submitted"`.

### 3.3 Interactive Leaflet Map Integration
- **Endpoint:** `GET /api/reports/map`
- **Query Parameters:** `min_lat`, `max_lat`, `min_lon`, `max_lon`, `category?`, `status?`
- **Frontend Caller:** React Leaflet `useMapEvents({ moveend: ... })`
- **Expected Data:**
  ```json
  {
    "success": true,
    "data": {
      "markers": [
        {
          "id": "uuid",
          "latitude": 22.5726,
          "longitude": 88.3639,
          "category": "pothole",
          "status": "pending",
          "priority_score": 62
        }
      ],
      "count": 1
    }
  }
  ```
- **Constraint:** Maximum 500 markers returned per query.

### 3.4 Community Support & Priority Updates
- **Endpoint:** `POST /api/reports/:id/upvote`
- **Frontend Caller:** Upvote / Support Button
- **Response:** `{ support_count: number, has_supported: true }`
- **Error Handling:** If the citizen upvotes their own complaint, backend returns `HTTP 400` / `403` with code `"SELF_VOTING_FORBIDDEN"`. UI should disable upvoting on own complaints.

### 3.5 Administrative Triage & Resolution Workflow
1. **Department Assignment:** `POST /api/admin/assign` with `{ report_id, department_id, override_reason }`.
2. **Status Transition:** `PATCH /api/reports/:id/status` with `{ status: "in_progress" | "resolved", notes? }`.
3. **Resolution Evidence:** When transitioning to `"resolved"`, admin MUST upload after-repair photo via `POST /api/admin/reports/:id/resolution-evidence` and provide `after_image_path`.
4. **Public Evidence View:** `GET /api/reports/:id/evidence` returns both before and after images with short-lived signed URLs for display in the resolution comparison slider.

### 3.6 Executive Analytics Dashboard
- **Endpoints:**
  - `GET /api/admin/analytics/overview` (KPI cards)
  - `GET /api/admin/analytics/trends` (Time-series chart)
  - `GET /api/admin/analytics/categories` (Category distribution donut chart)
  - `GET /api/admin/analytics/departments` (Department workload bar chart)
  - `GET /api/admin/analytics/performance` (Resolution hours mean & median)
  - `GET /api/admin/analytics/priorities` (High priority backlog table)
- **Role Enforcement:** All analytics endpoints require `role === "admin"`. Citizens receive `HTTP 403 FORBIDDEN`.

---

## 4. Frontend Action Items & Integration Checklist

When the frontend developer integrates UI components into the shared branch:
1. [ ] Ensure all API requests use relative paths starting with `/api/`.
2. [ ] Validate that file upload components send `multipart/form-data` with key `file`.
3. [ ] Wrap Leaflet map in client component (`"use client"`) with dynamic import (`ssr: false`).
4. [ ] Handle empty analytics arrays and zero counts gracefully without dividing by zero.
5. [ ] Create PR from `frontend` branch into `main` for final full-stack integration.
