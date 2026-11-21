import type { EmailOtpType } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { sanitizeRedirectUrl } from "@/services/auth.service";
import { logger } from "@/utils/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Route handler for email verification and password recovery links.
 * Validates token_hash or code and redirects to an approved internal route.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const code = searchParams.get("code");
  const next = searchParams.get("next");

  const defaultRedirect = type === "recovery" ? "/reset-password" : "/dashboard";
  const redirectPath = sanitizeRedirectUrl(next, defaultRedirect);

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

  // Token or code invalid / expired - redirect safely to login with error indicator
  logger.warn("auth.token_invalid");
  const errorUrl = new URL("/login", request.url);
  errorUrl.searchParams.set("error", "invalid_or_expired_token");
  return NextResponse.redirect(errorUrl);
}
