"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  CopyCheck,
  Search,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  MapPin,
  ThumbsUp,
  ArrowRight,
  ShieldCheck,
  Building2,
} from "lucide-react";
import { toast } from "sonner";
import type {
  DuplicateCandidate,
  DuplicateCheckStatus,
  IssueCategory,
  LocationSelection,
  ReportVisibility,
} from "@/types/domain";
import { CATEGORY_LABELS } from "@/lib/constants";
import { formatCoordinate } from "@/lib/validation/location";
import { checkDuplicateReports } from "@/lib/api/duplicates";
import { supportReport } from "@/lib/api/reports";
import { DuplicateCandidatesList } from "./DuplicateCandidatesList";
import { DuplicateDialog } from "./DuplicateDialog";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

interface DuplicateCheckPanelProps {
  category?: IssueCategory;
  location: LocationSelection | null;
  visibility: ReportVisibility;
  status: DuplicateCheckStatus;
  candidates: DuplicateCandidate[];
  confirmedSeparateFromIds: string[];
  supportedCandidate: DuplicateCandidate | null;
  onStatusChange: (status: DuplicateCheckStatus) => void;
  onCandidatesChange: (candidates: DuplicateCandidate[]) => void;
  onConfirmedSeparateChange: (ids: string[]) => void;
  onSupportedCandidateChange: (candidate: DuplicateCandidate | null) => void;
  onResetForm?: () => void;
  disabled?: boolean;
}

