# CivicPulse – Rollback & Disaster Recovery Plan (Phase 20)

**Document Version:** 1.0.0  
**Status:** ACTIONABLE & AUDITED  
**Scope:** Vercel Hosting Runtime & Supabase PostgreSQL Migrations  
**Target Audience:** Release Managers, DevOps Engineers, On-Call Backend Architects  

---

## 1. Rollback Strategy & Architectural Principles

CivicPulse decouples application deployment rollback from database schema evolution:
1. **Application Rollback (Vercel):** Rapid, near-instantaneous redirection of traffic to a previous immutable deployment build.
2. **Database State Preservation (Supabase):** Database migrations are strictly additive. Schema rollbacks must preserve existing citizen data, complaints, and audit ledgers. **Never execute a database reset in recovery.**

---

## 2. Vercel Application Rollback Procedures

### 2.1 Instant Rollback via Vercel Dashboard
1. Navigate to **Vercel Dashboard -> CivicPulse Project -> Deployments**.
2. Identify the last known-healthy deployment (verified by build status and commit hash).
3. Click the three dots (`...`) on the deployment card and select **Rollback to this Deployment** or **Promote to Production**.
4. Traffic is immediately redirected with zero downtime.

### 2.2 Instant Rollback via Vercel CLI
```bash
# List recent deployments to identify the last known-good deployment ID
npx vercel ls

# Execute rollback to target deployment
npx vercel rollback <deployment-id-or-url>
```

---

## 3. Database Schema Recovery & Backward Compatibility

### 3.1 Additive Migration Guarantee
All 16 schema migrations authored across Phases 02–19 are designed to be backward compatible:
- Tables, indexes, functions, triggers, and RLS policies are additive.
- No historical columns or tables are dropped.
- Rolling back application code to an earlier revision will NOT cause breaking SQL errors, as the newer schema maintains full column and type compatibility.

### 3.2 Recovery Protocol for Migration Incidents
If a database migration fails or introduces an operational bottleneck:
1. **DO NOT RUN `supabase db reset`:** This would destroy real complaints, citizen profiles, and audit history.
2. **Forward-Fix Preferred:** Prepare a targeted corrective migration (e.g. adding a missing index or patching a trigger) and apply it via `npx supabase db push`.
3. **Targeted Reversion Script:** If a specific policy or index must be reverted:
   - For a policy: `ALTER POLICY <name> ON <table_name> ...` or `DROP POLICY <name> ON <table_name>;`
   - For a trigger: `DROP TRIGGER IF EXISTS <trigger_name> ON <table_name>;`
   - For an index: `DROP INDEX CONCURRENTLY IF EXISTS <index_name>;`

---

## 4. Disaster Recovery & Emergency Contacts

| Incident Classification | Primary Contact | Initial Action (0-15 Min) | Escalation Action (15-60 Min) |
|---|---|---|---|
| **Vercel Runtime 500 Spike** | DevOps Lead | Inspect Vercel runtime logs (`npx vercel logs`); roll back to previous deployment. | Verify environment variables and database connectivity. |
| **Database Connectivity Outage** | Database Administrator | Check Supabase platform status; verify connection pooler limits. | Inspect slow queries; kill blocking transactions if necessary. |
| **Security Credential Compromise** | AppSec Lead | Immediately rotate `GEMINI_API_KEY` in Google Cloud Console and update Vercel environment. | Rotate Supabase API keys; invalidate active sessions. |
