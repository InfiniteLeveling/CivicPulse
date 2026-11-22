"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  Edit3,
  CheckCircle2,
  Eye,
  Lock,
  MapPin,
  ArrowLeft,
  Construction,
  Trash2,
  Droplets,
  Lightbulb,
  Waves,
  CircleHelp,
  ImageIcon,
  Sparkles,
  CopyCheck,
  ShieldCheck,
  ThumbsUp,
  AlertCircle,
  type LucideIcon,
} from "lucide-react";
import type { ReportBasicsFormValues } from "@/lib/validation/report";
import type {
  IssueCategory,
  LocationSelection,
} from "@/types/domain";
import { CATEGORY_LABELS } from "@/lib/constants";
import { formatFileSize, formatMimeType } from "@/lib/validation/image";
import { formatCoordinate } from "@/lib/validation/location";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ReportSubmitButton } from "./ReportSubmitButton";
import { ReportSubmissionDialog } from "./ReportSubmissionDialog";
import { ReportSubmissionError } from "./ReportSubmissionError";
import type { ReviewPhotoInfo, ReviewDuplicateInfo } from "./ReportDetailsReview";
import { cn } from "@/lib/utils";

interface FinalReportReviewProps {
  values: ReportBasicsFormValues;
  photo?: ReviewPhotoInfo;
  analysisId?: string | null;
  location?: LocationSelection | null;
  duplicateInfo?: ReviewDuplicateInfo;
  onEditSection: (section: "details" | "photo" | "location" | "duplicates") => void;
  onSubmit: () => Promise<void> | void;
  isSubmitting: boolean;
  submissionError: {
    state: "error" | "outcome_unknown";
    message: string;
    code?: string;
  } | null;
  onRetrySubmission: () => void;
}

const CATEGORY_ICONS: Record<IssueCategory, LucideIcon> = {
  pothole: Construction,
  garbage: Trash2,
  water_leakage: Droplets,
  streetlight: Lightbulb,
  drainage: Waves,
  other: CircleHelp,
};