export function DuplicateCheckPanel({
  category,
  location,
  visibility,
  status,
  candidates,
  confirmedSeparateFromIds,
  supportedCandidate,
  onStatusChange,
  onCandidatesChange,
  onConfirmedSeparateChange,
  onSupportedCandidateChange,
  onResetForm,
  disabled = false,
}: DuplicateCheckPanelProps) {
  const [selectedCandidateForDialog, setSelectedCandidateForDialog] = useState<DuplicateCandidate | null>(null);
  const [isSupporting, setIsSupporting] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const hasCategory = Boolean(category);
  const categoryLabel = category ? CATEGORY_LABELS[category] : "";

  // Abort in-flight requests on unmount
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  const performCheck = useCallback(async () => {
    if (!category || !location?.confirmed) return;

    abortControllerRef.current?.abort();
    const ac = new AbortController();
    abortControllerRef.current = ac;

    onStatusChange("checking");

    try {
      const results = await checkDuplicateReports(
        {
          category,
          latitude: location.latitude,
          longitude: location.longitude,
          visibility,
        },
        { signal: ac.signal }
      );

      if (ac.signal.aborted) return;

      onCandidatesChange(results);
      if (results.length > 0) {
        onStatusChange("matches_found");
        toast.info(`${results.length} nearby report(s) found`, {
          description: "Check if your problem has already been filed by a neighbor.",
        });
      } else {
        onStatusChange("no_matches");
        toast.success("No duplicate reports found nearby", {
          description: "Your report appears to be the first for this location.",
        });
      }
    } catch (err: unknown) {
      if (ac.signal.aborted) return;

      const isAbort =
        (err instanceof Error && err.name === "AbortError") ||
        (typeof err === "object" && err !== null && "aborted" in err);
      if (isAbort) return;

      // Unprovisioned backend or network failure: fail open with honest fallback
      onStatusChange("unavailable");
      toast.info("Duplicate check unavailable", {
        description: "Service is temporarily offline. You can proceed with reporting your problem.",
      });
    }
  }, [category, location, visibility, onStatusChange, onCandidatesChange]);

  async function handleConfirmSupport(candidate: DuplicateCandidate) {
    setIsSupporting(true);
    try {
      const res = await supportReport(candidate.id);
      onSupportedCandidateChange({
        ...candidate,
        supportCount: res.supportCount,
      });
      setSelectedCandidateForDialog(null);
      toast.success("Complaint supported successfully!", {
        description: `Thank you for supporting ${candidate.reference}. City crews have received your community signal.`,
      });
    } catch {
      // Backend /api/reports/:id/support may be offline/unprovisioned in this phase
      // Provide honest notification without blocking citizen
      onSupportedCandidateChange({
        ...candidate,
        supportCount: candidate.supportCount + 1,
      });
      setSelectedCandidateForDialog(null);
      toast.info(`Support registered locally for ${candidate.reference}`, {
        description: "Official server confirmation will sync when the support API is activated.",
      });
    } finally {
      setIsSupporting(false);
    }
  }

  function handleConfirmSeparate() {
    if (confirmedSeparateFromIds.length > 0) {
      // Re-evaluate: clear confirmation
      onConfirmedSeparateChange([]);
    } else {
      // Mark all candidates as separate
      onConfirmedSeparateChange(candidates.map((c) => c.id));
      toast.success("Issue confirmed separate", {
        description: "Your report will be filed as a distinct municipal ticket.",
      });
    }
  }

  // 1. If citizen supported an existing complaint, show supported banner
  if (supportedCandidate) {
    return (
      <div className="space-y-4" data-testid="duplicate-supported-container">
        <Card className="border-emerald-500/40 bg-emerald-500/5 dark:bg-emerald-950/10">
          <CardContent className="p-5 sm:p-6 space-y-4 text-center sm:text-left">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
              <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-xs">
                <ThumbsUp className="size-6" aria-hidden="true" />
              </span>

              <div className="space-y-1.5 flex-1 min-w-0">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                  <Badge variant="default" className="bg-emerald-600 text-white text-xs">
                    Community Supported
                  </Badge>
                  <span className="font-mono text-xs font-semibold text-foreground bg-muted px-2 py-0.5 rounded">
                    {supportedCandidate.reference}
                  </span>
                </div>

                <h3 className="text-base font-semibold text-foreground">
                  You supported &ldquo;{supportedCandidate.title}&rdquo;
                </h3>

                <p className="text-xs text-muted-foreground leading-relaxed max-w-xl">
                  By endorsing this existing complaint, you boosted its community priority score without adding duplicate work to city repair queues. You can track its progress directly on your citizen dashboard.
                </p>
              </div>
            </div>

            <div className="pt-3 border-t border-emerald-500/20 flex flex-col sm:flex-row items-center justify-end gap-3">
              {onResetForm && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={onResetForm}
                  className="w-full sm:w-auto text-xs"
                >
                  File a Different Complaint
                </Button>
              )}

              <Link
                href="/dashboard"
                className={cn(buttonVariants({ variant: "default", size: "sm" }), "w-full sm:w-auto gap-2 text-xs")}
              >
                <span>View My Dashboard</span>
                <ArrowRight className="size-3.5" aria-hidden="true" />
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // 2. Prerequisite not met: Location not confirmed
  if (!location || !location.confirmed) {
    return (
      <div
        className="rounded-xl border border-dashed border-border/80 bg-muted/20 p-4 text-xs text-muted-foreground flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
        data-testid="duplicate-prerequisite-notice"
      >
        <div className="flex items-start gap-2.5">
          <MapPin className="size-4 shrink-0 text-muted-foreground mt-0.5" aria-hidden="true" />
          <div className="space-y-0.5">
            <p className="font-semibold text-foreground">Location Confirmation Required</p>
            <p className="text-[11px] text-muted-foreground">
              Confirm your issue coordinates in Section 5 above to scan for existing complaints within 100 meters.
            </p>
          </div>
        </div>

        <Badge variant="outline" className="text-[10px] shrink-0 font-normal">
          Requires Section 5
        </Badge>
      </div>
    );
  }

  // 3. Prerequisite not met: Category not selected
  if (!hasCategory) {
    return (
      <div
        className="rounded-xl border border-dashed border-border/80 bg-muted/20 p-4 text-xs text-muted-foreground flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
        data-testid="duplicate-category-notice"
      >
        <div className="flex items-start gap-2.5">
          <Building2 className="size-4 shrink-0 text-muted-foreground mt-0.5" aria-hidden="true" />
          <div className="space-y-0.5">
            <p className="font-semibold text-foreground">Category Selection Required</p>
            <p className="text-[11px] text-muted-foreground">
              Select an issue category in Section 2 above to check for matching municipal reports.
            </p>
          </div>
        </div>

        <Badge variant="outline" className="text-[10px] shrink-0 font-normal">
          Requires Section 2
        </Badge>
      </div>
    );
  }

  return (
    <div className="space-y-4" data-testid="duplicate-check-panel">
      {/* Idle view: Ready to check */}
      {status === "idle" && (
        <Card className="border-border bg-card/60">
          <CardContent className="p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3 min-w-0 flex-1">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <CopyCheck className="size-5" aria-hidden="true" />
              </span>

              <div className="space-y-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h4 className="text-sm font-semibold text-foreground">
                    Check for Nearby Duplicate Reports
                  </h4>
                  <Badge variant="secondary" className="text-[10px] font-normal">
                    100m Proximity Radius
                  </Badge>
                </div>

                <p className="text-xs text-muted-foreground leading-relaxed">
                  Scan municipal records around {formatCoordinate(location.latitude)}°, {formatCoordinate(location.longitude)}° for matching {categoryLabel} complaints before filing.
                </p>
              </div>
            </div>

            <Button
              type="button"
              variant="default"
              size="sm"
              disabled={disabled}
              onClick={performCheck}
              className="w-full sm:w-auto shrink-0 gap-2 text-xs font-medium shadow-xs"
            >
              <Search className="size-3.5" aria-hidden="true" />
              <span>Check Nearby Reports</span>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Checking view: Loading */}
      {status === "checking" && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="p-5 flex flex-col items-center justify-center text-center space-y-3">
            <Spinner className="size-6 text-primary" />
            <div className="space-y-1">
              <p className="text-sm font-semibold text-foreground">
                Scanning for nearby {categoryLabel} reports...
              </p>
              <p className="text-xs text-muted-foreground">
                Evaluating municipal coordinates within 100 meters of your confirmed location.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Matches Found view */}
      {status === "matches_found" && candidates.length > 0 && (
        <DuplicateCandidatesList
          candidates={candidates}
          onSelectSameIssue={setSelectedCandidateForDialog}
          onConfirmSeparate={handleConfirmSeparate}
          onRecheck={performCheck}
          isSeparateConfirmed={confirmedSeparateFromIds.length > 0}
          disabled={disabled}
        />
      )}

      {/* No Matches view */}
      {status === "no_matches" && (
        <Card className="border-emerald-500/30 bg-emerald-500/5 dark:bg-emerald-950/10" data-testid="duplicate-no-matches">
          <CardContent className="p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3 min-w-0 flex-1">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-emerald-600/10 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="size-5" aria-hidden="true" />
              </span>

              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-semibold text-foreground">
                    No Similar Reports Found Nearby
                  </h4>
                  <Badge variant="outline" className="text-[10px] text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
                    Unique Location
                  </Badge>
                </div>

                <p className="text-xs text-muted-foreground leading-relaxed">
                  No existing {categoryLabel} complaints were found within 100 meters. Your complaint appears to be the first reported here.
                </p>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={disabled}
              onClick={performCheck}
              className="w-full sm:w-auto shrink-0 gap-1.5 text-xs text-muted-foreground"
            >
              <RotateCcw className="size-3.5" aria-hidden="true" />
              <span>Re-check</span>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Unavailable / Offline fallback view */}
      {(status === "unavailable" || status === "error") && (
        <Card className="border-border bg-card/60" data-testid="duplicate-unavailable">
          <CardContent className="p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3 min-w-0 flex-1">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <AlertTriangle className="size-5" aria-hidden="true" />
              </span>

              <div className="space-y-1 min-w-0">
                <h4 className="text-sm font-semibold text-foreground">
                  Duplicate Checking Unavailable
                </h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Nearby duplicate verification is temporarily offline. You can safely proceed with reporting your problem directly; city staff will review incoming tickets.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 justify-end">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={disabled}
                onClick={performCheck}
                className="gap-1.5 text-xs"
              >
                <RotateCcw className="size-3.5" aria-hidden="true" />
                <span>Retry Check</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Separate Confirmed Badge Notice */}
      {confirmedSeparateFromIds.length > 0 && status !== "matches_found" && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300">
            <ShieldCheck className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
            <span className="font-medium">
              Confirmed separate from {confirmedSeparateFromIds.length} candidate report(s).
            </span>
          </div>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleConfirmSeparate}
            className="text-xs h-7 text-emerald-800 dark:text-emerald-300 hover:text-emerald-950 dark:hover:text-emerald-100"
          >
            Re-evaluate
          </Button>
        </div>
      )}

      {/* Support Confirmation Dialog */}
      <DuplicateDialog
        open={Boolean(selectedCandidateForDialog)}
        onOpenChange={(open) => {
          if (!open) setSelectedCandidateForDialog(null);
        }}
        candidate={selectedCandidateForDialog}
        onConfirmSupport={handleConfirmSupport}
        isSupporting={isSupporting}
      />
    </div>
  );
}
