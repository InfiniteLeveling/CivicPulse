# CivicPulse

CivicPulse is a civic maintenance reporting project. Phase 01 provides the Next.js App Router application, a process health check and shared backend utilities.

## Run locally

Use Node.js 24 LTS and npm. From the repository root:

```sh
npm ci
npm run dev
```

Open `http://localhost:3000`. A GET to `/api/health` returns HTTP 200 and `{"success":true,"data":{"status":"ok","service":"civicpulse-backend"}}`. Both routes run without any environment file.

## Supabase settings

Copy [.env.example](.env.example) to `.env.local` when working with the client factories. Set `NEXT_PUBLIC_SUPABASE_URL` to the project URL and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` to the project's public `sb_publishable_` key. Restart the development server after changing these values. Next.js embeds public settings in client builds; set them before building a client that uses Supabase. Keep privileged keys out of public variables. Leave `GEMINI_API_KEY` empty for this phase.

Browser code uses `createSupabaseBrowserClient()`. Server Components can use `await createSupabaseServerClient()` for read-only cookie access. A Route Handler that permits session writes passes the outgoing response's mutable headers to the server factory before issuing Supabase calls. The SSR adapter writes cookies through Next.js and copies the provider's cache headers into that response. Session refresh and access control belong to a later phase.

## Verify

```sh
npm run lint
npm run typecheck
npm run build
npm start
```

Type checking generates Next.js route types before running strict TypeScript checks. Use the lockfile for reproducible installs. The health route measures application responsiveness only. The next phase is Supabase Database Schema. See the [project handoff](PROJECT_CONTEXT.md) for implementation evidence and [API contracts](docs/10-API-SPECIFICATION.md) for the response format.
