"use client";

import { useState } from "react";
import Link from "next/link";
import type { Route } from "next";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { ArrowRight, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/auth/PasswordInput";
import { OAuthProviders } from "@/components/auth/OAuthProviders";
import { loginSchema, type LoginFormValues } from "@/lib/validation/auth";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { getSafeRedirectPath } from "@/lib/auth/redirects";

export function LoginForm() {
  const [submitting, setSubmitting] = useState(false);
  const searchParams = useSearchParams();
  const initialError = (() => {
    const errCode = searchParams.get("error");
    const errDesc = searchParams.get("error_description");
    if (errDesc) return errDesc;
    if (errCode === "verification_failed") {
      return "Verification link invalid or expired. Please sign in or request a new link.";
    }
    if (errCode === "oauth_failed") {
      return "Social sign-in was cancelled or could not be completed. Please try again.";
    }
    if (errCode === "not_configured") {
      return "Authentication service is temporarily unavailable.";
    }
    return null;
  })();
  const [feedback, setFeedback] = useState<string | null>(initialError);

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
    mode: "onTouched",
  });

  async function onSubmit(values: LoginFormValues) {
    setSubmitting(true);
    setFeedback(null);

    if (!isSupabaseConfigured()) {
      setSubmitting(false);
      const notice =
        "Authentication service is temporarily unavailable. Please try again later.";
      setFeedback(notice);
      toast.error("Sign In Unavailable", {
        description: notice,
        duration: 6000,
      });
      return;
    }

    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signInWithPassword({
        email: values.email,
        password: values.password,
      });

      if (error) {
        setSubmitting(false);
        let userMessage = "Invalid email or password. Please try again.";
        const errLower = error.message.toLowerCase();
        if (errLower.includes("email not confirmed")) {
          userMessage = "Please verify your email address before signing in.";
        } else if (
          errLower.includes("rate limit") ||
          errLower.includes("too many requests")
        ) {
          userMessage =
            "Too many failed attempts. Please wait a moment and try again.";
        }
        setFeedback(userMessage);
        toast.error("Sign In Failed", { description: userMessage });
        return;
      }

      toast.success("Welcome back!", {
        description: "Signed in successfully.",
      });

      // Query role to determine landing destination
      let destination = "/dashboard";
      try {
        await supabase.rpc("civicpulse_ensure_profile");
      } catch {
        // Non-fatal
      }
      try {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", data.user.id)
          .maybeSingle();

        if (profile?.role === "admin") {
          destination = "/admin";
        }
      } catch {
        // Safe failover to citizen dashboard
      }

      const nextParam = searchParams.get("next") ?? searchParams.get("redirectTo");
      if (nextParam) {
        destination = getSafeRedirectPath(nextParam, destination);
      }

      window.location.assign(destination);
    } catch (err: unknown) {
      setSubmitting(false);
      const msg =
        err instanceof Error ? err.message : "An unexpected error occurred.";
      setFeedback(msg);
      toast.error("Authentication Error", { description: msg });
    }
  }

  async function handleForgotPassword() {
    const email = getValues("email");
    if (!email || errors.email) {
      toast.info("Password Recovery", {
        description:
          "Please enter your email address first, then click 'Forgot password?'.",
      });
      return;
    }

    if (!isSupabaseConfigured()) {
      toast.error("Unavailable", {
        description:
          "Password recovery is temporarily unavailable.",
      });
      return;
    }

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/confirm?type=recovery`,
      });
      if (error) {
        toast.error("Recovery Request Failed", { description: error.message });
      } else {
        toast.success("Check your email", {
          description:
            "If an account exists for this address, a password reset link has been sent.",
        });
      }
    } catch {
      toast.error("Recovery Request Failed", {
        description: "Unable to process recovery request.",
      });
    }
  }

  const nextParam = searchParams.get("next");

  return (
    <div className="grid gap-6">
      {nextParam?.startsWith("/report") && !feedback && (
        <div
          role="status"
          className="flex items-start gap-2.5 rounded-lg border border-blue-200 bg-blue-50/80 p-3.5 text-xs text-blue-900 leading-normal"
        >
          <Info className="size-4 shrink-0 text-blue-600 mt-0.5" aria-hidden="true" />
          <div>
            <p className="font-semibold text-blue-950">Reporting an Issue</p>
            <p className="mt-0.5">Sign in to submit your report and track its progress.</p>
          </div>
        </div>
      )}

      {feedback && (
        <div
          role="status"
          aria-live="polite"
          className="flex items-start gap-2.5 rounded-lg border border-blue-200 bg-blue-50/80 p-3.5 text-xs text-blue-900 leading-normal"
        >
          <Info className="size-4 shrink-0 text-blue-600 mt-0.5" aria-hidden="true" />
          <div>
            <p className="font-semibold text-blue-950">Authentication Notice</p>
            <p className="mt-0.5">{feedback}</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="grid gap-4">
        {/* Email Field */}
        <div className="grid gap-1.5">
          <label htmlFor="login-email" className="text-sm font-medium text-foreground">
            Email Address <span aria-hidden="true" className="text-destructive">*</span>
          </label>
          <Input
            id="login-email"
            type="email"
            autoComplete="email"
            disabled={submitting}
            aria-invalid={errors.email ? "true" : undefined}
            aria-describedby={errors.email ? "login-email-error" : undefined}
            placeholder="you@example.com"
            {...register("email")}
          />
          {errors.email && (
            <p id="login-email-error" role="alert" className="text-xs font-medium text-destructive">
              {errors.email.message}
            </p>
          )}
        </div>

        {/* Password Field */}
        <div className="grid gap-1.5">
          <div className="flex items-center justify-between">
            <label htmlFor="login-password" className="text-sm font-medium text-foreground">
              Password <span aria-hidden="true" className="text-destructive">*</span>
            </label>
            <button
              type="button"
              onClick={handleForgotPassword}
              className="text-xs text-primary hover:text-primary-hover hover:underline outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
            >
              Forgot password?
            </button>
          </div>
          <PasswordInput
            id="login-password"
            autoComplete="current-password"
            disabled={submitting}
            aria-invalid={errors.password ? "true" : undefined}
            aria-describedby={errors.password ? "login-password-error" : undefined}
            placeholder="••••••••"
            {...register("password")}
          />
          {errors.password && (
            <p id="login-password-error" role="alert" className="text-xs font-medium text-destructive">
              {errors.password.message}
            </p>
          )}
        </div>

        {/* Submit Button */}
        <Button
          type="submit"
          loading={submitting}
          className="mt-2 w-full font-medium"
        >
          Sign In <ArrowRight className="size-4" aria-hidden="true" />
        </Button>
      </form>

      <OAuthProviders
        mode="login"
        nextPath={searchParams.get("next")}
        disabled={submitting}
        onError={(msg) => setFeedback(msg)}
      />

      {/* Switch to Registration */}
      <div className="border-t border-border pt-4 text-center text-sm text-muted-foreground">
        Don&apos;t have an account?{" "}
        <Link
          href={nextParam ? (`/register?next=${encodeURIComponent(nextParam)}` as Route) : "/register"}
          className="font-medium text-primary hover:text-primary-hover hover:underline"
        >
          Create an Account
        </Link>
      </div>
    </div>
  );
}
