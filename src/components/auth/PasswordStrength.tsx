"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";

interface PasswordStrengthProps {
  password?: string;
  className?: string;
}

interface StrengthResult {
  score: number; // 0 to 4
  label: string;
  colorClass: string;
}

function calculateStrength(password: string): StrengthResult {
  if (!password) {
    return { score: 0, label: "Enter a password", colorClass: "bg-muted" };
  }

  if (password.length < 8) {
    return { score: 1, label: "Too short (min 8 chars)", colorClass: "bg-destructive" };
  }

  let variations = 0;
  if (/[a-z]/.test(password)) variations++;
  if (/[A-Z]/.test(password)) variations++;
  if (/[0-9]/.test(password)) variations++;
  if (/[^a-zA-Z0-9]/.test(password)) variations++;

  if (password.length >= 12 && variations >= 3) {
    return { score: 4, label: "Strong passphrase", colorClass: "bg-emerald-600" };
  }

  if (password.length >= 10 && variations >= 3) {
    return { score: 3, label: "Good", colorClass: "bg-blue-600" };
  }

  if (variations >= 2) {
    return { score: 2, label: "Fair", colorClass: "bg-amber-500" };
  }

  return { score: 1, label: "Weak", colorClass: "bg-destructive" };
}

/**
 * Lightweight local password strength indicator for registration.
 * Explicitly disclaimed as a client-side heuristic.
 */
export function PasswordStrength({ password = "", className }: PasswordStrengthProps) {
  const { score, label, colorClass } = useMemo(
    () => calculateStrength(password),
    [password]
  );

  if (!password) {
    return null;
  }

  return (
    <div className={cn("grid gap-1.5 pt-1", className)} aria-live="polite">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">Password strength:</span>
        <span className="font-medium text-foreground">{label}</span>
      </div>

      <div
        className="grid grid-cols-4 gap-1.5"
        role="progressbar"
        aria-valuenow={score}
        aria-valuemin={0}
        aria-valuemax={4}
        aria-label={`Password strength: ${label}`}
      >
        {[1, 2, 3, 4].map((step) => (
          <div
            key={step}
            className={cn(
              "h-1.5 rounded-full transition-all duration-300",
              step <= score ? colorClass : "bg-muted"
            )}
          />
        ))}
      </div>

      <p className="text-[11px] text-muted-foreground">
        Local heuristic guideline. Use at least 8 characters with letters, numbers, and symbols.
      </p>
    </div>
  );
}
