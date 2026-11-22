"use client";

import { ThumbsUp, MapPin, CheckCircle2 } from "lucide-react";
import type { DuplicateCandidate } from "@/types/domain";
import { CATEGORY_LABELS } from "@/lib/constants";
import { formatDistance, formatSupportCount } from "@/lib/validation/duplicates";
import { StatusBadge } from "@/components/common/StatusBadge";
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

interface DuplicateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  candidate: DuplicateCandidate | null;
  onConfirmSupport: (candidate: DuplicateCandidate) => Promise<void> | void;
  isSupporting?: boolean;
}

export function DuplicateDialog({
  open,
  onOpenChange,
  candidate,
  onConfirmSupport,
  isSupporting = false,
}: DuplicateDialogProps) {
  if (!candidate) return null;

  const categoryLabel = CATEGORY_LABELS[candidate.category] || candidate.category;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-lg">
        <AlertDialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <ThumbsUp className="size-4" aria-hidden="true" />
            </span>
            <AlertDialogTitle className="text-base sm:text-lg">
              Support Existing Complaint?
            </AlertDialogTitle>
          </div>
          <AlertDialogDescription className="text-xs sm:text-sm text-left">
            Adding your support directly boosts this complaint&apos;s priority in the municipal queue, helping repair crews respond faster while preventing redundant tickets.
          </AlertDialogDescription>
        </AlertDialogHeader>

        {/* Candidate Detail Card */}
        <div className="rounded-xl border border-border bg-muted/30 p-3.5 space-y-2.5 text-left text-xs">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-semibold bg-background px-2 py-0.5 rounded border border-border">
                {candidate.reference}
              </span>
              <Badge variant="outline" className="text-[10px] font-normal">
                {categoryLabel}
              </Badge>
              <StatusBadge status={candidate.status} />
            </div>

            <span className="inline-flex items-center gap-1 text-muted-foreground text-[11px]">
              <MapPin className="size-3" aria-hidden="true" />
              <span>{formatDistance(candidate.distanceMeters)}</span>
            </span>
          </div>

          <p className="text-sm font-semibold text-foreground">
            {candidate.title}
          </p>

          <div className="flex items-center gap-2 pt-1 border-t border-border/50 text-[11px] text-muted-foreground">
            <ThumbsUp className="size-3 text-primary" aria-hidden="true" />
            <span>Currently supported by {formatSupportCount(candidate.supportCount)}</span>
          </div>
        </div>

        {/* Informational Guidance */}
        <div className="rounded-lg bg-primary/5 border border-primary/20 p-3 text-xs text-foreground/90 space-y-1.5 text-left">
          <p className="font-semibold text-primary flex items-center gap-1.5">
            <CheckCircle2 className="size-3.5" aria-hidden="true" />
            <span>What happens when you support:</span>
          </p>
          <ul className="list-disc pl-4 space-y-1 text-muted-foreground text-[11px]">
            <li>This complaint receives an additional community priority point.</li>
            <li>City authorities see heightened citizen demand at this location.</li>
            <li>No duplicate ticket is created, keeping city maintenance queues clean.</li>
            <li>You can track this issue&apos;s progress in your citizen dashboard.</li>
          </ul>
        </div>

        <AlertDialogFooter className="flex-col-reverse sm:flex-row gap-2">
          <Button
            type="button"
            variant="outline"
            size="default"
            disabled={isSupporting}
            onClick={() => onOpenChange(false)}
            className="w-full sm:w-auto text-xs"
          >
            Keep Writing My Report
          </Button>

          <Button
            type="button"
            variant="default"
            size="default"
            loading={isSupporting}
            onClick={() => onConfirmSupport(candidate)}
            className="w-full sm:w-auto text-xs gap-1.5 font-medium shadow-xs"
          >
            <ThumbsUp className="size-3.5" aria-hidden="true" />
            <span>Confirm &amp; Support Issue</span>
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
