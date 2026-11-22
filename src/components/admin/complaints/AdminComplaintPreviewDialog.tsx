"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  X,
  MapPin,
  ExternalLink,
  Calendar,
  ThumbsUp,
  Building2,
  Info,
} from "lucide-react";
import { StatusBadge } from "@/components/common/StatusBadge";
import { SeverityBadge } from "@/components/common/SeverityBadge";
import { AdminPriorityCell } from "./AdminPriorityCell";
import { Button } from "@/components/ui/button";
import { formatReportDateTime } from "@/lib/reports/formatting";
import { CATEGORY_LABELS } from "@/lib/constants";
import type { ComplaintSummary } from "@/types/domain";

interface AdminComplaintPreviewDialogProps {
  report: ComplaintSummary | null;
  open: boolean;
  onClose: () => void;
}

export function AdminComplaintPreviewDialog({
  report,
  open,
  onClose,
}: AdminComplaintPreviewDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && open) {
        onClose();
      }
    }

    if (open) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open || !report) return null;

  const categoryLabel = CATEGORY_LABELS[report.category] ?? report.category;
  const osmUrl = `https://www.openstreetmap.org/?mlat=${report.latitude}&mlon=${report.longitude}#map=16/${report.latitude}/${report.longitude}`;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="preview-dialog-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Dialog Content */}
      <div
        ref={dialogRef}
        className="relative w-full max-w-2xl bg-card border border-border rounded-xl shadow-2xl p-6 overflow-y-auto max-h-[90vh] z-10 space-y-5 animate-in fade-in-0 zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-border/80 pb-4">
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-xs font-bold text-primary px-2 py-0.5 rounded bg-primary/10">
                {report.reference}
              </span>
              <StatusBadge status={report.status} />
              <SeverityBadge severity={report.severity} />
            </div>
            <h2
              id="preview-dialog-title"
              className="text-lg font-bold text-foreground pt-1 leading-snug"
            >
              {report.title}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close complaint inspection dialog"
            className="size-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>

        {/* Priority & Metadata Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-lg border border-border bg-muted/30">
          <div>
            <span className="text-[10px] uppercase font-bold text-muted-foreground block">
              Priority Score
            </span>
            <div className="mt-1">
              <AdminPriorityCell
                priority={report.priority}
                severity={report.severity}
              />
            </div>
          </div>

          <div>
            <span className="text-[10px] uppercase font-bold text-muted-foreground block">
              Category
            </span>
            <span className="text-xs font-semibold text-foreground block mt-1">
              {categoryLabel}
            </span>
          </div>

          <div>
            <span className="text-[10px] uppercase font-bold text-muted-foreground block">
              Community Support
            </span>
            <span className="text-xs font-semibold text-foreground flex items-center gap-1 mt-1">
              <ThumbsUp className="size-3 text-primary" aria-hidden="true" />
              <span>{report.supportCount} citizens</span>
            </span>
          </div>

          <div>
            <span className="text-[10px] uppercase font-bold text-muted-foreground block">
              Department
            </span>
            <span className="text-xs font-semibold text-foreground flex items-center gap-1 mt-1 truncate">
              <Building2 className="size-3 text-muted-foreground shrink-0" aria-hidden="true" />
              <span>{report.department?.name || "Unassigned"}</span>
            </span>
          </div>
        </div>

        {/* Description */}
        <div className="space-y-1.5">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Description
          </h3>
          <p className="text-xs sm:text-sm text-foreground leading-relaxed whitespace-pre-wrap rounded-lg bg-muted/20 p-3 border border-border/60">
            {report.description}
          </p>
        </div>

        {/* Location & Image Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Location Info */}
          <div className="space-y-1.5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Location Coordinates
            </h3>
            <div className="p-3 rounded-lg border border-border/80 bg-muted/20 space-y-2">
              <div className="flex items-center gap-2 text-xs text-foreground font-mono">
                <MapPin className="size-3.5 text-primary shrink-0" aria-hidden="true" />
                <span>
                  {report.latitude.toFixed(5)}°, {report.longitude.toFixed(5)}°
                </span>
              </div>
              <a
                href={osmUrl}
                target="_blank"
                rel="noreferrer noopener"
                className="inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline"
              >
                <span>View on OpenStreetMap</span>
                <ExternalLink className="size-2.5" aria-hidden="true" />
              </a>
            </div>
          </div>

          {/* Image Preview (if present) */}
          <div className="space-y-1.5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Attached Photograph
            </h3>
            {report.imageUrl ? (
              <div className="relative aspect-video rounded-lg overflow-hidden border border-border bg-slate-900">
                <Image
                  src={report.imageUrl}
                  alt={`Photo attached to complaint ${report.reference}`}
                  fill
                  className="object-cover"
                />
              </div>
            ) : (
              <div className="p-3 rounded-lg border border-border/60 bg-muted/10 text-center text-xs text-muted-foreground italic h-24 flex items-center justify-center">
                No photograph attached
              </div>
            )}
          </div>
        </div>

        {/* Timestamps */}
        <div className="flex items-center gap-4 text-[11px] text-muted-foreground border-t border-border/60 pt-3 flex-wrap">
          <span className="flex items-center gap-1">
            <Calendar className="size-3" aria-hidden="true" />
            <span>Reported: {formatReportDateTime(report.createdAt)}</span>
          </span>
          <span>·</span>
          <span>Last Updated: {formatReportDateTime(report.updatedAt)}</span>
        </div>

        {/* Phase 19 Notice */}
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 flex items-center gap-2.5 text-xs text-foreground">
          <Info className="size-4 text-primary shrink-0" aria-hidden="true" />
          <span>
            Direct administrative triage, department reassignment, and status mutation workflows activate in <strong>Phase 19</strong>.
          </span>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose} size="sm" className="text-xs">
            Close Inspection
          </Button>
          <Link
            href={`/admin/complaints/${report.id}`}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors shadow-xs"
          >
            <span>Open Triage Workspace</span>
            <ExternalLink className="size-3.5" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </div>
  );
}
