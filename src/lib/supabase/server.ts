import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Checks whether public Supabase environment variables are defined.
 */
export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  );
}

/**
 * Creates a server-side Supabase client.
 * Supports both Server Components (read-only cookies) and Route Handlers (mutable headers).
 *
 * Usage:
 *   Server Components / Server Actions: `const supabase = await createSupabaseServerClient();`
 *   Route Handlers: `const h = new Headers(); const supabase = await createSupabaseServerClient(h);`
 */
export async function createSupabaseServerClient(responseHeaders?: Headers) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) {
    throw new Error(
      "Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in .env.local to use Supabase."
    );
  }

  const cookieStore = await cookies();

  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet, cacheHeaders) {
        if (!responseHeaders) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Ignored when called in a Server Component where cookies are read-only
          }
          return;
        }

        if (cacheHeaders) {
          for (const [name, val] of Object.entries(cacheHeaders)) {
            responseHeaders.set(name, val);
          }
        }
        for (const { name, value, options } of cookiesToSet) {
          cookieStore.set(name, value, options);
        }
      },
    },
  });
}

/** Frontend naming convention alias */
export const createClient = createSupabaseServerClient;
