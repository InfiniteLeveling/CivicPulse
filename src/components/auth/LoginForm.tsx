"use client";

import { useState } from "react";
import Link from "next/link";
import type { Route } from "next";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { ArrowRight, Info, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/auth/PasswordInput";
import { loginSchema, type LoginFormValues } from "@/lib/validation/auth";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { getSafeRedirectPath } from "@/lib/auth/redirects";

export function LoginForm() {
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();

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
        "Supabase credentials are required in .env.local to authenticate. Please configure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.";
      setFeedback(notice);
      toast.error("Configuration Required", {
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

      const nextParam = searchParams.get("next");
      if (nextParam) {
        destination = getSafeRedirectPath(nextParam, destination);
      }

      router.push(destination as Route);
      router.refresh();
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
      toast.error("Configuration Required", {
        description:
          "Supabase credentials are required to dispatch password reset emails.",
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

  return (
    <div className="grid gap-6">
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

      {searchParams.get("next")?.includes("/report") && (
        <div className="flex items-center gap-2.5 rounded-lg border border-primary/25 bg-primary/5 p-3.5 text-xs text-primary leading-snug">
          <FileText className="size-4 shrink-0 text-primary" aria-hidden="true" />
          <span>
            Sign in to submit your report and track its progress in real-time.
          </span>
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

      {/* Switch to Registration */}
      <div className="border-t border-border pt-4 text-center text-sm text-muted-foreground">
        Don&apos;t have an account?{" "}
        <Link
          href="/register"
          className="font-medium text-primary hover:text-primary-hover hover:underline"
        >
          Create an Account
        </Link>
      </div>
    </div>
  );
}
