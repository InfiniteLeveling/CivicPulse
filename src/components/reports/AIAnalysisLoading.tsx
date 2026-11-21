"use client";

import { Loader2, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AIAnalysisLoadingProps {
  onCancel?: () => void;
}

export function AIAnalysisLoading({ onCancel }: AIAnalysisLoadingProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="rounded-xl border border-primary/30 bg-primary/5 p-5 text-center space-y-4 animate-in fade-in-50 duration-200"
    >
      <div className="flex flex-col items-center justify-center gap-2">
        <div className="relative flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Loader2 className="size-5 animate-spin motion-reduce:animate-none" aria-hidden="true" />
          <Sparkles className="absolute -top-1 -right-1 size-3.5 text-primary" aria-hidden="true" />
        </div>
        <p className="text-sm font-semibold text-foreground">
          Analyzing your photograph...
        </p>
        <p className="text-xs text-muted-foreground max-w-sm">
          CivicPulse is analyzing the image to suggest issue classification and a problem summary. This may take a moment.
        </p>
      </div>

      {onCancel && (
        <div className="pt-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onCancel}
            className="text-xs text-muted-foreground hover:text-foreground gap-1.5 h-8"
          >
            <X className="size-3.5" aria-hidden="true" />
            <span>Cancel Analysis</span>
          </Button>
        </div>
      )}
    </div>
  );
}
