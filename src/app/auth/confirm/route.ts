import { type EmailOtpType } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { logger } from "@/utils/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Route handler for email verification, password recovery, and PKCE code exchange.
 * Verifies the token on the server, sets SSR session cookies, and redirects.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const code = searchParams.get("code");
  const next = searchParams.get("next");
  const oauthError = searchParams.get("error");
  const oauthErrorDescription = searchParams.get("error_description");

  if (oauthError) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("error", "oauth_failed");
    if (oauthErrorDescription) {
      loginUrl.searchParams.set("error_description", oauthErrorDescription);
    }
    return NextResponse.redirect(loginUrl);
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.redirect(
      new URL("/login?error=not_configured", request.url)
    );
  }

  try {
    const responseHeaders = new Headers();
    const supabase = await createSupabaseServerClient(responseHeaders);
    let authenticated = false;

    // 1. Verify OTP using token_hash (standard email confirmation / recovery)
    if (token_hash && type) {
      const { error } = await supabase.auth.verifyOtp({
        type,
        token_hash,
      });

      if (!error) {
        authenticated = true;
      } else {
        logger.warn("auth.callback_failed");
      }
    }

    // 2. PKCE code exchange for OAuth logins and magic links
    if (!authenticated && code) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);

      if (!error) {
        authenticated = true;
      } else {
        logger.warn("auth.callback_failed");
      }
    }

    if (authenticated) {
      // Ensure a profile row exists (handles first-time OAuth users gracefully)
      let defaultRedirect = type === "recovery" ? "/reset-password" : "/dashboard";
      if (type !== "recovery") {
        try {
          await supabase.rpc("civicpulse_ensure_profile");
        } catch {
          // Non-fatal if RPC is unavailable or trigger already provisioned the profile
        }

        const { data: userData } = await supabase.auth.getUser();
        if (userData?.user) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("role")
            .eq("id", userData.user.id)
            .maybeSingle();

          if (profile?.role === "admin") {
            defaultRedirect = "/admin";
          }
        }
      }

      const redirectPath = sanitizeRedirectUrl(next, defaultRedirect);
      const redirectUrl = new URL(redirectPath, request.url);
      const res = NextResponse.redirect(redirectUrl);
      responseHeaders.forEach((val, key) => res.headers.append(key, val));
      return res;
    }
  } catch {
    // If verification throws, redirect to login with verification_failed
  }

  // Token or code invalid / expired
  logger.warn("auth.token_invalid");
  return NextResponse.redirect(
    new URL("/login?error=verification_failed", request.url)
  );
}

/**
 * Sanitizes a client-provided redirect URL to prevent open redirect attacks.
 * Returns only internal relative paths starting with /.
 */
function sanitizeRedirectUrl(raw: string | null, fallback: string): string {
  if (!raw || typeof raw !== "string") return fallback;
  const trimmed = raw.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) return fallback;
  if (trimmed.includes("..")) return fallback;
  return trimmed;
}
