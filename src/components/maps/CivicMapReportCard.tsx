"use client";

import Link from "next/link";
import type { Route } from "next";
import {
  Calendar,
  Construction,
  Droplets,
  Lightbulb,
  MapPin,
  ThumbsUp,
  Trash2,
  Waves,
  CircleHelp,
  ArrowRight,
} from "lucide-react";
import type { IssueCategory, ReportSummary } from "@/types/domain";
import { StatusBadge } from "@/components/common/StatusBadge";
import { CATEGORY_LABELS } from "@/lib/constants";
import { formatReportDate } from "@/lib/reports/formatting";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const CATEGORY_ICONS: Record<IssueCategory, React.ElementType> = {
  pothole: Construction,
  garbage: Trash2,
  water_leakage: Droplets,
  streetlight: Lightbulb,
  drainage: Waves,
  other: CircleHelp,
};

interface CivicMapReportCardProps {
  report: ReportSummary;
  isSelected: boolean;
  onFocus: (id: string) => void;
}

export function CivicMapReportCard({
  report,
  isSelected,
  onFocus,
}: CivicMapReportCardProps) {
  const CategoryIcon = CATEGORY_ICONS[report.category] ?? CircleHelp;
  const categoryLabel = CATEGORY_LABELS[report.category] ?? report.category;

  return (
    <article
      data-report-id={report.id}
      data-selected={isSelected}
      className={cn(
        "rounded-xl border p-3.5 transition-all text-left bg-card space-y-2.5",
        isSelected
          ? "border-primary ring-2 ring-primary/20 shadow-sm bg-primary/[0.02]"
          : "border-border hover:border-border/80 hover:shadow-2xs"
      )}
    >
      {/* Top row: Reference, category, and status badge */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="font-mono text-xs font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded border border-primary/20 shrink-0">
            {report.reference}
          </span>
          <span className="flex items-center gap-1 text-xs text-muted-foreground truncate">
            <CategoryIcon className="size-3 text-primary shrink-0" aria-hidden="true" />
            <span className="truncate">{categoryLabel}</span>
          </span>
        </div>
        <StatusBadge status={report.status} />
      </div>

      {/* Title */}
      <h3 className="font-semibold text-sm leading-snug line-clamp-2 text-foreground">
        {report.title}
      </h3>

      {/* Description Snippet */}
      <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
        {report.description}
      </p>

      {/* Metadata & Actions */}
      <div className="flex items-center justify-between pt-1 border-t border-border/50 text-xs">
        <div className="flex items-center gap-3 text-muted-foreground text-[11px]">
          <span className="flex items-center gap-1">
            <Calendar className="size-3" aria-hidden="true" />
            <span>{formatReportDate(report.createdAt)}</span>
          </span>
          <span className="flex items-center gap-1 font-medium text-foreground">
            <ThumbsUp className="size-3 text-emerald-600" aria-hidden="true" />
            <span>{report.supportCount}</span>
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onFocus(report.id)}
            className="h-7 px-2 text-xs text-primary hover:text-primary hover:bg-primary/10 gap-1"
            title="Focus issue on map"
          >
            <MapPin className="size-3" aria-hidden="true" />
            <span>Map</span>
          </Button>

          <Link
            href={`/reports/${report.id}` as unknown as Route}
            className="inline-flex items-center gap-1 h-7 px-2.5 rounded-md text-xs font-medium bg-muted hover:bg-muted/80 text-foreground transition-colors"
          >
            <span>Details</span>
            <ArrowRight className="size-3" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </article>
  );
}
