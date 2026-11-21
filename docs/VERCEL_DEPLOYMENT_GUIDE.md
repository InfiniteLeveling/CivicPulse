# CivicPulse – Vercel Deployment & Operation Guide (Phase 20)

**Document Version:** 1.0.0  
**Target Platform:** Vercel (Next.js Native Serverless Infrastructure)  
**Scope:** Preview & Staging Deployment Execution  
**Audience:** DevOps Engineers, Backend Engineers, Release Managers  

---

## 1. Architectural Overview & Platform Capabilities

CivicPulse is deployed as a single Next.js App Router full-stack application on Vercel. 
The backend utilizes Vercel Serverless Functions (Node.js runtime) to serve 28 RESTful API route handlers, interacting with Supabase PostgreSQL via `@supabase/ssr` and Google Gemini 2.5 Flash via `@google/genai`.

### Key Platform Specifications
- **Framework Preset:** `Next.js`
- **Node.js Runtime Version:** Node.js 22.x (`engines.node: "^22.13.0 || >=24.0.0"`)
- **Build Command:** `npm run build` (`next build --webpack`)
- **Install Command:** `npm install`
- **Output Directory:** `.next`
- **Serverless Region:** Default `iad1` (Washington D.C.) or region closest to Supabase database cluster
- **Function Execution Timeout:** 15 seconds (bounds AI classification and database queries)
- **Request Body Payload Limit:** 4.5 MB (CivicPulse caps photo uploads at 3 MB, comfortably below platform ceiling)

---

## 2. Pre-Deployment Verification Pipeline

Before initiating any remote deployment, execute the local quality gates:
```bash
# 1. Verify environment cleanliness & zero exposed secrets
npm run check:env

# 2. Run linting (zero warnings permitted)
npm run lint

# 3. Verify TypeScript type safety
npm run typecheck

# 4. Run complete regression test suite (474 tests across 17 suites)
npm test

# 5. Execute production webpack build
npm run build
```

---

## 3. Vercel Project Linkage & Environment Setup

### 3.1 Initial Authentication & Project Link
To link the local working tree to the authorized Vercel project:
```bash
# Authenticate Vercel CLI (interactive browser or token)
npx vercel login

# Link repository to existing Vercel project
npx vercel link
```
*Note: Select the existing CivicPulse Vercel project under the authorized team account. Do NOT create duplicate projects.*

### 3.2 Environment Variable Configuration
Navigate to **Vercel Dashboard -> Project Settings -> Environment Variables** and add the following keys scoped to **Preview**:

| Variable Name | Vercel Environment Scope | Secret Type | Example Placeholder |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | **Preview** | Public | `https://<preview-project>.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | **Preview** | Public | `sb_publishable_<preview-key>` |
| `NEXT_PUBLIC_APP_URL` | **Preview** | Public | `https://<preview-deployment>.vercel.app` |
| `GEMINI_API_KEY` | **Preview** | **Server-Only Secret** | `AIzaSy...<staging-gemini-key>` |
| `GEMINI_MODEL` | **Preview** | Server-Only Config | `gemini-2.5-flash` |

*Security Warning: Never select the "Production" scope for staging keys, and never prefix `GEMINI_API_KEY` with `NEXT_PUBLIC_`.*

---

## 4. Executing an Isolated Preview Deployment

To deploy from the current `backend` branch to an isolated Vercel Preview URL **without modifying Git branches or triggering production workflows**:

```bash
# Execute Preview deployment from current working directory
npx vercel
```

### Critical Rules During Preview Deployment
1. **NEVER use `--prod`:** Flag `--prod` promotes the deployment to production and points production domains to the build.
2. **DO NOT PUSH TO GITHUB:** Deployment is executed directly via Vercel CLI or authorized branch tracking; do not execute `git push origin backend` without explicit operator permission.
3. **DO NOT MERGE:** Never merge `backend` into `main` or `frontend`.

---

## 5. Post-Deployment Verification & Smoke Testing

Once the Vercel CLI returns the preview deployment URL (e.g. `https://civicpulse-backend-<hash>.vercel.app`):
1. **Health Check:**
   ```bash
   curl -i https://<preview-url>/api/health
   # Expected: HTTP 200 {"success":true,"data":{"status":"ok","service":"civicpulse-backend"}}
   # Expected Header: Cache-Control: no-store, no-cache, must-revalidate
   ```
2. **Security Headers Verification:**
   Inspect response headers on the root URL:
   - `X-Frame-Options: DENY`
   - `X-Content-Type-Options: nosniff`
   - `Strict-Transport-Security: max-age=63072000...`
   - `Content-Security-Policy: default-src 'self' ...`
3. **Unauthenticated Access Boundary:**
   ```bash
   curl -i https://<preview-url>/api/admin/analytics/overview
   # Expected: HTTP 401 UNAUTHORIZED
   ```
4. **Inspect Runtime Logs:**
   ```bash
   npx vercel logs <preview-url>
   ```

---

## 6. Rollback Procedures

If an issue is detected on a deployed preview:
1. Identify the previous functional deployment ID from `npx vercel ls`.
2. Redeploy or roll back traffic via `npx vercel rollback <deployment-id>`.
3. If database migrations were applied, assess backward compatibility before schema alterations (see [ROLLBACK_AND_RECOVERY_PLAN.md](ROLLBACK_AND_RECOVERY_PLAN.md)).
