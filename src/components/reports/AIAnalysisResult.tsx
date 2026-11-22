"use client";

import { useState } from "react";
import {
  Sparkles,
  Check,
  AlertTriangle,
  RotateCcw,
  ArrowRight,
  Construction,
  Trash2,
  Droplets,
  Lightbulb,
  Waves,
  CircleHelp,
  ShieldAlert,
  type LucideIcon,
} from "lucide-react";
import type { AIClassifyResult, IssueCategory } from "@/types/domain";
import { CATEGORY_LABELS } from "@/lib/constants";
import { SeverityBadge } from "@/components/common/SeverityBadge";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface AIAnalysisResultProps {
  result: AIClassifyResult;
  hasExistingDescription: boolean;
  onApplySuggestions: (applyDescription: boolean) => void;
  onContinueManually: () => void;
  onRetry: () => void;
  disabled?: boolean;
}

const CATEGORY_ICONS: Record<IssueCategory, LucideIcon> = {
  pothole: Construction,
  garbage: Trash2,
  water_leakage: Droplets,
  streetlight: Lightbulb,
  drainage: Waves,
  other: CircleHelp,
};

export function AIAnalysisResult({
  result,
  hasExistingDescription,
  onApplySuggestions,
  onContinueManually,
  onRetry,
  disabled = false,
}: AIAnalysisResultProps) {
  const [applied, setApplied] = useState(false);
  const CategoryIcon = CATEGORY_ICONS[result.category] || CircleHelp;

  function handleApply(applyDescription: boolean) {
    setApplied(true);
    onApplySuggestions(applyDescription);
  }

  // Non-civic problem detection branch
  if (!result.isCivicIssue) {
    return (
      <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-5 space-y-4 animate-in fade-in-50 duration-200">
        <div className="flex items-start gap-3">
          <AlertTriangle className="size-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" aria-hidden="true" />
          <div className="space-y-1.5 text-xs">
            <p className="font-semibold text-sm text-amber-900 dark:text-amber-200">
              Non-Civic Issue Detected
            </p>
            <p className="text-amber-800 dark:text-amber-300/90 leading-relaxed">
              We couldn&apos;t confidently identify a civic infrastructure problem in this photograph.
              You can choose another image, retry the analysis, or proceed with manual complaint reporting.
            </p>
            {result.description && (
              <p className="italic text-amber-700 dark:text-amber-300/75 pt-1 text-[11px]">
                &ldquo;{result.description}&rdquo;
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-amber-500/20">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onRetry}
            disabled={disabled}
            className="text-xs gap-1.5 h-8 bg-background"
          >
            <RotateCcw className="size-3.5" aria-hidden="true" />
            <span>Retry Analysis</span>
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onContinueManually}
            disabled={disabled}
            className="text-xs gap-1.5 h-8 text-muted-foreground hover:text-foreground"
          >
            <span>Continue with Manual Details</span>
            <ArrowRight className="size-3.5" aria-hidden="true" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-primary/20 bg-card p-5 space-y-5 shadow-xs animate-in fade-in-50 duration-200">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 border-b border-border/60 pb-3">
        <div className="flex items-center gap-2">
          <span className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Sparkles className="size-4" aria-hidden="true" />
          </span>
          <div>
            <h3 className="text-sm font-semibold text-foreground">
              AI Analysis Suggestions
            </h3>
            <p className="text-[11px] text-muted-foreground">
              These are AI-generated suggestions. Please check them before continuing.
            </p>
          </div>
        </div>

        <Badge variant="outline" className="text-[10px] border-primary/30 text-primary">
          Gemini Suggestion
        </Badge>
      </div>

      {/* Suggested Fields Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
        {/* Suggested Category */}
        <div className="space-y-1.5 p-3 rounded-lg border border-border/70 bg-muted/20">
          <span className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider block">
            Suggested Category
          </span>
          <div className="flex items-center gap-2">
            <span className="flex size-6 items-center justify-center rounded-md bg-primary/10 text-primary">
              <CategoryIcon className="size-3.5" aria-hidden="true" />
            </span>
            <span className="font-semibold text-foreground text-sm">
              {CATEGORY_LABELS[result.category]}
            </span>
          </div>
        </div>

        {/* Suggested Severity */}
        <div className="space-y-1.5 p-3 rounded-lg border border-border/70 bg-muted/20">
          <span className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider block">
            Suggested Severity
          </span>
          <div className="flex items-center gap-2">
            <SeverityBadge severity={result.severity} source="ai" />
          </div>
        </div>
      </div>

      {/* Advisory Severity Notice */}
      <p className="text-[11px] text-muted-foreground leading-relaxed">
        <strong>Advisory Notice:</strong> AI-suggested severity is assistive only. Official severity and dispatch priority will be determined during administrative triage.
      </p>

      {/* Critical Safety Notice if Severity is Critical */}
      {result.severity === "critical" && (
        <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-900 dark:text-rose-200 flex items-start gap-2.5">
          <ShieldAlert className="size-4 shrink-0 text-rose-600 dark:text-rose-400 mt-0.5" aria-hidden="true" />
          <p className="text-[11px] leading-relaxed">
            <strong>Emergency Reminder:</strong> If this situation presents an immediate threat to life, health, or public safety, please call emergency services (112 / 911) immediately. CivicPulse does not provide emergency dispatch services.
          </p>
        </div>
      )}

      {/* Suggested Description */}
      <div className="space-y-1.5">
        <span className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider block">
          Suggested Description
        </span>
        <div className="rounded-lg bg-muted/30 border border-border/70 p-3 text-xs text-foreground/90 leading-relaxed">
          {result.description}
        </div>
      </div>

      {/* Action Controls */}
      <div className="pt-2 border-t border-border/60 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {hasExistingDescription ? (
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full">
            <Button
              type="button"
              variant="default"
              size="sm"
              onClick={() => handleApply(false)}
              disabled={disabled || applied}
              className="text-xs gap-1.5 h-9"
            >
              <Check className="size-3.5" aria-hidden="true" />
              <span>Use Suggestions (Keep My Description)</span>
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleApply(true)}
              disabled={disabled || applied}
              className="text-xs gap-1.5 h-9"
            >
              <span>Use Suggestions (Replace Description)</span>
            </Button>
          </div>
        ) : (
          <Button
            type="button"
            variant="default"
            size="sm"
            onClick={() => handleApply(true)}
            disabled={disabled || applied}
            className="text-xs gap-1.5 h-9"
          >
            <Check className="size-3.5" aria-hidden="true" />
            <span>{applied ? "Suggestions Applied" : "Use Suggestions"}</span>
          </Button>
        )}

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onContinueManually}
          disabled={disabled}
          className="text-xs gap-1.5 text-muted-foreground hover:text-foreground h-9"
        >
          <span>Continue Manually</span>
          <ArrowRight className="size-3.5" aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}
