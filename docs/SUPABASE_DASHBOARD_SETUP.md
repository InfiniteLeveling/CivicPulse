# Set up CivicPulse in the Supabase Dashboard

## Run the six SQL files

1. Open the CivicPulse **development project** on the Supabase website and select **SQL Editor**. Use the database role that owns the CivicPulse tables, normally `postgres` for a Dashboard setup. The SQL Editor runs these scripts directly. Your Next.js environment variables are only needed when connecting the application. [Supabase database guide](https://supabase.com/docs/guides/database/overview)
2. Click **+** to start a **new query**. Open the first file below from your local `backend` branch and copy its **entire contents**. Saved queries in the Dashboard keep their old SQL when a repository file changes.
3. Paste the file, clear any text selection and click **Run**. Check the result, then repeat with a new query for each remaining file in order. Each file manages its own transaction.

| Order | File | Expected result |
| --- | --- | --- |
| 1 | [Core schema](../supabase/migrations/20261121000100_core_schema.sql) | Success. Creates or verifies the six CivicPulse tables. |
| 2 | [Department seed](../supabase/seed.sql) | `departments_added` and `already_present` add up to six. A fresh project shows 6 and 0. A repeat shows 0 and 6. |
| 3 | [Security policies](../supabase/migrations/20261121000200_phase03_rls_policies.sql) | Success. Applies row-level security policies, client permissions, the public map view and audit triggers. |
| 4 | [Catalog test](../supabase/tests/01_catalog.sql) | `Phase 02 catalog checks passed` |
| 5 | [Constraint test](../supabase/tests/02_constraints.sql) | `Phase 02 constraint checks passed` |
| 6 | [Role and access test](../supabase/tests/phase03_rls_test.sql) | `Phase 03 role checks passed` |

The migrations may finish with **Success. No rows returned**. The behavioral tests create their own temporary Auth identities and application rows and roll back the transaction. Run them in a development project with CivicPulse's Auth schema and without custom signup hooks that launch external actions. You can rerun all six files. The seed keeps the IDs and edited descriptions of existing departments.

When reviewing the SQL, the core migration creates and drops a comparison schema named `civicpulse_schema_check_<session ID>` in the same transaction. It uses that schema to compare definitions before touching a partially installed table. The security migration replaces the named CivicPulse policies and report triggers.

## If the SQL Editor shows an error

- **`42P07: relation "profiles" already exists` in an old saved query.** Start at step 1 with the updated core file. It checks existing table definitions, preserves a matching installation and can complete a compatible partial installation. Keep your existing profiles in place.
- **`Incompatible CivicPulse schema` or an unrecognized policy.** The transaction stops to preserve the existing schema and records. Copy the filename and the complete error, including `DETAIL` and `HINT` if displayed. A table from a different application needs a migration specific to its actual definition.
- **An owner or RLS error.** In a new query, run the read-only check below. Compare `running_as` with `table_owner` and confirm the selected project. For a mismatch, use the trusted owner for that project. If RLS flags or policies differ from the project design, save the results for review before retrying.
- **`25P02: current transaction is aborted`.** If the editor retained the failed transaction, run `rollback;` by itself. Correct the original error and retry the entire file in a new query.

```sql
select t.name as expected_table,
       current_user as running_as,
       pg_get_userbyid(c.relowner) as table_owner,
       c.relrowsecurity as rls_enabled,
       c.relforcerowsecurity as rls_forced,
       array(select p.polname from pg_policy p
             where p.polrelid = c.oid order by p.polname) as policies
from unnest(array['profiles', 'departments', 'reports', 'report_votes',
                  'status_history', 'report_images']) as t(name)
left join pg_class c on c.oid = to_regclass('public.' || t.name);
```

After setup, record the project, file revisions and test results for the backend handoff. The SQL suites check database behavior. Verify signed sessions through the actual Data API when connecting the frontend.
