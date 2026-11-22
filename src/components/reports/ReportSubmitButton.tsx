"use client";

import { Send, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ReportSubmitButtonProps {
  isSubmitting: boolean;
  readinessErrors: string[];
  onClick: () => void;
  className?: string;
}

export function ReportSubmitButton({
  isSubmitting,
  readinessErrors,
  onClick,
  className,
}: ReportSubmitButtonProps) {
  const isReady = readinessErrors.length === 0;

  return (
    <div className={cn("space-y-1.5", className)}>
      <Button
        type="button"
        variant="default"
        size="default"
        disabled={!isReady || isSubmitting}
        loading={isSubmitting}
        onClick={onClick}
        className={cn(
          "w-full sm:w-auto gap-2 font-medium shadow-sm",
          !isReady && "opacity-60 cursor-not-allowed"
        )}
        data-testid="report-submit-button"
      >
        <Send className="size-4" aria-hidden="true" />
        <span>{isSubmitting ? "Submitting your complaint..." : "Submit Complaint"}</span>
      </Button>

      {!isReady && !isSubmitting && (
        <div
          className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400"
          role="status"
          aria-live="polite"
        >
          <AlertCircle className="size-3.5 shrink-0" aria-hidden="true" />
          <span>{readinessErrors[0]}</span>
        </div>
      )}
    </div>
  );
}
