# Connecting the frontend to CivicPulse

## Phase 05 handoff

Before implementing complaint forms and image pickers, read:
1. [UPLOAD_CONTRACT.md](UPLOAD_CONTRACT.md): Upload endpoint requests, responses, file restrictions and component patterns.
2. [STORAGE_SECURITY.md](STORAGE_SECURITY.md): Private bucket architecture and Storage RLS policies.
3. [IMAGE_LIFECYCLE.md](IMAGE_LIFECYCLE.md): Sequence diagram from local photo selection to Phase 06 complaint creation.
4. [AUTH_INTEGRATION_GUIDE.md](AUTH_INTEGRATION_GUIDE.md): Client authentication and session management.

### Key Integration Points for Frontend
- **Private Bucket**: All uploads land in the private `civic-evidence` bucket. Direct public image URLs are forbidden and will fail.
- **Image Picker**: Use `URL.createObjectURL(file)` for instant local UI previews before upload.
- **Upload Action**: Send `multipart/form-data` with `file` and optional `purpose=complaint_before` to `POST /api/upload`.
- **State Retention**: Retain the returned `storage_path` in state; it will be passed to `POST /api/reports` during Phase 06 complaint submission.
- **Temporary Preview**: Call `POST /api/upload/access` with `{ storage_path }` to obtain a short-lived (15 min) signed URL if a cloud preview is needed before report submission.

Use the existing public Supabase URL and publishable-key variables on both branches. Follow the [security contract](SECURITY_CONTRACT.md) for permitted fields, operations and error handling.

The frontend and Route Handlers run in one Next.js App Router application. After the reviewed backend foundation reaches the frontend branch through main, run `npm ci` and `npm run dev` from the repository root. Pages and API requests use the same origin, port and cookies.
