# CivicPulse – Final Environment Setup & Operations Guide (Phase 21)

**Document Version:** 1.0.0  
**Target Audience:** Platform Operators, DevOps Engineers, Full-Stack Developers  
**Purpose:** Comprehensive guide to configuring, deploying, and operating CivicPulse across local, staging, and production environments.  

---

## 1. Environment Architecture & Variable Scopes

CivicPulse requires two public browser-exposed variables and one server-only secret:

| Variable Name | Environment Scope | Exposure | Format / Validation Rule | Purpose |
|---|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Local, Preview, Prod | Public | `https://<project-ref>.supabase.co` | Supabase API gateway URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Local, Preview, Prod | Public | Starts with `sb_publishable_` or `eyJ...` | Supabase publishable client API key |
| `NEXT_PUBLIC_APP_URL` | Local, Preview, Prod | Public | `https://civicpulse.org` or `http://localhost:3000` | Canonical application base URL |
| `GEMINI_API_KEY` | Preview, Prod | **Server-Only Secret** | Google AI Studio API Key | Multimodal AI classification key |
| `GEMINI_MODEL` | Preview, Prod | Server-Only Config | `gemini-2.5-flash` (Default) | AI model identifier |

*Security Rule: Never configure `SUPABASE_SERVICE_ROLE_KEY` in application environments. CivicPulse operates securely under PostgreSQL Row Level Security (RLS).*

---

## 2. Supabase Infrastructure Setup

### 2.1 Database Migrations Execution
Apply the 16 sequential migrations in `supabase/migrations/`:
```bash
# 1. Authenticate Supabase CLI
npx supabase login

# 2. Link local repository to remote Supabase project
npx supabase link --project-ref <your-project-ref>

# 3. Push all 16 migrations
npx supabase db push
```

### 2.2 Storage Bucket Configuration (`civic-evidence`)
Verify or create the storage bucket in **Supabase Dashboard -> Storage**:
- **Bucket ID / Name:** `civic-evidence`
- **Public Access:** `OFF` (Private bucket)
- **File Size Limit:** 3,145,728 bytes (3 MB)
- **Allowed MIME Types:** `image/jpeg`, `image/png`, `image/webp`

### 2.3 Authentication URL Configuration
In **Supabase Dashboard -> Authentication -> URL Configuration**:
- **Site URL:**
  - Staging: `https://civicpulse.vercel.app`
  - Production: `https://civicpulse.org`
- **Redirect URLs (Allowlist):**
  - `http://localhost:3000/**`
  - `https://civicpulse.vercel.app/**`
  - `https://*-infiniteleveling.vercel.app/**`
  - `https://civicpulse.org/**`

---

## 3. Vercel Project Setup

1. **Link Project:**
   ```bash
   npx vercel login
   npx vercel link
   ```
2. **Configure Environment Variables:**
   Add `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, and `GEMINI_API_KEY` scoped to **Preview** and **Production**.
3. **Execute Preview Deployment:**
   ```bash
   npx vercel
   ```

---

## 4. Verification & Health Monitoring

Execute pre-deployment diagnostics before any code release:
```bash
# 1. Environment hygiene check
npm run check:env

# 2. Complete integration smoke test
npm run test:integration

# 3. Full test suite (480 automated tests)
npm test

# 4. Production build check
npm run build
```

---

## 5. Troubleshooting & FAQ

- **PGRST125 / Invalid Path:** Ensure `NEXT_PUBLIC_SUPABASE_URL` does NOT include `/rest/v1` or trailing slashes. `src/lib/env.ts` normalizes this automatically.
- **Error 42501 (Permission Denied):** This indicates that PostgreSQL Row Level Security is working as intended. Unauthenticated requests to private tables (`departments`, `reports`) are denied by default.
- **StorageApiError: Bucket not found:** Apply migration `20261121000400_phase05_storage.sql` via `npx supabase db push` to initialize the `civic-evidence` bucket.
- **AI Classification Unconfigured:** If `GEMINI_API_KEY` is absent, the system gracefully logs a warning and allows citizens to select categories manually.
