"use client";

import { AlertCircle, RotateCcw, CheckCircle2, ShieldCheck } from "lucide-react";
import type { DuplicateCandidate } from "@/types/domain";
import { DuplicateCandidateCard } from "./DuplicateCandidateCard";
import { Button } from "@/components/ui/button";

interface DuplicateCandidatesListProps {
  candidates: DuplicateCandidate[];
  onSelectSameIssue: (candidate: DuplicateCandidate) => void;
  onConfirmSeparate: () => void;
  onRecheck: () => void;
  supportedCandidateId?: string | null;
  isSeparateConfirmed?: boolean;
  disabled?: boolean;
}

export function DuplicateCandidatesList({
  candidates,
  onSelectSameIssue,
  onConfirmSeparate,
  onRecheck,
  supportedCandidateId = null,
  isSeparateConfirmed = false,
  disabled = false,
}: DuplicateCandidatesListProps) {
  return (
    <div className="space-y-4 animate-in fade-in-50 duration-200" data-testid="duplicate-candidates-list">
      {/* Alert Header */}
      <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-amber-900 dark:text-amber-200 flex items-start gap-3">
        <AlertCircle className="size-5 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" aria-hidden="true" />
        <div className="space-y-1 text-xs">
          <p className="font-semibold text-sm">
            {candidates.length} Nearby Report{candidates.length === 1 ? "" : "s"} Found
          </p>
          <p className="text-amber-800 dark:text-amber-300/90 leading-relaxed">
            We found {candidates.length} existing civic issue{candidates.length === 1 ? "" : "s"} reported near your confirmed location.
            If your problem is already listed, supporting it helps municipal teams prioritize the location faster than submitting a duplicate.
          </p>
        </div>
      </div>

      {/* Candidate Cards */}
      <div className="space-y-2.5" role="region" aria-label="Nearby duplicate candidates">
        {candidates.map((candidate) => (
          <DuplicateCandidateCard
            key={candidate.id}
            candidate={candidate}
            onSelectSameIssue={onSelectSameIssue}
            isSupported={supportedCandidateId === candidate.id}
            disabled={disabled}
          />
        ))}
      </div>

      {/* Confirmation Actions */}
      <div className="rounded-xl border border-border bg-card/60 p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="text-xs text-muted-foreground w-full sm:w-auto">
          {isSeparateConfirmed ? (
            <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
              <CheckCircle2 className="size-4" aria-hidden="true" />
              <span>Confirmed separate from these {candidates.length} report(s).</span>
            </span>
          ) : (
            <span>Is your problem distinct from all the reports listed above?</span>
          )}
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onRecheck}
            disabled={disabled}
            className="gap-1.5 text-xs text-muted-foreground hover:text-foreground"
          >
            <RotateCcw className="size-3.5" aria-hidden="true" />
            <span>Re-check</span>
          </Button>

          {!isSeparateConfirmed ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={disabled}
              onClick={onConfirmSeparate}
              className="gap-1.5 text-xs font-medium border-emerald-500/40 hover:border-emerald-500 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/10"
            >
              <ShieldCheck className="size-3.5" aria-hidden="true" />
              <span>My Issue Is Different</span>
            </Button>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={disabled}
              onClick={onConfirmSeparate}
              className="gap-1.5 text-xs font-normal text-muted-foreground"
            >
              <span>Re-evaluate</span>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
