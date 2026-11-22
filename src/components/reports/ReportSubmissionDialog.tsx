"use client";

import { Send, Eye, Lock, ShieldCheck } from "lucide-react";
import type { ReportVisibility } from "@/types/domain";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
} from "@/components/ui/alert-dialog";

interface ReportSubmissionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirmSubmit: () => void;
  isSubmitting: boolean;
  visibility: ReportVisibility;
  title: string;
  categoryLabel: string;
}

export function ReportSubmissionDialog({
  open,
  onOpenChange,
  onConfirmSubmit,
  isSubmitting,
  visibility,
  title,
  categoryLabel,
}: ReportSubmissionDialogProps) {
  const isPublic = visibility === "public";

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-lg" data-testid="report-submission-dialog">
        <AlertDialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Send className="size-4" aria-hidden="true" />
            </span>
            <AlertDialogTitle className="text-base sm:text-lg">
              Ready to Submit Your Report?
            </AlertDialogTitle>
          </div>
          <AlertDialogDescription className="text-xs sm:text-sm text-left">
            Your complaint details, photograph, and verified location will be recorded in the municipal queue for department triage.
          </AlertDialogDescription>
        </AlertDialogHeader>

        {/* Report Overview Capsule */}
        <div className="rounded-xl border border-border bg-muted/30 p-3.5 space-y-2 text-left text-xs">
          <div className="flex items-center justify-between gap-2">
            <Badge variant="outline" className="text-[10px] font-normal">
              {categoryLabel}
            </Badge>
            <Badge variant={isPublic ? "default" : "secondary"} className="text-[10px] font-normal">
              {isPublic ? "Community-Visible" : "Private Report"}
            </Badge>
          </div>

          <p className="text-sm font-semibold text-foreground line-clamp-1">
            {title}
          </p>
        </div>

        {/* Visibility & Privacy Disclosure */}
        <div className="rounded-xl border border-border/80 bg-card p-3.5 space-y-2 text-left text-xs">
          <div className="flex items-center gap-2 font-semibold text-foreground">
            {isPublic ? (
              <Eye className="size-4 text-primary shrink-0" aria-hidden="true" />
            ) : (
              <Lock className="size-4 text-muted-foreground shrink-0" aria-hidden="true" />
            )}
            <span>{isPublic ? "Public Visibility Notice" : "Private Visibility Notice"}</span>
          </div>

          <p className="text-muted-foreground text-[11px] leading-relaxed">
            {isPublic
              ? "Your report may appear in public civic listings and community maps according to platform publication rules. Neighbors will be able to see the problem location and endorse it to increase municipal priority."
              : "Your report is intended to be accessible only to you and authorized municipal administrators. It will not be displayed on public community maps or open civic listings."}
          </p>
        </div>

        <AlertDialogFooter className="flex-col-reverse sm:flex-row gap-2">
          <Button
            type="button"
            variant="outline"
            size="default"
            disabled={isSubmitting}
            onClick={() => onOpenChange(false)}
            className="w-full sm:w-auto text-xs"
          >
            Review Again
          </Button>

          <Button
            type="button"
            variant="default"
            size="default"
            loading={isSubmitting}
            onClick={onConfirmSubmit}
            className="w-full sm:w-auto text-xs gap-1.5 font-medium shadow-xs"
            data-testid="confirm-submit-dialog-btn"
          >
            <ShieldCheck className="size-4" aria-hidden="true" />
            <span>Confirm &amp; Submit</span>
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
