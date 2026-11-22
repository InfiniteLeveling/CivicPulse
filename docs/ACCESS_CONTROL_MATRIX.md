# Phase 03 access control matrix

Each cell gives **SELECT / INSERT / UPDATE / DELETE** in that order. A dash means denied. Admin and citizen sessions both use PostgreSQL authenticated. The role stored in profiles distinguishes them. The server column describes an ordinary Next.js request using the caller's verified session. Administrative database maintenance is a separate trust boundary.

| Base table | anon | Citizen session | Admin session | Request-scoped backend |
|---|---|---|---|---|
| profiles | — / — / — / — | own / — / own full_name / — | own / — / own full_name / — | same as caller |
| departments | — / — / — / — | directory / — / — / — | directory / — / — / — | same as caller |
| reports | — / — / — / — | own / own intake / — / — | all / — / triage / — | same as caller |
| report_votes | — / — / — / — | own / own eligible vote / — / — | all / — / — / — | same as caller |
| status_history | — / — / — / — | own report timeline / — / — / — | all report timelines / — / — / — | same as caller |
| report_images | — / — / — / — | own report metadata / — / — / — | all metadata / — / — / — | same as caller |

**Separate projection.** All three client identities can SELECT public.civic_report_map. It includes only public, listed reports and six safe fields. Raw report SELECT for citizens always returns their own rows only.

**Trusted operations.** On profiles, an authorized operator can provision or revoke roles; on departments, an operator manages the catalog. On reports, use session-scoped intake/triage. On report_votes and status_history, an owner-rights trigger writes only the initial support and attributed audit events. On report_images, Phase 05 must implement verified attachment. No new privileged server credential or general all-table service access is granted. An existing database owner or a role with BYPASSRLS and sufficient SQL grants can operate outside client policies, including modifying audit data. The matrix is an application boundary, not protection against the database owner.

## Enforcing grants and policies

| Policies | Column and row boundary |
|---|---|
| profile_self_read, profile_self_edit | Self by auth.uid(); only UPDATE(full_name). Profile ID, role and timestamps are protected. No client INSERT or role provisioning. |
| department_directory | Authenticated identity present; SELECT(id,name,description) only. Keep descriptions suitable for directory display. |
| report_private_read, report_self_create, report_admin_triage | Creator or admin reads. Citizen INSERT only user_id, submission_key, title, description, category, latitude, longitude, publication; identity must match and an existing profile is required by FK. Admin UPDATE only department_id, severity, visibility. Status, resolved_at, version, ownership and priority cannot be client-assigned. |
| vote_private_read, vote_self_active | Read self or admin. Insert only report_id and own user_id for a listed public pending/in_progress case. Unique report/user key enforces one vote. The creation trigger separately records the initial author support even for private reports. |
| timeline_report_reader | Inherits report visibility from the base report SELECT policy. Select only id, report_id, version, previous_status, status, created_at. Actor and internal notes are withheld from all normal sessions. |
| image_report_reader | Read metadata only for a report visible through the base report policy. All metadata writes await Phase 05. |

Client DELETE, TRUNCATE and audit rewrites are denied. Status transitions, signed image reads, vote withdrawal, public support counts and public timelines require separate reviewed workflows. See [security architecture](SECURITY_ARCHITECTURE.md).
