import { z } from "zod";

const publicConfig = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url({ protocol: /^https?$/ }),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z
    .string()
    .regex(/^(sb_publishable_[A-Za-z0-9_-]+|eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)$/),
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),
});

export function getSupabaseConfig() {
  // Next.js needs static property access to inline public variables in the browser.
  const result = publicConfig.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  });
  if (!result.success) {
    const names = result.error.issues.map((issue) => issue.path[0]).join(", ");
    throw new Error(`Missing or invalid Supabase public configuration: ${names}. See .env.example.`);
  }

  // Normalize project URL: strip /rest/v1 or trailing slashes to avoid 404s on auth endpoints
  const cleanUrl = result.data.NEXT_PUBLIC_SUPABASE_URL.replace(/\/rest\/v1\/?$/, "").replace(/\/+$/, "");

  return {
    ...result.data,
    NEXT_PUBLIC_SUPABASE_URL: cleanUrl,
  };
}
