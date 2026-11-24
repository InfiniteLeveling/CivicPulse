"use client";

import { useState } from "react";
import Link from "next/link";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { ArrowRight, Info, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/auth/PasswordInput";
import { PasswordStrength } from "@/components/auth/PasswordStrength";
import { OAuthProviders } from "@/components/auth/OAuthProviders";
import { registerSchema, type RegisterFormValues } from "@/lib/validation/auth";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";

export function RegisterForm() {
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const router = useRouter();

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      fullName: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
    mode: "onTouched",
  });

  const passwordValue = useWatch({
    control,
    name: "password",
    defaultValue: "",
  });

  async function onSubmit(values: RegisterFormValues) {
    setSubmitting(true);
    setFeedback(null);

    if (!isSupabaseConfigured()) {
      setSubmitting(false);
      const notice =
        "Registration is temporarily unavailable. Please try again later.";
      setFeedback(notice);
      toast.error("Registration Unavailable", {
        description: notice,
        duration: 6000,
      });
      return;
    }

    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signUp({
        email: values.email,
        password: values.password,
        options: {
          data: {
            full_name: values.fullName,
            // SECURITY: Never supply role: "admin"
          },
          emailRedirectTo: `${window.location.origin}/auth/confirm?type=signup`,
        },
      });

      setSubmitting(false);

      if (error) {
        let userMessage = error.message;
        const errLower = userMessage.toLowerCase();
        if (
          errLower.includes("already registered") ||
          errLower.includes("user already exists")
        ) {
          userMessage = "An account with this email address already exists.";
        }
        setFeedback(userMessage);
        toast.error("Registration Failed", { description: userMessage });
        return;
      }

      if (data.user && !data.session) {
        // Email confirmation required by Supabase configuration
        const notice =
          "Account created! Please check your email to verify your account.";
        setFeedback(notice);
        toast.success("Verification Required", {
          description: notice,
          duration: 8000,
        });
      } else if (data.session) {
        // Auto-login when confirmation is disabled
        toast.success("Welcome to CivicPulse!", {
          description: "Account created successfully.",
        });
        router.push("/dashboard" as Route);
        router.refresh();
      }
    } catch (err: unknown) {
      setSubmitting(false);
      const msg =
        err instanceof Error ? err.message : "An unexpected error occurred.";
      setFeedback(msg);
      toast.error("Registration Error", { description: msg });
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
            <p className="font-semibold text-blue-950">Registration Notice</p>
            <p className="mt-0.5">{feedback}</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="grid gap-4">
        {/* Full Name Field */}
        <div className="grid gap-1.5">
          <label htmlFor="register-name" className="text-sm font-medium text-foreground">
            Full Name <span aria-hidden="true" className="text-destructive">*</span>
          </label>
          <Input
            id="register-name"
            type="text"
            autoComplete="name"
            disabled={submitting}
            aria-invalid={errors.fullName ? "true" : undefined}
            aria-describedby={errors.fullName ? "register-name-error" : undefined}
            placeholder="Enter your full name"
            {...register("fullName")}
          />
          {errors.fullName && (
            <p id="register-name-error" role="alert" className="text-xs font-medium text-destructive">
              {errors.fullName.message}
            </p>
          )}
        </div>

        {/* Email Address Field */}
        <div className="grid gap-1.5">
          <label htmlFor="register-email" className="text-sm font-medium text-foreground">
            Email Address <span aria-hidden="true" className="text-destructive">*</span>
          </label>
          <Input
            id="register-email"
            type="email"
            autoComplete="email"
            disabled={submitting}
            aria-invalid={errors.email ? "true" : undefined}
            aria-describedby={errors.email ? "register-email-error" : undefined}
            placeholder="you@example.com"
            {...register("email")}
          />
          {errors.email && (
            <p id="register-email-error" role="alert" className="text-xs font-medium text-destructive">
              {errors.email.message}
            </p>
          )}
        </div>

        {/* Password Field */}
        <div className="grid gap-1.5">
          <label htmlFor="register-password" className="text-sm font-medium text-foreground">
            Password <span aria-hidden="true" className="text-destructive">*</span>
          </label>
          <PasswordInput
            id="register-password"
            autoComplete="new-password"
            disabled={submitting}
            aria-invalid={errors.password ? "true" : undefined}
            aria-describedby={errors.password ? "register-password-error" : undefined}
            placeholder="At least 8 characters"
            {...register("password")}
          />
          {errors.password && (
            <p id="register-password-error" role="alert" className="text-xs font-medium text-destructive">
              {errors.password.message}
            </p>
          )}
          {/* Password Strength Indicator */}
          <PasswordStrength password={passwordValue} />
        </div>

        {/* Confirm Password Field */}
        <div className="grid gap-1.5">
          <label htmlFor="register-confirm-password" className="text-sm font-medium text-foreground">
            Confirm Password <span aria-hidden="true" className="text-destructive">*</span>
          </label>
          <PasswordInput
            id="register-confirm-password"
            autoComplete="new-password"
            disabled={submitting}
            aria-invalid={errors.confirmPassword ? "true" : undefined}
            aria-describedby={errors.confirmPassword ? "register-confirm-password-error" : undefined}
            placeholder="Re-enter your password"
            {...register("confirmPassword")}
          />
          {errors.confirmPassword && (
            <p
              id="register-confirm-password-error"
              role="alert"
              className="text-xs font-medium text-destructive"
            >
              {errors.confirmPassword.message}
            </p>
          )}
        </div>

        {/* Prototype Privacy & Security Notice */}
        <div className="rounded-md border border-border bg-muted/40 p-3 text-xs text-muted-foreground leading-normal">
          <div className="flex items-center gap-1.5 font-medium text-foreground">
            <Shield className="size-3.5 text-primary" aria-hidden="true" />
            <span>Citizen Account Policy</span>
          </div>
          <p className="mt-1">
            Public accounts are registered as citizen reporters with strict privacy and role protections.
          </p>
        </div>

        {/* Submit Button */}
        <Button
          type="submit"
          loading={submitting}
          className="mt-2 w-full font-medium"
        >
          Create Account <ArrowRight className="size-4" aria-hidden="true" />
        </Button>
      </form>

      <OAuthProviders
        mode="register"
        disabled={submitting}
        onError={(msg) => setFeedback(msg)}
      />

      {/* Switch to Login */}
      <div className="border-t border-border pt-4 text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link
          href="/login"
          className="font-medium text-primary hover:text-primary-hover hover:underline"
        >
          Sign In
        </Link>
      </div>
    </div>
  );
}
