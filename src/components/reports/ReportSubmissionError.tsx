"use client";

import Link from "next/link";
import { AlertTriangle, AlertCircle, RotateCcw, ArrowRight } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ReportSubmissionErrorProps {
  error: {
    state: "error" | "outcome_unknown";
    message: string;
    code?: string;
  } | null;
  onRetry: () => void;
  isSubmitting?: boolean;
}

export function ReportSubmissionError({
  error,
  onRetry,
  isSubmitting = false,
}: ReportSubmissionErrorProps) {
  if (!error) return null;

  const isUnknown = error.state === "outcome_unknown";

  if (isUnknown) {
    return (
      <div
        className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-amber-900 dark:text-amber-200 space-y-3"
        role="alert"
        data-testid="submission-unknown-error"
      >
        <div className="flex items-start gap-3">
          <AlertTriangle className="size-5 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" aria-hidden="true" />
          <div className="space-y-1 text-xs">
            <p className="font-semibold text-sm">Submission Outcome Unknown</p>
            <p className="text-amber-800 dark:text-amber-300/90 leading-relaxed">
              A network disconnection occurred during submission. We could not confirm whether your complaint reached the server.
              To avoid filing an accidental duplicate ticket, please inspect your citizen dashboard before resubmitting.
            </p>
          </div>
        </div>

        <div className="pt-2 border-t border-amber-500/20 flex flex-col sm:flex-row items-center justify-end gap-2.5">
          <Link
            href="/dashboard"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }), "w-full sm:w-auto text-xs gap-1.5 border-amber-500/40 text-amber-900 dark:text-amber-200 hover:bg-amber-500/20")}
          >
            <span>Check My Dashboard</span>
            <ArrowRight className="size-3.5" aria-hidden="true" />
          </Link>

          <Button
            type="button"
            variant="default"
            size="sm"
            loading={isSubmitting}
            onClick={onRetry}
            className="w-full sm:w-auto text-xs gap-1.5"
          >
            <RotateCcw className="size-3.5" aria-hidden="true" />
            <span>Try Submitting Again</span>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-4 text-rose-900 dark:text-rose-200 space-y-3"
      role="alert"
      data-testid="submission-error-alert"
    >
      <div className="flex items-start gap-3">
        <AlertCircle className="size-5 shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" aria-hidden="true" />
        <div className="space-y-1 text-xs">
          <p className="font-semibold text-sm">Complaint Submission Unsuccessful</p>
          <p className="text-rose-800 dark:text-rose-300/90 leading-relaxed">
            {error.message}
          </p>
          <p className="text-[11px] text-muted-foreground pt-0.5">
            Your draft details and attached evidence have been preserved. You can retry submission below.
          </p>
        </div>
      </div>

      <div className="pt-2 border-t border-rose-500/20 flex items-center justify-end">
        <Button
          type="button"
          variant="outline"
          size="sm"
          loading={isSubmitting}
          onClick={onRetry}
          className="w-full sm:w-auto text-xs gap-1.5 border-rose-500/40 text-rose-900 dark:text-rose-200 hover:bg-rose-500/20"
        >
          <RotateCcw className="size-3.5" aria-hidden="true" />
          <span>Retry Submission</span>
        </Button>
      </div>
    </div>
  );
}
