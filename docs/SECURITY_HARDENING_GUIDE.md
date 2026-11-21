# CivicPulse – Security Hardening & Secure Coding Guide

**Document Version:** 1.0.0  
**Target Audience:** Backend Engineers, Security Reviewers, Platform Maintainers  
**Purpose:** Developer guidelines for maintaining security invariants in CivicPulse

---

## 1. Principles of Security in CivicPulse

1. **Defense in Depth:** Enforce controls at multiple layers (HTTP headers, Next.js route handlers, application domain services, and PostgreSQL Row Level Security).
2. **Fail Securely:** Deny access by default; abort execution immediately upon authorization failure.
3. **Zero Trust Client Payloads:** Never trust client-supplied identifiers, roles, priority scores, or timestamps.
4. **Audit Immutability:** State changes and routing decisions must be recorded atomically in non-tamperable audit tables.

---

## 2. API Route Handler Guidelines

### 2.1 Enforce Authentication Early
Every protected route handler must verify session identity before reading the body or executing business logic:
```ts
const supabase = await createServerClient();
const { data: { user }, error } = await supabase.auth.getUser();
if (error || !user) {
  throw new AppError("UNAUTHORIZED", "Authentication required");
}
```

### 2.2 Enforce Administrative Access Strictly
Never check roles on the client. Always invoke `assertAdmin(user)`:
```ts
import { assertAdmin } from "@/utils/permissions";

// Inside admin route handler:
assertAdmin(user); // Throws AppError("FORBIDDEN") if user.role !== "admin"
```

### 2.3 Strict Zod Validation
Always use `.strict()` on Zod schemas to reject unexpected or injected parameters:
```ts
export const mySchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(200),
}).strict(); // Rejects injected fields like role, status, priority_score
```

### 2.4 Apply Sliding-Window Rate Limiting
Sensitive, expensive, or mutating endpoints must enforce sliding-window rate limiting:
```ts
import { enforceRateLimit } from "@/utils/rate-limit";

// Inside route handler:
enforceRateLimit(`my_action:${user.id}`, 30, 60); // 30 requests per 60 seconds
```

### 2.5 Ensure Ephemeral Response Caching
All JSON responses must emit `Cache-Control: no-store`:
```ts
return successResponse(data, 200); // Built-in Cache-Control: no-store
```

---

## 3. Storage Security Conventions

### 3.1 Scoped Draft Paths
Storage paths must always be constructed via server-side path generators:
```ts
import { generateDraftStoragePath } from "@/utils/storage-path";

// Generates: drafts/<user_id>/<random_uuid>.<extension>
const path = generateDraftStoragePath(user.id, "jpg");
```

### 3.2 Binary Signature Validation
Always inspect file magic bytes before saving:
```ts
import { validateImageFile } from "@/utils/file-validation";

// Validates magic bytes, max 3MB size, and rejects SVG/PDF/EXE
const { extension } = validateImageFile(buffer, contentType);
```

---

## 4. PostgreSQL Database Security Conventions

### 4.1 RLS on All New Tables
Any new table must immediately enable RLS:
```sql
ALTER TABLE public.my_table ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.my_table FORCE ROW LEVEL SECURITY;
```

### 4.2 Revoke Trigger Function Permissions from PUBLIC
PostgreSQL grants execute to `PUBLIC` by default. Always revoke execute on trigger functions:
```sql
REVOKE EXECUTE ON FUNCTION public.my_trigger_function() FROM PUBLIC, anon, authenticated;
```

### 4.3 Immutable Audit Records
Audit logs (`report_history`, `priority_history`) must deny all client mutation:
```sql
REVOKE INSERT, UPDATE, DELETE ON public.my_audit_table FROM PUBLIC, anon, authenticated;
```

---

## 5. Structured Logging & Secret Hygiene

- Log structured events via `src/utils/logger.ts`.
- Never log passwords, recovery tokens, full API keys, or raw base64 image data.
- Ensure all public environment variables are prefixed with `NEXT_PUBLIC_`; private secrets (`SUPABASE_SERVICE_ROLE_KEY`, `GEMINI_API_KEY`) must never have `NEXT_PUBLIC_` prefixes.
