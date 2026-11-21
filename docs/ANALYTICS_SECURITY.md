# CivicPulse – Analytics Security

## 1. Threat Model & Safeguards

| Threat Vector | Mitigation Strategy | Enforcement Layer |
|---|---|---|
| **Unauthorized Access by Public / Citizens** | Strict RBAC checking `profiles.role = 'admin'` | API Route (`requireAdmin`) & Database RPC (`SECURITY DEFINER` with profile check) |
| **Parameter Tampering / Role Injection** | Query parameter rejection for `role`, `is_admin`, `user_id`, `bypass_rls`, `raw_sql` | API Route Handlers (HTTP 422) |
| **Denial of Service via Massive Date Range** | Date span limit enforced at 366 days max | `resolveDateRange` & Zod validation |
| **SQL Injection** | Parameterized queries and strongly typed Stored Procedures with pinned `search_path = ''` | PostgreSQL Migration & Supabase Client |
| **Data Leakage via Browser Cache** | `Cache-Control: no-store` header applied to all responses | Response utility (`api-response.ts`) |
| **Citizen Privacy Leakage** | Aggregations return counts, durations, and percentages; no PII, user emails, or citizen identifiers are exposed | Analytics Service & Stored Procedures |

---

## 2. Database Privilege Hardening
Stored procedures are created with `SECURITY DEFINER` and explicitly reset `search_path`:
```sql
CREATE OR REPLACE FUNCTION public.civicpulse_get_analytics_overview(
  p_start timestamptz,
  p_end timestamptz
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
...
$$;
```
1. Anonymous and public roles have all permissions revoked:
   ```sql
   REVOKE ALL ON FUNCTION public.civicpulse_get_analytics_overview(timestamptz, timestamptz) FROM public, anon;
   GRANT EXECUTE ON FUNCTION public.civicpulse_get_analytics_overview(timestamptz, timestamptz) TO authenticated;
   ```
2. The internal logic explicitly checks:
   ```sql
   IF (SELECT role FROM public.profiles WHERE id = auth.uid()) IS DISTINCT FROM 'admin' THEN
     RAISE EXCEPTION 'Unauthorized: Administrator access required';
   END IF;
   ```
