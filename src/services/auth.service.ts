import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { AuthenticatedUser, UserProfile } from "@/types/auth";
import { AppError } from "@/utils/app-error";
import { logger } from "@/utils/logger";
import { assertAdmin, sanitizeRedirectUrl } from "@/utils/permissions";

// Re-export sanitizeRedirectUrl for convenience
export { sanitizeRedirectUrl };

/**
 * Retrieves the application profile for a given user ID from public.profiles.
 * If missing, attempts one safe repair using civicpulse_ensure_profile RPC.
 */
export async function getCurrentProfile(
  userId: string,
  client?: SupabaseClient
): Promise<UserProfile> {
  const supabase = client ?? (await createSupabaseServerClient());

  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, role, created_at, updated_at")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    logger.error("request.failed", { status: 500 });
    throw new AppError("INTERNAL_SERVER_ERROR", "Failed to retrieve user profile", { cause: error });
  }

  if (data) {
    return data as UserProfile;
  }

  // Profile missing - log warning and attempt single safe repair
  logger.warn("auth.profile_missing");

  const { data: repaired, error: rpcError } = await supabase.rpc("civicpulse_ensure_profile");

  if (!rpcError && repaired) {
    logger.info("auth.profile_repaired");
    return repaired as UserProfile;
  }

  // Profile remains missing
  throw new AppError("NOT_FOUND", "User profile not found. Please contact support.");
}

/**
 * Retrieves the verified authenticated user and their authoritative profile role.
 * Uses getUser() to validate the token against the Supabase Auth server.
 * Returns null if the caller is unauthenticated.
 */
export async function getCurrentUser(client?: SupabaseClient): Promise<AuthenticatedUser | null> {
  const supabase = client ?? (await createSupabaseServerClient());

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  const profile = await getCurrentProfile(user.id, supabase);

  return {
    id: user.id,
    email: user.email,
    full_name: profile.full_name,
    role: profile.role,
  };
}

/**
 * Enforces authenticated identity for API Route Handlers and Server Actions.
 * Throws 401 UNAUTHORIZED if not authenticated.
 */
export async function requireUser(
  responseHeaders?: Headers,
  client?: SupabaseClient
): Promise<AuthenticatedUser> {
  const supabase = client ?? (await createSupabaseServerClient(responseHeaders));
  const user = await getCurrentUser(supabase);

  if (!user) {
    logger.warn("auth.unauthorized", { status: 401 });
    throw new AppError("UNAUTHORIZED", "Authentication required");
  }

  return user;
}

/**
 * Enforces admin authorization for API Route Handlers.
 * Throws 401 if unauthenticated, and 403 FORBIDDEN if the user is a citizen.
 * Reads the authoritative role from the database, never trusting request metadata.
 */
export async function requireAdmin(
  responseHeaders?: Headers,
  client?: SupabaseClient
): Promise<AuthenticatedUser & { role: "admin" }> {
  const user = await requireUser(responseHeaders, client);

  try {
    assertAdmin(user);
    return user;
  } catch (error) {
    logger.warn("auth.forbidden", { status: 403 });
    throw error;
  }
}
