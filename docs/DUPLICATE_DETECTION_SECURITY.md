# CivicPulse – Duplicate Detection Security, RLS & Location Privacy Architecture

**Document Version:** 1.0.0  
**Phase:** 12 – Geographical Duplicate Complaint Detection  
**Classification:** Security Architecture & Threat Model

---

## 1. Security Overview

Civic infrastructure platforms operate in a sensitive domain where geographic coordinates and complaint details can inadvertently reveal private lifestyle patterns, home addresses, or security vulnerabilities.

Phase 12 implements strict defense-in-depth principles:
1. **Server-Enforced Boundaries**: The 100-meter search radius is strictly hardcoded on the server. Clients cannot expand this radius to perform bulk city-wide data harvesting.
2. **PostgreSQL RLS & `SECURITY INVOKER`**: Discovery queries strictly execute with the calling user's permissions. No `SECURITY DEFINER` privilege escalation is used.
3. **Defense-in-Depth Filtering**: Even if a raw database query returns extra records, the TypeScript service enforces ownership, publication, category, and status checks before computing distances.
4. **Zero State Mutation**: `POST /api/reports/check-duplicates` is strictly read-only. It cannot be used to modify reports, delete complaints, merge records, or cast unauthorized votes.

---

## 2. Row Level Security (RLS) & Function Security Model

### Why `SECURITY INVOKER` Was Chosen Over `SECURITY DEFINER`
A `SECURITY DEFINER` function runs with the privileges of its creator (`postgres` or `service_role`). In geographical search, this introduces critical security risks:
- Risk of exposing hidden/private complaints belonging to other citizens.
- Risk of circumventing department-level or tenant-level isolation.
- Risk of SQL parameter injection or execution privilege leaks.

Therefore, the database search function `find_nearby_reports` is implemented strictly as:
```sql
create or replace function public.find_nearby_reports(...)
returns table (...)
language plpgsql
security invoker
set search_path = public, pg_catalog
```

### Table-Level RLS Compatibility
When called, `SECURITY INVOKER` inherits the active PostgreSQL session:
1. **Authenticated Citizen**:
   - Matches policy `report_public_read` on `public.reports` (`publication = 'public' AND visibility = 'listed'`).
   - Matches policy `report_owner_read` (`user_id = auth.uid()`).
   - **Result**: The citizen can see public listed issues and their own private issues. They cannot see any private reports filed by others.
2. **Anonymous Visitor**:
   - Denied at the API gateway layer (`requireUser()` in route handler returns HTTP 401).

---

## 3. Location Privacy & Anti-Enumeration Protections

### Threat Vector: Geographic Grid Scraping (Enumeration Attack)
An adversary could automate thousands of requests spanning a city grid in 50-meter intervals to catalog all reports, identify high-volume complaint zones, or correlate private coordinates.

### Countermeasures Implemented:
1. **Mandatory Authentication**: Unauthenticated callers are rejected immediately with HTTP 401 (`UNAUTHORIZED`). Anonymous geographic sweeping is blocked.
2. **Strict Radius Clamping**: The server clamps the radius to `DUPLICATE_RADIUS_METERS = 100`. Injected fields such as `radius_meters: 50000` are rejected by Zod schema validation (`.strict()`).
3. **Capped Results**: Results are strictly limited to the top 5 nearest candidates.
4. **Data Projection Sanitization**:
   - **Included:** `id`, `title`, `category`, `status`, `distance_meters`, `created_at`.
   - **Excluded:** `user_id`, creator name, email, phone number, submission keys, internal notes, resolution evidence, and vote counts.
5. **No Private Count Leaks**: Empty results return `has_potential_duplicates: false` with an empty array. No total count of private reports in the vicinity is ever leaked.

---

## 4. Input Validation & Strict Schema Enforcement

Input coordinates are thoroughly sanitized through Zod:
```typescript
latitude: z.number().finite().min(-90).max(90)
longitude: z.number().finite().min(-180).max(180)
category: z.enum(REPORT_CATEGORIES)
```

### Injection Defenses:
- **Non-finite numbers**: `NaN`, `Infinity`, and `-Infinity` are rejected.
- **SQL / Filter Injection**: All parameters are bound through parameterized Supabase client queries or PL/pgSQL typed variables.
- **Client Privilege Injection**: Payloads containing `role`, `status`, `user_id`, `radius_meters`, or `priority_score` fail `.strict()` validation with HTTP 422.

---

## 5. Security & Isolation Test Matrix

The following test suites in `tests/phase12_duplicate.test.ts` verify isolation:

| Test ID | Test Scenario | Expected Outcome | Result |
|---|---|---|---|
| `Security 01` | Anonymous caller calls duplicate search | Throws `UNAUTHORIZED` (HTTP 401) | **PASS** |
| `Security 02` | Citizen A searches near private report of Citizen B | Bob's private report excluded from results | **PASS** |
| `Security 03` | Citizen A searches near own private report | Alice's own private report included | **PASS** |
| `Security 04` | Database connection error | Throws safe `INTERNAL_SERVER_ERROR` (500) | **PASS** |
| `Validation 07` | Client injects `radius_meters: 50000` | Rejected by strict Zod schema | **PASS** |
| `Validation 08` | Client injects `role: "admin"` | Rejected by strict Zod schema | **PASS** |
| `RouteContract 06` | Data projection verification | Sensitive fields (`user_id`, `notes`) omitted | **PASS** |
| `RouteContract 07` | Read-only guarantee verification | Zero calls to `insert`, `update`, `delete` | **PASS** |

---

## 6. Residual Risks & Production Recommendations

1. **Distributed Rate Limiting**:
   - In production, rate limiting should be placed at the Edge / Reverse Proxy (e.g. Cloudflare or Vercel WAF) or Redis Upstash instance, bounding requests to 30 requests/minute per authenticated user.
2. **Reverse Geocoding Anonymity**:
   - The service currently computes distance from raw coordinates. When road networks or building layouts require street-level routing, ensure travel distance calculations do not disclose private doorway locations.
