import type { AuthenticatedUser } from "@/types/auth";
import { AppError } from "./app-error";

/**
 * Checks whether an application role is 'admin'.
 */
export function isAdminRole(role: string | null | undefined): boolean {
  return role === "admin";
}

/**
 * Checks whether an application role is 'citizen'.
 */
export function isCitizenRole(role: string | null | undefined): boolean {
  return role === "citizen";
}

/**
 * Sanitizes an untrusted redirect URL to prevent open redirect vulnerabilities.
 * Ensures the destination is a safe relative pathname on the same origin.
 */
export function sanitizeRedirectUrl(
  target: string | null | undefined,
  fallback: string = "/dashboard"
): string {
  if (!target || typeof target !== "string") {
    return fallback;
  }

  const trimmed = target.trim();

  // Reject protocol-relative URLs, windows paths, or non-slash starting paths
  if (!trimmed.startsWith("/") || trimmed.startsWith("//") || trimmed.includes("\\")) {
    return fallback;
  }

  try {
    const parsed = new URL(trimmed, "http://localhost");
    // Ensure origin didn't somehow change
    if (parsed.origin !== "http://localhost") {
      return fallback;
    }
    // Return relative path with query parameters
    return parsed.pathname + parsed.search;
  } catch {
    return fallback;
  }
}

/**
 * Asserts that the authenticated user possesses the admin role.
 * Throws 403 FORBIDDEN if the user is a citizen or non-admin.
 */
export function assertAdmin(user: AuthenticatedUser): asserts user is AuthenticatedUser & { role: "admin" } {
  if (user.role !== "admin") {
    throw new AppError("FORBIDDEN", "Administrative privileges required");
  }
}
