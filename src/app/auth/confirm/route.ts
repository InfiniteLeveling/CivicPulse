import { type EmailOtpType } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { getSafeRedirectPath } from "@/lib/auth/redirects";

/**
 * Route handler for Supabase email confirmation, magic link, and PKCE verification.
 * Verifies the token on the server and sets SSR session cookies.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const code = searchParams.get("code");
  const next = getSafeRedirectPath(searchParams.get("next"), "/dashboard");

  if (!isSupabaseConfigured()) {
    return NextResponse.redirect(
      new URL("/login?error=not_configured", request.url)
    );
  }

  try {
    const supabase = await createClient();

    if (token_hash && type) {
      const { error } = await supabase.auth.verifyOtp({
        type,
        token_hash,
      });

      if (!error) {
        return NextResponse.redirect(new URL(next, request.url));
      }
    }

    if (code) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error) {
        return NextResponse.redirect(new URL(next, request.url));
      }
    }
  } catch {
    // If verification throws, redirect to login with verification_failed
  }

  return NextResponse.redirect(
    new URL("/login?error=verification_failed", request.url)
  );
}
