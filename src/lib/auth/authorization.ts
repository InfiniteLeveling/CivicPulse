import { createClient as createServerClient, isSupabaseConfigured } from "@/lib/supabase/server";
import type { UserRole, UserProfile } from "@/types/domain";
import type { User } from "@supabase/supabase-js";

export interface AuthenticatedIdentity {
  user: User;
  profile: UserProfile | null;
  role: UserRole | null;
}

/**
 * Server-side verified authentication and role check.
 * Strictly queries the trusted `profiles` database table using verified `auth.users.id`.
 * NEVER trusts client-side state or user_metadata for authorization.
 */
export async function getVerifiedUser(): Promise<AuthenticatedIdentity | null> {
  if (!isSupabaseConfigured()) {
    return null;
  }

  try {
    const supabase = await createServerClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return null;
    }

    // Query trusted profile record
    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("id, full_name, role, created_at")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError || !profileData) {
      // Missing profile fails safely: user is authenticated but has no trusted role
      return {
        user,
        profile: null,
        role: null,
      };
    }

    const role: UserRole = profileData.role === "admin" ? "admin" : "citizen";

    const profile: UserProfile = {
      id: profileData.id,
      fullName: profileData.full_name ?? user.email ?? "Citizen",
      role,
      createdAt: profileData.created_at ?? new Date().toISOString(),
    };

    return {
      user,
      profile,
      role,
    };
  } catch {
    return null;
  }
}
