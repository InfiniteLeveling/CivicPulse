# Frontend and backend security contract

Phase 03 changes database authorization. GET /api/health remains the sole implemented application endpoint. The [access matrix](ACCESS_CONTROL_MATRIX.md) governs future handlers. The frontend branch should consume the contract after the reviewed backend integration reaches main.

## Sessions and roles

Phase 04 will verify Supabase Auth sessions on the server and provision one citizen profile per verified identity. Reuse the existing browser auth factory and request-scoped server factory. A trusted operator provisions admins. Signup metadata, request IDs supplied as user IDs, UI state and hidden buttons cannot confer permissions. Use only the public URL and publishable key in the browser. Keep service secrets off the client and use the caller's session for routine reads and writes.

## Data boundaries

- Public map output contains id, reference, category, status, latitude and longitude rounded to two decimal places. An explicit public publication and listed visibility are required. Showing a public case does not authorize loading its raw details, images, votes or internal history.
- The reporter can read their own full report and their own profile, edit full_name, submit their own intake fields, see a safe timeline and support eligible cases. Include the current user ID only when deriving it from a verified session on the backend. SQL enforces that identity match.
- Admin triage can change department, severity and visibility. Every such update advances the report version and records a history row. The future status action must use a reviewed transition workflow. A button must never present an unsupported operation as available.
- Never send a peer's identity, private title/description, exact coordinates, storage path, internal note, voter list or actor ID in a public DTO. Ordinary history queries must select the permitted fields explicitly. Departments likewise require an explicit safe column list. Exact locations are for operational or owner views.
- Keep uploads and evidence actions unavailable until private object policies, ownership checks, sanitization and authorized reads exist. Metadata permissions alone cannot protect image bytes.

## Future HTTP mapping

Use the existing ApiResponse discriminant. Return 401 UNAUTHORIZED for absent/expired sessions, 403 FORBIDDEN for a known but disallowed operation, 404 NOT_FOUND to conceal a missing or inaccessible private object, and 409 CONFLICT for conflicting state or a duplicate that cannot be reconciled as an idempotent success. Validate expected versions on writes. An RLS-filtered SELECT or UPDATE may simply see zero rows. The handler must check the affected row count and avoid confirming that someone else's private report exists. Map errors explicitly and omit raw SQL messages and keys. On the frontend refresh the session or prompt login for 401, show a scoped error for 403/404, and reload the record for stale versions. See the [current API contract](API_CONTRACT.md).
