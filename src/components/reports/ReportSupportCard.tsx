"use client";

import { useState } from "react";
import Link from "next/link";
import { ThumbsUp, CheckCircle2, Lock, ShieldAlert, LogIn, Loader2 } from "lucide-react";
import type { ComplaintSummary } from "@/types/domain";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface ReportSupportCardProps {
  report: ComplaintSummary;
  isAuthenticated: boolean;
  onSupport: () => Promise<void>;
}

export function ReportSupportCard({
  report,
  isAuthenticated,
  onSupport,
}: ReportSupportCardProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isPublic = report.visibility === "public";
  const isResolved = report.status === "resolved";
  const hasSupported = report.viewerHasSupported;

  const handleSupportClick = async () => {
    if (isSubmitting || hasSupported || isResolved || !isPublic) return;

    setIsSubmitting(true);
    setError(null);

    try {
      await onSupport();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to record support.";
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="border-border shadow-xs">
      <CardHeader className="pb-3">
        <h2 className="text-base font-semibold text-foreground flex items-center justify-between">
          <span className="flex items-center gap-2">
            <ThumbsUp className="size-4 text-primary" aria-hidden="true" />
            <span>Community Support</span>
          </span>
          <span className="inline-flex items-center gap-1.5 font-bold text-sm text-foreground bg-primary/10 text-primary px-2.5 py-0.5 rounded-full tabular-nums">
            <ThumbsUp className="size-3.5" aria-hidden="true" />
            <span>{report.supportCount}</span>
          </span>
        </h2>
        <p className="text-xs text-muted-foreground">
          Community endorsements demonstrate urgency and impact to city authorities.
        </p>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Support States */}
        {!isPublic ? (
          <div className="flex items-start gap-2.5 p-3 rounded-lg bg-muted/40 border border-border/60 text-xs text-muted-foreground">
            <Lock className="size-4 shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <p className="font-medium text-foreground">Community Support Unavailable</p>
              <p className="text-[11px] leading-relaxed">
                This report is marked private and cannot be viewed or endorsed publicly.
              </p>
            </div>
          </div>
        ) : isResolved ? (
          <div className="flex items-start gap-2.5 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-800 dark:text-emerald-300">
            <CheckCircle2 className="size-4 shrink-0 mt-0.5 text-emerald-600" aria-hidden="true" />
            <div>
              <p className="font-semibold text-emerald-950 dark:text-emerald-100">Support Closed</p>
              <p className="text-[11px] leading-relaxed">
                This issue has already been resolved and is closed for new endorsements.
              </p>
            </div>
          </div>
        ) : hasSupported ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-800 dark:text-emerald-300">
              <CheckCircle2 className="size-4 shrink-0 text-emerald-600" aria-hidden="true" />
              <span className="font-medium">You have supported this issue</span>
            </div>
            <Button
              type="button"
              variant="outline"
              disabled
              className="w-full text-xs h-9 gap-1.5 opacity-90 cursor-not-allowed bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
            >
              <CheckCircle2 className="size-3.5 text-emerald-600" aria-hidden="true" />
              <span>Supported</span>
            </Button>
          </div>
        ) : !isAuthenticated ? (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground leading-relaxed">
              Support this report if the same issue affects you in your neighborhood.
            </p>
            <Link
              href={`/login?next=/reports/${encodeURIComponent(report.id)}`}
              className={cn(
                buttonVariants({ variant: "outline", size: "default" }),
                "w-full text-xs h-9 gap-1.5 font-medium"
              )}
            >
              <LogIn className="size-3.5" aria-hidden="true" />
              <span>Sign In to Support</span>
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            <Button
              type="button"
              variant="default"
              size="default"
              disabled={isSubmitting}
              onClick={handleSupportClick}
              className="w-full text-xs h-9 gap-2 shadow-xs font-semibold"
              data-testid="support-issue-btn"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
                  <span>Recording Support...</span>
                </>
              ) : (
                <>
                  <ThumbsUp className="size-3.5" aria-hidden="true" />
                  <span>Support This Issue</span>
                </>
              )}
            </Button>
            <p className="text-[11px] text-muted-foreground text-center">
              I face this problem too — support this report to help prioritize repairs. Each citizen may endorse once.
            </p>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="p-2.5 rounded-lg bg-destructive/10 border border-destructive/20 text-xs text-destructive flex items-start gap-1.5">
            <ShieldAlert className="size-3.5 shrink-0 mt-0.5" aria-hidden="true" />
            <span className="leading-snug">{error}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
