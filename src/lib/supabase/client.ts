"use client";

import { createBrowserClient } from "@supabase/ssr";

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
 * Creates a browser-side Supabase client using @supabase/ssr.
 * Throws an explicit configuration error if environment variables are missing.
 */
export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) {
    throw new Error(
      "Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in .env.local to use Supabase."
    );
  }

  return createBrowserClient(url, key);
}

/** Backend naming convention alias */
export const createSupabaseBrowserClient = createClient;
