import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabaseConfig } from "@/lib/env";

// Route Handlers pass the outgoing response headers to persist session writes.
// Server Components can only read cookies; session refresh belongs to proxy / middleware.
export async function createSupabaseServerClient(responseHeaders?: Headers) {
  const config = getSupabaseConfig();
  const cookieStore = await cookies();
  return createServerClient(config.NEXT_PUBLIC_SUPABASE_URL, config.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll(cookiesToSet, cacheHeaders) {
        if (!responseHeaders) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Ignored if called in a Server Component where cookies are read-only
          }
          return;
        }
        for (const [name, value] of Object.entries(cacheHeaders)) {
          responseHeaders.set(name, value);
        }
        for (const { name, value, options } of cookiesToSet) {
          cookieStore.set(name, value, options);
        }
      },
    },
  });
}
