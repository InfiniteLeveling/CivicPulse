import Link from "next/link";
import { ArrowLeft, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/common/StatusBadge";
import { SeverityBadge } from "@/components/common/SeverityBadge";
import { formatReportDateTime } from "@/lib/reports/formatting";
import type { ComplaintSummary } from "@/types/domain";

interface AdminComplaintHeaderProps {
  report: ComplaintSummary;
  version: number;
  onRefresh: () => void;
  isRefreshing?: boolean;
}

export function AdminComplaintHeader({
  report,
  version,
  onRefresh,
  isRefreshing = false,
}: AdminComplaintHeaderProps) {
  return (
    <div className="space-y-3 pb-4 border-b border-border/80">
      {/* Navigation & Actions Row */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <Link
          href="/admin/complaints"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors group"
        >
          <ArrowLeft className="size-3.5 transition-transform group-hover:-translate-x-0.5" aria-hidden="true" />
          <span>Back to Complaints Queue</span>
        </Link>

        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-muted text-muted-foreground border border-border/60">
            v{version}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={isRefreshing}
            aria-label="Refresh complaint details"
            className="h-8 px-2.5 text-xs gap-1.5"
          >
            <RefreshCw
              className={`size-3.5 ${isRefreshing ? "animate-spin text-primary" : "text-muted-foreground"}`}
              aria-hidden="true"
            />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
        </div>
      </div>

      {/* Title & Badges Row */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="font-mono text-sm font-bold text-primary px-2.5 py-0.5 rounded-md bg-primary/10 border border-primary/20">
              {report.reference}
            </span>
            <StatusBadge status={report.status} />
            <SeverityBadge severity={report.severity} source={report.severityReviewed ? "admin" : undefined} />
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight pt-1">
            {report.title}
          </h1>
        </div>

        <div className="text-xs text-muted-foreground shrink-0 sm:text-right">
          <div>Reported: {formatReportDateTime(report.createdAt)}</div>
          <div className="text-[11px] text-muted-foreground/80">
            Last Updated: {formatReportDateTime(report.updatedAt)}
          </div>
        </div>
      </div>
    </div>
  );
}
