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

  const defaultRedirect = type === "recovery" ? "/reset-password" : "/dashboard";
  const redirectPath = sanitizeRedirectUrl(next, defaultRedirect);

  if (!isSupabaseConfigured()) {
    return NextResponse.redirect(
      new URL("/login?error=not_configured", request.url)
    );
  }

  try {
    const responseHeaders = new Headers();
    const supabase = await createSupabaseServerClient(responseHeaders);

    // 1. Verify OTP using token_hash (standard email confirmation / recovery)
    if (token_hash && type) {
      const { error } = await supabase.auth.verifyOtp({
        type,
        token_hash,
      });

      if (!error) {
        const redirectUrl = new URL(redirectPath, request.url);
        const res = NextResponse.redirect(redirectUrl);
        responseHeaders.forEach((val, key) => res.headers.append(key, val));
        return res;
      }

      logger.warn("auth.callback_failed");
    }

    // 2. PKCE code exchange if code parameter is present
    if (code) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);

      if (!error) {
        const redirectUrl = new URL(redirectPath, request.url);
        const res = NextResponse.redirect(redirectUrl);
        responseHeaders.forEach((val, key) => res.headers.append(key, val));
        return res;
      }

      logger.warn("auth.callback_failed");
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
