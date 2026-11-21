import type { UserRole } from "@/types/domain";

/**
 * Validates and sanitizes a relative redirect path to prevent open redirect vulnerabilities.
 * Rejects external URLs, protocol-relative paths, and malformed strings.
 */
export function getSafeRedirectPath(
  target: string | null | undefined,
  fallback = "/dashboard"
): string {
  if (!target || typeof target !== "string") {
    return fallback;
  }

  const trimmed = target.trim();

  // Must begin with a single slash (relative internal route)
  if (!trimmed.startsWith("/") || trimmed.startsWith("//") || trimmed.startsWith("/\\")) {
    return fallback;
  }

  // Reject protocol schemes or dangerous prefixes
  if (/^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(trimmed) || trimmed.toLowerCase().includes("javascript:")) {
    return fallback;
  }

  // Reject path traversal
  if (trimmed.includes("..")) {
    return fallback;
  }

  return trimmed;
}

/**
 * Determines the target landing path for an authenticated user based on their verified role.
 */
export function getRoleRedirectPath(role: UserRole | null | undefined): string {
  if (role === "admin") {
    return "/admin";
  }
  if (role === "citizen") {
    return "/dashboard";
  }
  return "/login";
}
