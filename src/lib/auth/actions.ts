"use server";

import { createClient as createServerClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

/**
 * Server action to sign out of the active Supabase session and redirect to homepage.
 */
export async function signOutAction() {
  if (isSupabaseConfigured()) {
    try {
      const supabase = await createServerClient();
      await supabase.auth.signOut();
    } catch {
      // Ignore signOut errors on server and proceed to redirect
    }
  }
  redirect("/");
}
