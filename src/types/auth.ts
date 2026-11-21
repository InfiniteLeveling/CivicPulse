/**
 * Shared authentication and authorization types for CivicPulse.
 * Safe to import from both server and client components.
 */

export type ApplicationRole = "citizen" | "admin";

export interface UserProfile {
  id: string;
  full_name: string;
  role: ApplicationRole;
  created_at: string;
  updated_at: string;
}

export interface AuthenticatedUser {
  id: string;
  email?: string;
  full_name: string;
  role: ApplicationRole;
}

export interface AuthMeData {
  user: AuthenticatedUser;
}

export interface AuthSessionState {
  isAuthenticated: boolean;
  user: AuthenticatedUser | null;
}

export interface AuthLogoutData {
  loggedOut: boolean;
}