export function FinalReportReview({
  values,
  photo,
  analysisId,
  location,
  duplicateInfo,
  onEditSection,
  onSubmit,
  isSubmitting,
  submissionError,
  onRetrySubmission,
}: FinalReportReviewProps) {
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);

  const CategoryIcon = CATEGORY_ICONS[values.category] || CircleHelp;
  const isPublic = values.visibility === "public";
  const photoFile = photo?.file;

  const photoUrl = useMemo(() => {
    if (typeof window !== "undefined" && typeof URL.createObjectURL === "function" && photoFile) {
      return URL.createObjectURL(photoFile);
    }
    return null;
  }, [photoFile]);

  useEffect(() => {
    return () => {
      if (photoUrl) {
        URL.revokeObjectURL(photoUrl);
      }
    };
  }, [photoUrl]);

  // Comprehensive Readiness Evaluation
  const readinessErrors = useMemo(() => {
    const errors: string[] = [];
    if (!values.title || values.title.trim().length < 5) {
      errors.push("Issue title must be at least 5 characters.");
    }
    if (!values.description || values.description.trim().length < 10) {
      errors.push("Problem description must be at least 10 characters long.");
    }
    if (!values.category) {
      errors.push("Please select an issue category.");
    }
    if (!photo?.file) {
      errors.push("Please attach a photograph of the problem.");
    } else if (!photo.imageId) {
      errors.push("Photograph upload is required before final submission.");
    }
    if (!location || !location.confirmed) {
      errors.push("Issue location must be explicitly confirmed on the map.");
    }
    return errors;
  }, [values, photo, location]);

  const isReadyToSubmit = readinessErrors.length === 0;

  function handleOpenSubmissionDialog() {
    if (!isReadyToSubmit || isSubmitting) return;
    setIsConfirmDialogOpen(true);
  }

  function handleConfirmSubmission() {
    setIsConfirmDialogOpen(false);
    onSubmit();
  }

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-200" data-testid="final-report-review">
      {/* Header Announcement */}
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-foreground flex items-start gap-3">
        <CheckCircle2 className="size-5 shrink-0 mt-0.5 text-primary" aria-hidden="true" />
        <div className="space-y-1 text-xs">
          <p className="font-semibold text-sm text-foreground">
            Issue Details &amp; Photo Validated
          </p>
          <h2 className="text-xs font-semibold text-foreground tracking-tight">
            Review Complaint Details
          </h2>
          <p className="text-muted-foreground leading-relaxed">
            Please check your complaint details before submitting. Accurate information helps authorities understand and locate the issue.
          </p>
        </div>
      </div>

      {/* Main Review Card */}
      <Card className="border-border shadow-xs">
        <CardContent className="p-5 sm:p-7 space-y-6">
          {/* Section 1: Complaint Details */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="text-base font-semibold text-foreground tracking-tight">
                  1. Problem Summary
                </h3>
                <p className="text-xs text-muted-foreground">
                  Title, description, category, and community visibility
                </p>
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onEditSection("details")}
                className="gap-1.5 text-xs"
                data-testid="edit-details-btn"
              >
                <Edit3 className="size-3.5" aria-hidden="true" />
                <span>Edit Details</span>
              </Button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider block mb-1">
                  Issue Title
                </span>
                <p className="text-sm sm:text-base font-semibold text-foreground">
                  {values.title}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-border/50">
                <div>
                  <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider block mb-1.5">
                    Category
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary border border-primary/20">
                      <CategoryIcon className="size-4" aria-hidden="true" />
                    </span>
                    <span className="text-sm font-semibold text-foreground">
                      {CATEGORY_LABELS[values.category]}
                    </span>
                  </div>
                </div>

                <div>
                  <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider block mb-1.5">
                    Visibility
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="flex size-7 items-center justify-center rounded-lg bg-muted text-foreground border border-border">
                      {isPublic ? (
                        <Eye className="size-4 text-primary" aria-hidden="true" />
                      ) : (
                        <Lock className="size-4 text-muted-foreground" aria-hidden="true" />
                      )}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-semibold text-foreground capitalize">
                        {values.visibility} Report
                      </span>
                      <Badge variant={isPublic ? "default" : "secondary"} className="text-[10px] px-1.5 py-0 font-normal">
                        {isPublic ? "Community-Visible" : "Restricted"}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-border/50">
                <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider block mb-1.5">
                  Problem Description
                </span>
                <div className="rounded-xl bg-muted/30 p-3.5 border border-border/60">
                  <p className="text-xs sm:text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed">
                    {values.description}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Attached Photograph */}
          <div className="space-y-4 pt-4 border-t border-border/60">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="text-base font-semibold text-foreground tracking-tight">
                  2. Attached Photograph
                </h3>
                <p className="text-xs text-muted-foreground">
                  Photographic evidence for maintenance diagnosis
                </p>
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onEditSection("photo")}
                className="gap-1.5 text-xs"
                data-testid="change-photo-btn"
              >
                <Edit3 className="size-3.5" aria-hidden="true" />
                <span>Change Photo</span>
              </Button>
            </div>

            {photo?.file && photoUrl ? (
              <div className="rounded-xl border border-border bg-card p-3.5 flex flex-col sm:flex-row items-start sm:items-center gap-3.5">
                <div className="relative size-16 shrink-0 overflow-hidden rounded-lg border border-border/80 bg-muted/40">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photoUrl}
                    alt="Preview of the selected civic issue photograph."
                    className="size-full object-cover"
                  />
                </div>

                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-xs font-semibold text-foreground truncate max-w-xs">
                      {photo.file.name}
                    </p>
                    <Badge variant="outline" className="text-[10px] uppercase font-normal">
                      {formatMimeType(photo.file.type)}
                    </Badge>
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {formatFileSize(photo.file.size)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-xs">
                    {photo.imageId ? (
                      <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                        <CheckCircle2 className="size-3.5" aria-hidden="true" />
                        <span>Uploaded ID: <code className="font-mono text-[11px]">{photo.imageId}</code></span>
                      </span>
                    ) : (
                      <span className="text-amber-600 dark:text-amber-400 text-[11px] inline-flex items-center gap-1">
                        <AlertCircle className="size-3.5" />
                        <span>Local preview only · Server upload pending</span>
                      </span>
                    )}
                  </div>

                  {analysisId && (
                    <div className="flex items-center gap-1.5 pt-1 text-[11px] text-primary">
                      <Sparkles className="size-3.5 shrink-0" aria-hidden="true" />
                      <span>AI Analysis ID: <code className="font-mono">{analysisId}</code> (Advisory only)</span>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-rose-500/30 bg-rose-500/5 p-4 text-xs text-rose-800 dark:text-rose-300 flex items-center justify-between gap-2.5">
                <div className="flex items-center gap-2.5">
                  <ImageIcon className="size-4 shrink-0 text-rose-600 dark:text-rose-400" aria-hidden="true" />
                  <span>No photograph attached. A clear photo is required for municipal dispatch.</span>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onEditSection("photo")}
                  className="text-xs h-7 border-rose-500/40 text-rose-800 dark:text-rose-300"
                >
                  Add Photo
                </Button>
              </div>
            )}
          </div>

          {/* Section 3: Issue Location */}
          <div className="space-y-4 pt-4 border-t border-border/60">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="text-base font-semibold text-foreground tracking-tight">
                  3. Confirmed Location
                </h3>
                <p className="text-xs text-muted-foreground">
                  Geographical coordinates verified for repair crews
                </p>
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onEditSection("location")}
                className="gap-1.5 text-xs"
                data-testid="edit-location-btn"
              >
                <Edit3 className="size-3.5" aria-hidden="true" />
                <span>Edit Location</span>
              </Button>
            </div>

            {location?.confirmed ? (
              <div className="rounded-xl border border-border bg-card p-3.5 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <MapPin className="size-4" aria-hidden="true" />
                    </span>
                    <div>
                      <p className="font-mono text-xs font-semibold text-foreground">
                        {formatCoordinate(location.latitude)}°, {formatCoordinate(location.longitude)}°
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        Geographical point verified by citizen
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px] uppercase font-normal">
                      {location.source === "gps" ? "GPS Detected" : location.source === "manual" ? "Manual Entry" : "Map Selected"}
                    </Badge>
                    <Badge variant="default" className="text-[10px] font-normal">
                      Confirmed
                    </Badge>
                  </div>
                </div>

                {location.accuracyMeters !== undefined && (
                  <div className="text-[11px] text-muted-foreground pt-1 border-t border-border/40">
                    <span>Accuracy estimate: approximately {Math.round(location.accuracyMeters)}m</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-rose-500/30 bg-rose-500/5 p-4 text-xs text-rose-800 dark:text-rose-300 flex items-center justify-between gap-2.5">
                <div className="flex items-center gap-2.5">
                  <MapPin className="size-4 shrink-0 text-rose-600 dark:text-rose-400" aria-hidden="true" />
                  <span>No location confirmed yet. Exact coordinates are required for repair crews.</span>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onEditSection("location")}
                  className="text-xs h-7 border-rose-500/40 text-rose-800 dark:text-rose-300"
                >
                  Set Location
                </Button>
              </div>
            )}
          </div>

          {/* Section 4: Duplicate Verification */}
          <div className="space-y-4 pt-4 border-t border-border/60">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="text-base font-semibold text-foreground tracking-tight">
                  4. Duplicate Verification Status
                </h3>
                <p className="text-xs text-muted-foreground">
                  Proximity check within 100 meters
                </p>
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onEditSection("duplicates")}
                className="gap-1.5 text-xs"
                data-testid="review-duplicates-btn"
              >
                <Edit3 className="size-3.5" aria-hidden="true" />
                <span>Review Nearby Reports</span>
              </Button>
            </div>

            {duplicateInfo?.supportedCandidate ? (
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3.5 space-y-1">
                <div className="flex items-center gap-2">
                  <ThumbsUp className="size-4 text-emerald-600 dark:text-emerald-400" />
                  <span className="font-semibold text-xs text-foreground">
                    Community Supported: {duplicateInfo.supportedCandidate.reference}
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  You endorsed existing report &ldquo;{duplicateInfo.supportedCandidate.title}&rdquo; instead of submitting a duplicate ticket.
                </p>
              </div>
            ) : duplicateInfo?.confirmedSeparateCount && duplicateInfo.confirmedSeparateCount > 0 ? (
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3.5 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="size-4 text-emerald-600 dark:text-emerald-400" />
                  <div>
                    <p className="text-xs font-semibold text-foreground">
                      Confirmed Separate Issue
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      Evaluated against {duplicateInfo.confirmedSeparateCount} nearby candidate report(s) and confirmed distinct.
                    </p>
                  </div>
                </div>
                <Badge variant="outline" className="text-[10px] text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
                  Verified Separate
                </Badge>
              </div>
            ) : duplicateInfo?.status === "no_matches" ? (
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3.5 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400" />
                  <div>
                    <p className="text-xs font-semibold text-foreground">
                      No Nearby Duplicates Found
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      0 matching reports found within 100 meters of your coordinates.
                    </p>
                  </div>
                </div>
                <Badge variant="outline" className="text-[10px] text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
                  Unique Location
                </Badge>
              </div>
            ) : duplicateInfo?.status === "unavailable" || duplicateInfo?.status === "error" ? (
              <div className="rounded-xl border border-border bg-muted/20 p-3.5 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <CopyCheck className="size-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs font-semibold text-foreground">
                      Duplicate Check Service Offline
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      Automated spatial checking was unavailable. Municipal staff will review upon intake.
                    </p>
                  </div>
                </div>
                <Badge variant="outline" className="text-[10px] text-muted-foreground">
                  Unverified
                </Badge>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-border/80 bg-muted/20 p-3.5 flex items-center gap-2.5 text-xs text-muted-foreground">
                <CopyCheck className="size-4 text-muted-foreground" />
                <span>Duplicate check not completed. (Optional prior to dispatch).</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Submission Readiness Indicator */}
      <div className="space-y-3" aria-live="polite">
        {!isReadyToSubmit ? (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs text-amber-900 dark:text-amber-200 space-y-2">
            <div className="flex items-center gap-2 font-semibold">
              <AlertCircle className="size-4 text-amber-600 dark:text-amber-400 shrink-0" />
              <span>Items Requiring Attention Before Submission:</span>
            </div>
            <ul className="list-disc pl-5 space-y-1 text-[11px] text-amber-800 dark:text-amber-300/90">
              {readinessErrors.map((err, idx) => (
                <li key={idx}>{err}</li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2.5">
            <CheckCircle2 className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <span className="font-medium">
              Ready for Submission: Problem summary, uploaded evidence, and confirmed coordinates are complete.
            </span>
          </div>
        )}
      </div>

      {/* Submission Error Card if any */}
      <ReportSubmissionError
        error={submissionError}
        onRetry={onRetrySubmission}
        isSubmitting={isSubmitting}
      />

      {/* Primary Action Footer */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
        <Button
          type="button"
          variant="outline"
          size="default"
          onClick={() => onEditSection("details")}
          className="w-full sm:w-auto gap-2 text-xs"
        >
          <Edit3 className="size-4" aria-hidden="true" />
          <span>Edit Details</span>
        </Button>

        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
          <ReportSubmitButton
            isSubmitting={isSubmitting}
            readinessErrors={readinessErrors}
            onClick={handleOpenSubmissionDialog}
          />

          <Link
            href="/dashboard"
            className={cn(buttonVariants({ variant: "ghost", size: "default" }), "w-full sm:w-auto gap-2 text-xs text-muted-foreground")}
          >
            <ArrowLeft className="size-3.5" aria-hidden="true" />
            <span>Dashboard</span>
          </Link>
        </div>
      </div>

      {/* Submission Confirmation Dialog */}
      <ReportSubmissionDialog
        open={isConfirmDialogOpen}
        onOpenChange={setIsConfirmDialogOpen}
        onConfirmSubmit={handleConfirmSubmission}
        isSubmitting={isSubmitting}
        visibility={values.visibility}
        title={values.title}
        categoryLabel={CATEGORY_LABELS[values.category] || values.category}
      />
    </div>
  );
}
