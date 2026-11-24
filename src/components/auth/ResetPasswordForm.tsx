"use client";

import { useState } from "react";
import Link from "next/link";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { ArrowRight, CheckCircle2, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/auth/PasswordInput";
import { PasswordStrength } from "@/components/auth/PasswordStrength";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";

const resetSchema = z
  .object({
    password: z
      .string()
      .min(8, "Password must be at least 8 characters long.")
      .max(72, "Password must be 72 characters or fewer."),
    confirmPassword: z.string().min(1, "Please confirm your new password."),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

type ResetValues = z.infer<typeof resetSchema>;

export function ResetPasswordForm() {
  const [submitting, setSubmitting] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const router = useRouter();

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<ResetValues>({
    resolver: zodResolver(resetSchema),
    defaultValues: { password: "", confirmPassword: "" },
    mode: "onTouched",
  });

  const passwordValue = useWatch({
    control,
    name: "password",
    defaultValue: "",
  });

  async function onSubmit(values: ResetValues) {
    setSubmitting(true);
    setFeedback(null);

    if (!isSupabaseConfigured()) {
      setSubmitting(false);
      const msg = "Authentication service is temporarily unavailable.";
      setFeedback(msg);
      toast.error("Unavailable", { description: msg });
      return;
    }

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({
        password: values.password,
      });

      setSubmitting(false);

      if (error) {
        const msg = error.message || "Unable to update your password. Request a new reset link.";
        setFeedback(msg);
        toast.error("Password Update Failed", { description: msg });
        return;
      }

      setCompleted(true);
      toast.success("Password Updated", {
        description: "Your password has been changed successfully.",
      });
      router.push("/dashboard" as Route);
      router.refresh();
    } catch (err: unknown) {
      setSubmitting(false);
      const msg = err instanceof Error ? err.message : "An unexpected error occurred.";
      setFeedback(msg);
      toast.error("Error", { description: msg });
    }
  }

  if (completed) {
    return (
      <div className="space-y-4 text-center py-4">
        <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600">
          <CheckCircle2 className="size-6" aria-hidden="true" />
        </div>
        <div className="space-y-1">
          <p className="text-base font-semibold text-foreground">Password Updated</p>
          <p className="text-xs text-muted-foreground">
            Redirecting you to your dashboard...
          </p>
        </div>
        <Link href="/dashboard" className="text-xs font-medium text-primary hover:underline">
          Continue to Dashboard
        </Link>
      </div>
    );
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
          <p>{feedback}</p>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="grid gap-4">
        <div className="grid gap-1.5">
          <label htmlFor="reset-password" className="text-sm font-medium text-foreground">
            New Password <span aria-hidden="true" className="text-destructive">*</span>
          </label>
          <PasswordInput
            id="reset-password"
            autoComplete="new-password"
            disabled={submitting}
            aria-invalid={errors.password ? "true" : undefined}
            aria-describedby={errors.password ? "reset-password-error" : undefined}
            placeholder="At least 8 characters"
            {...register("password")}
          />
          {errors.password && (
            <p id="reset-password-error" role="alert" className="text-xs font-medium text-destructive">
              {errors.password.message}
            </p>
          )}
          <PasswordStrength password={passwordValue} />
        </div>

        <div className="grid gap-1.5">
          <label htmlFor="reset-confirm-password" className="text-sm font-medium text-foreground">
            Confirm New Password <span aria-hidden="true" className="text-destructive">*</span>
          </label>
          <PasswordInput
            id="reset-confirm-password"
            autoComplete="new-password"
            disabled={submitting}
            aria-invalid={errors.confirmPassword ? "true" : undefined}
            aria-describedby={errors.confirmPassword ? "reset-confirm-error" : undefined}
            placeholder="Re-enter your new password"
            {...register("confirmPassword")}
          />
          {errors.confirmPassword && (
            <p id="reset-confirm-error" role="alert" className="text-xs font-medium text-destructive">
              {errors.confirmPassword.message}
            </p>
          )}
        </div>

        <Button type="submit" loading={submitting} className="mt-2 w-full font-medium">
          Update Password <ArrowRight className="size-4" aria-hidden="true" />
        </Button>
      </form>

      <div className="border-t border-border pt-4 text-center text-sm text-muted-foreground">
        Remembered your password?{" "}
        <Link href="/login" className="font-medium text-primary hover:text-primary-hover hover:underline">
          Back to Sign In
        </Link>
      </div>
    </div>
  );
}
