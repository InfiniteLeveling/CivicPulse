"use client";

import type { Route } from "next";
import Link from "next/link";
import {
  CheckCircle2,
  Calendar,
  MapPin,
  Eye,
  Lock,
  ArrowRight,
  PlusCircle,
  Building2,
  ThumbsUp,
  LayoutDashboard,
  FileText,
} from "lucide-react";
import type { ComplaintSummary } from "@/types/domain";
import { CATEGORY_LABELS } from "@/lib/constants";
import { formatCoordinate } from "@/lib/validation/location";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface ReportSuccessProps {
  report: ComplaintSummary;
  photoUrl?: string | null;
  onReportAnother: () => void;
}

export function ReportSuccess({
  report,
  photoUrl,
  onReportAnother,
}: ReportSuccessProps) {
  const categoryLabel = CATEGORY_LABELS[report.category] || report.category;
  const isPublic = report.visibility === "public";
  const displayImage = photoUrl || report.imageUrl;

  const formattedDate = new Date(report.createdAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-300" data-testid="report-success-view">
      {/* Celebration Header */}
      <Card className="border-emerald-500/40 bg-emerald-500/5 dark:bg-emerald-950/10">
        <CardContent className="p-6 sm:p-8 flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left gap-5">
          <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-sm">
            <CheckCircle2 className="size-8" aria-hidden="true" />
          </span>

          <div className="space-y-2 flex-1 min-w-0">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <Badge variant="default" className="bg-emerald-600 text-white text-xs px-2.5 py-0.5">
                Official Report Registered
              </Badge>
              <span className="font-mono text-xs font-semibold text-foreground bg-muted px-2.5 py-0.5 rounded border border-border">
                {report.reference || report.id}
              </span>
            </div>

            <h2 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">
              Complaint Submitted Successfully!
            </h2>

            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed max-w-2xl">
              Your civic issue report has been recorded in the municipal queue. You can monitor crew dispatch, status updates, and resolution verification directly from your citizen dashboard.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Verified Complaint Card */}
      <Card className="border-border shadow-xs">
        <CardContent className="p-5 sm:p-7 space-y-6">
          <div className="flex items-center justify-between border-b pb-4">
            <div className="space-y-0.5">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Recorded Case Summary
              </span>
              <h3 className="text-base font-semibold text-foreground">
                {report.title}
              </h3>
            </div>

            <StatusBadge status={report.status} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            {/* Left metadata */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground w-24 shrink-0">Category:</span>
                <Badge variant="outline" className="font-normal text-xs">
                  {categoryLabel}
                </Badge>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-muted-foreground w-24 shrink-0">Visibility:</span>
                <span className="inline-flex items-center gap-1 font-medium capitalize text-foreground">
                  {isPublic ? (
                    <Eye className="size-3.5 text-primary" aria-hidden="true" />
                  ) : (
                    <Lock className="size-3.5 text-muted-foreground" aria-hidden="true" />
                  )}
                  <span>{report.visibility} Report</span>
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-muted-foreground w-24 shrink-0">Coordinates:</span>
                <span className="font-mono text-foreground font-semibold inline-flex items-center gap-1">
                  <MapPin className="size-3.5 text-primary" aria-hidden="true" />
                  <span>{formatCoordinate(report.latitude)}°, {formatCoordinate(report.longitude)}°</span>
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-muted-foreground w-24 shrink-0">Submitted:</span>
                <span className="inline-flex items-center gap-1 text-muted-foreground">
                  <Calendar className="size-3.5" aria-hidden="true" />
                  <span>{formattedDate}</span>
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-muted-foreground w-24 shrink-0">Initial Support:</span>
                <span className="inline-flex items-center gap-1 text-primary font-semibold">
                  <ThumbsUp className="size-3.5" aria-hidden="true" />
                  <span>{report.supportCount || 1} community support</span>
                </span>
              </div>
            </div>

            {/* Right: Attached photo preview if available */}
            {displayImage && (
              <div className="flex flex-col items-start gap-2 pt-3 md:pt-0 border-t md:border-t-0 md:border-l md:pl-4 border-border/60">
                <span className="text-muted-foreground text-[11px] uppercase tracking-wider font-medium">
                  Attached Evidence
                </span>
                <div className="relative size-24 shrink-0 overflow-hidden rounded-xl border border-border/80 bg-muted/40 shadow-xs">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={displayImage}
                    alt={`Attached evidence for report ${report.reference}`}
                    className="size-full object-cover"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Description */}
          <div className="pt-3 border-t border-border/50 space-y-1.5">
            <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider block">
              Problem Description
            </span>
            <div className="rounded-xl bg-muted/30 p-3.5 border border-border/60 text-xs text-foreground/90 whitespace-pre-wrap leading-relaxed">
              {report.description}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Next Steps Guidance */}
      <div className="rounded-2xl border border-dashed border-border bg-card/50 p-5 sm:p-6 space-y-3.5">
        <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Building2 className="size-4 text-primary" aria-hidden="true" />
          <span>What Happens Next?</span>
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="p-3 rounded-xl border bg-background space-y-1">
            <p className="font-semibold text-foreground">1. Municipal Triage</p>
            <p className="text-muted-foreground text-[11px] leading-relaxed">
              City engineers review your complaint details, verify severity, and route it to the field repair unit.
            </p>
          </div>

          <div className="p-3 rounded-xl border bg-background space-y-1">
            <p className="font-semibold text-foreground">2. Progress Updates</p>
            <p className="text-muted-foreground text-[11px] leading-relaxed">
              Track lifecycle changes from Pending to In Progress and inspect resolution photos once fixed.
            </p>
          </div>

          <div className="p-3 rounded-xl border bg-background space-y-1">
            <p className="font-semibold text-foreground">3. Community Voice</p>
            <p className="text-muted-foreground text-[11px] leading-relaxed">
              Neighbors can endorse your report on the public map, raising urgency points for faster service.
            </p>
          </div>
        </div>
      </div>

      {/* Navigation Actions */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
        <Button
          type="button"
          variant="outline"
          size="default"
          onClick={onReportAnother}
          className="w-full sm:w-auto gap-2 text-xs font-medium"
          data-testid="report-another-btn"
        >
          <PlusCircle className="size-4" aria-hidden="true" />
          <span>Report Another Issue</span>
        </Button>

        <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full sm:w-auto">
          <Link
            href={`/reports/${encodeURIComponent(report.id)}` as unknown as Route}
            className={cn(buttonVariants({ variant: "outline", size: "default" }), "w-full sm:w-auto gap-2 text-xs")}
          >
            <Eye className="size-4" aria-hidden="true" />
            <span>View Details</span>
          </Link>

          <Link
            href="/my-reports"
            className={cn(buttonVariants({ variant: "outline", size: "default" }), "w-full sm:w-auto gap-2 text-xs")}
          >
            <FileText className="size-4" aria-hidden="true" />
            <span>My Complaints</span>
          </Link>

          <Link
            href="/dashboard"
            className={cn(buttonVariants({ variant: "default", size: "default" }), "w-full sm:w-auto gap-2 text-xs shadow-xs")}
          >
            <LayoutDashboard className="size-4" aria-hidden="true" />
            <span>Go to Dashboard</span>
            <ArrowRight className="size-3.5" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </div>
  );
}
