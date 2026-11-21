"use client";

import Link from "next/link";
import type { Route } from "next";
import Image from "next/image";
import {
  ArrowRight,
  Calendar,
  Construction,
  Droplets,
  Lightbulb,
  ThumbsUp,
  Trash2,
  Waves,
  CircleHelp,
} from "lucide-react";
import type { IssueCategory, ReportSummary } from "@/types/domain";
import { StatusBadge } from "@/components/common/StatusBadge";
import { CATEGORY_LABELS } from "@/lib/constants";
import { formatReportDate } from "@/lib/reports/formatting";

const CATEGORY_ICONS: Record<IssueCategory, React.ElementType> = {
  pothole: Construction,
  garbage: Trash2,
  water_leakage: Droplets,
  streetlight: Lightbulb,
  drainage: Waves,
  other: CircleHelp,
};

interface CivicIssuePopupProps {
  report: ReportSummary;
}

export function CivicIssuePopup({ report }: CivicIssuePopupProps) {
  const CategoryIcon = CATEGORY_ICONS[report.category] ?? CircleHelp;
  const categoryLabel = CATEGORY_LABELS[report.category] ?? report.category;

  return (
    <div className="w-[260px] sm:w-[280px] p-1 font-sans text-foreground space-y-2.5">
      {/* Thumbnail if available */}
      {report.imageUrl && (
        <div className="relative w-full h-28 rounded-lg overflow-hidden bg-muted border border-border">
          <Image
            src={report.imageUrl}
            alt={report.title}
            fill
            sizes="280px"
            className="object-cover"
          />
        </div>
      )}

      {/* Header: Reference and Status */}
      <div className="flex items-center justify-between gap-2 pt-0.5">
        <span className="font-mono text-xs font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded border border-primary/20">
          {report.reference}
        </span>
        <StatusBadge status={report.status} />
      </div>

      {/* Title */}
      <div>
        <h3 className="font-semibold text-sm leading-snug line-clamp-2 text-foreground">
          {report.title}
        </h3>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
          <CategoryIcon className="size-3.5 text-primary shrink-0" aria-hidden="true" />
          <span>{categoryLabel}</span>
        </div>
      </div>

      {/* Description Snippet */}
      <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
        {report.description}
      </p>

      {/* Metadata Row */}
      <div className="flex items-center justify-between text-[11px] text-muted-foreground border-t border-border/60 pt-2">
        <div className="flex items-center gap-1">
          <Calendar className="size-3 text-muted-foreground/70" aria-hidden="true" />
          <span>{formatReportDate(report.createdAt)}</span>
        </div>
        <div className="flex items-center gap-1 font-medium text-foreground">
          <ThumbsUp className="size-3 text-emerald-600" aria-hidden="true" />
          <span>{report.supportCount}</span>
        </div>
      </div>

      {/* View Details Action */}
      <div className="pt-1">
        <Link
          href={`/reports/${report.id}` as unknown as Route}
          className="inline-flex items-center justify-center gap-1.5 w-full text-xs font-semibold px-3 py-1.5 bg-primary text-primary-foreground hover:bg-primary/90 rounded-md transition-colors shadow-xs"
        >
          <span>View Details</span>
          <ArrowRight className="size-3.5" aria-hidden="true" />
        </Link>
      </div>
    </div>
  );
}
