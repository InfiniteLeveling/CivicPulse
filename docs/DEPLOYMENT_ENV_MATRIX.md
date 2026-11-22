# CivicPulse – Deployment Environment Variable Matrix (Phase 20)

**Document Version:** 1.0.0  
**Status:** AUDITED & VERIFIED  
**Scope:** Vercel Hosting & Supabase Environment Configuration  
**Security Classification:** Redacted (Zero Credentials Stored in Documentation)

---

## 1. Overview & Classification Principles

Next.js separates configuration into:
1. **Public Browser Configuration (`NEXT_PUBLIC_*`):** Inlined at build time into client JavaScript bundles. Must NEVER contain private API keys, database connection strings, or service-role secrets.
2. **Server-Only Configuration:** Evaluated strictly at runtime inside Next.js Route Handlers and server components. Never exposed to browser bundles or client-facing responses.

---

## 2. Environment Variable Matrix

| Variable Name | Purpose | Secret Classification | Lifecycle Consumption | Dev Scope | Preview Scope | Production Scope | Current Status | Remediation / Missing Action |
|---|---|---|---|---|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project API gateway endpoint | Public | Build-time & Runtime | Yes | Yes (Preview Project) | Yes (Prod Project) | Configured in `.env.local` | Set to Preview Supabase project in Vercel Preview scope. |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase PostgREST publishable API key | Public (Guarded by RLS) | Build-time & Runtime | Yes | Yes (Preview Key) | Yes (Prod Key) | Configured in `.env.local` | Set corresponding publishable key in Vercel Preview scope. |
| `NEXT_PUBLIC_APP_URL` | Base public canonical URL of the application | Public | Runtime | Optional (`http://localhost:3000`) | Optional (`https://<preview>.vercel.app`) | Yes (`https://civicpulse.org`) | Optional / Defaulted | Set in Vercel environment to match canonical deployment domain. |
| `GEMINI_API_KEY` | Google Gemini 2.5 Flash multimodal AI API key | **Server-Only Private Secret** | Runtime | Optional / Dev Key | Optional / Staging Key | Yes (Production Quota Key) | Configured in `.env.local` | Store as server-only secret in Vercel; ensure no `NEXT_PUBLIC_` prefix. |
| `GEMINI_MODEL` | Override AI model name (defaults to `gemini-2.5-flash`) | Server-Only Configuration | Runtime | Optional | Optional | Optional | Defaulted | Optional; falls back to `"gemini-2.5-flash"`. |
| `SUPABASE_SERVICE_ROLE_KEY` | Privileged Supabase database administrative bypass key | **Critical Private Secret** | Runtime | **NOT USED** | **NOT USED** | **NOT USED** | Excluded | **DO NOT CONFIGURE.** Architecture relies on client RLS; service-role key is forbidden from app routes. |
| `NODE_ENV` | Node.js execution environment | System | Build-time & Runtime | `development` | `production` | `production` | Automatic (Vercel) | Automatically managed by Vercel deployment runtime. |

---

## 3. Vercel Scope Configuration Guide

### 3.1 Preview Environment Scope (Staging / Verification)
Configure in Vercel Dashboard -> Project Settings -> Environment Variables:
- `NEXT_PUBLIC_SUPABASE_URL` -> Scope: **Preview**
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` -> Scope: **Preview**
- `NEXT_PUBLIC_APP_URL` -> Scope: **Preview** (or leave unset to auto-detect `VERCEL_URL`)
- `GEMINI_API_KEY` -> Scope: **Preview** (Server-only secret)

### 3.2 Production Environment Scope (Locked until Phase 20/21 Signoff)
- `NEXT_PUBLIC_SUPABASE_URL` -> Scope: **Production**
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` -> Scope: **Production**
- `NEXT_PUBLIC_APP_URL` -> Scope: **Production** (`https://civicpulse.org`)
- `GEMINI_API_KEY` -> Scope: **Production** (Dedicated production billing account)

---

## 4. Verification & Defense Checks

1. **Client Bundle Inspection:** `tests/deployment/deployment-config.test.ts` asserts that `NEXT_PUBLIC_GEMINI_API_KEY` or any service role variable triggers immediate validation failure.
2. **Environment Validation Tool:** `npm run check:env` executes `scripts/deployment/check-env.ts` during pre-build pipelines to enforce variable presence and prevent credential leaks.
