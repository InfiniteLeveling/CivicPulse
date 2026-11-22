"use client";

import { useEffect, useMemo } from "react";
import Link from "next/link";
import {
  Edit3,
  CheckCircle2,
  Eye,
  Lock,
  MapPin,
  Send,
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
  type LucideIcon,
} from "lucide-react";
import type { ReportBasicsFormValues } from "@/lib/validation/report";
import type {
  IssueCategory,
  ImageUploadStatus,
  LocationSelection,
  DuplicateCheckStatus,
  DuplicateCandidate,
} from "@/types/domain";
import { CATEGORY_LABELS } from "@/lib/constants";
import { formatFileSize, formatMimeType } from "@/lib/validation/image";
import { formatCoordinate } from "@/lib/validation/location";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export interface ReviewPhotoInfo {
  file: File | null;
  imageId: string | null;
  status: ImageUploadStatus;
}

export interface ReviewDuplicateInfo {
  status: DuplicateCheckStatus;
  confirmedSeparateCount: number;
  supportedCandidate?: DuplicateCandidate | null;
}

interface ReportDetailsReviewProps {
  values: ReportBasicsFormValues;
  photo?: ReviewPhotoInfo;
  analysisId?: string | null;
  location?: LocationSelection | null;
  duplicateInfo?: ReviewDuplicateInfo;
  onEdit: () => void;
}

const CATEGORY_ICONS: Record<IssueCategory, LucideIcon> = {
  pothole: Construction,
  garbage: Trash2,
  water_leakage: Droplets,
  streetlight: Lightbulb,
  drainage: Waves,
  other: CircleHelp,
};

export function ReportDetailsReview({
  values,
  photo,
  analysisId,
  location,
  duplicateInfo,
  onEdit,
}: ReportDetailsReviewProps) {
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

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-200">
      {/* Validation Success Announcement */}
      <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-emerald-800 dark:text-emerald-300 flex items-start gap-3">
        <CheckCircle2 className="size-5 shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
        <div className="space-y-1 text-xs">
          <p className="font-semibold text-sm">Issue Details & Photo Validated</p>
          <p className="text-emerald-700 dark:text-emerald-300/90 leading-relaxed">
            Your complaint details and photograph have been reviewed and validated locally.
            Review the information below before proceeding to future intake stages.
          </p>
        </div>
      </div>

      {/* Summary Card */}
      <Card className="border-border shadow-sm">
        <CardContent className="p-6 space-y-6">
          <div className="flex items-center justify-between border-b pb-4">
            <div>
              <h2 className="text-lg font-semibold text-foreground tracking-tight">
                Review Complaint Details
              </h2>
              <p className="text-xs text-muted-foreground">
                Verify your entered information and attached evidence
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onEdit}
              className="gap-1.5 text-xs"
            >
              <Edit3 className="size-3.5" aria-hidden="true" />
              <span>Edit Details</span>
            </Button>
          </div>

          {/* Details Grid */}
          <div className="space-y-5">
            {/* Title */}
            <div>
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider block mb-1">
                Issue Title
              </span>
              <p className="text-base font-semibold text-foreground">{values.title}</p>
            </div>

            {/* Category & Visibility Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-border/50">
              <div>
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider block mb-2">
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
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider block mb-2">
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

            {/* Attached Photo Evidence Review */}
            <div className="pt-2 border-t border-border/50">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider block mb-2">
                Attached Photograph
              </span>

              {photo?.file && photoUrl ? (
                <div className="rounded-xl border border-border bg-card p-3.5 flex flex-col sm:flex-row items-start sm:items-center gap-3.5">
                  <div className="relative size-16 shrink-0 overflow-hidden rounded-lg border border-border/80 bg-muted/40">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={photoUrl}
                      alt="Review preview of attached civic issue photograph."
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
                          <span>Uploaded: <code className="font-mono text-[11px]">{photo.imageId}</code></span>
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-[11px]">
                          Verified locally · Server upload pending
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
                <div className="rounded-xl border border-dashed border-border/80 bg-muted/20 p-4 text-xs text-muted-foreground flex items-center gap-2.5">
                  <ImageIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                  <span>No photograph selected yet. (Optional during draft review, required for final dispatch).</span>
                </div>
              )}
            </div>

            {/* Confirmed Issue Location Review */}
            <div className="pt-2 border-t border-border/50">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider block mb-2">
                Confirmed Issue Location
              </span>

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
                <div className="rounded-xl border border-dashed border-border/80 bg-muted/20 p-4 text-xs text-muted-foreground flex items-center gap-2.5">
                  <MapPin className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                  <span>No location confirmed yet. (Required for municipal dispatch in Phase 12).</span>
                </div>
              )}
            </div>

            {/* Duplicate Verification Review */}
            <div className="pt-2 border-t border-border/50">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider block mb-2">
                Duplicate Verification Status
              </span>

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
                  <span>Duplicate check not completed. (Can be scanned prior to dispatch).</span>
                </div>
              )}
            </div>

            {/* Description */}
            <div className="pt-2 border-t border-border/50">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider block mb-2">
                Problem Description
              </span>
              <div className="rounded-xl bg-muted/40 p-4 border border-border/60">
                <p className="text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed">
                  {values.description}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Upcoming Stages Explanation Box */}
      <div className="rounded-xl border border-dashed border-border bg-card/40 p-5 space-y-4">
        <h3 className="text-sm font-semibold text-foreground">
          What happens next? (Upcoming Roadmap)
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          <div className="flex items-start gap-2.5 p-3 rounded-lg border bg-background">
            <CopyCheck className="size-4 text-primary mt-0.5 shrink-0" aria-hidden="true" />
            <div>
              <p className="font-semibold text-foreground">Step 3: Duplicate Verification (Phase 11 Active)</p>
              <p className="text-muted-foreground mt-0.5">
                Nearby complaints within 100 meters scanned to prevent duplicate city tickets.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-2.5 p-3 rounded-lg border bg-background">
            <Send className="size-4 text-muted-foreground mt-0.5 shrink-0" aria-hidden="true" />
            <div>
              <p className="font-semibold text-foreground">Step 4: Municipal Dispatch (Phase 12 Next)</p>
              <p className="text-muted-foreground mt-0.5">
                Official complaint persistence and department assignment via <code className="font-mono text-[10px]">POST /api/reports</code>.
              </p>
            </div>
          </div>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground border-t border-border/60">
          <span>
            Final report creation API (<code className="text-[11px] font-mono">POST /api/reports</code>) will be activated in Phase 12 once photo and location are bound.
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
        <Button
          type="button"
          variant="outline"
          size="default"
          onClick={onEdit}
          className="w-full sm:w-auto gap-2"
        >
          <Edit3 className="size-4" aria-hidden="true" />
          <span>Edit Details</span>
        </Button>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Button
            type="button"
            variant="default"
            size="default"
            disabled
            className="w-full sm:w-auto gap-2 opacity-60 cursor-not-allowed"
            aria-disabled="true"
          >
            <Send className="size-4" aria-hidden="true" />
            <span>Submit Report (Scheduled for Phase 12)</span>
          </Button>

          <Link
            href="/dashboard"
            className={cn(buttonVariants({ variant: "ghost", size: "default" }), "w-full sm:w-auto gap-2 text-xs text-muted-foreground")}
          >
            <ArrowLeft className="size-3.5" aria-hidden="true" />
            <span>Dashboard</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
