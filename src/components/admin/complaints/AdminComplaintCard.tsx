import { Eye, Calendar, ThumbsUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/common/StatusBadge";
import { SeverityBadge } from "@/components/common/SeverityBadge";
import { AdminPriorityCell } from "./AdminPriorityCell";
import { formatReportDate } from "@/lib/reports/formatting";
import { CATEGORY_LABELS } from "@/lib/constants";
import type { ComplaintSummary } from "@/types/domain";

interface AdminComplaintCardProps {
  report: ComplaintSummary;
  onInspect: (report: ComplaintSummary) => void;
}

export function AdminComplaintCard({
  report,
  onInspect,
}: AdminComplaintCardProps) {
  const categoryLabel = CATEGORY_LABELS[report.category] ?? report.category;

  return (
    <article
      className="rounded-xl border border-border bg-card p-4 space-y-3 shadow-2xs hover:border-border/80 transition-all"
      aria-label={`Complaint ${report.reference}`}
    >
      {/* Top Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-1">
          <span className="font-mono text-xs font-bold text-primary">
            {report.reference}
          </span>
          <h3 className="text-sm font-semibold text-foreground leading-snug line-clamp-2">
            {report.title}
          </h3>
        </div>
        <div className="shrink-0">
          <AdminPriorityCell
            priority={report.priority}
            severity={report.severity}
          />
        </div>
      </div>

      {/* Badges Row */}
      <div className="flex items-center gap-2 flex-wrap">
        <StatusBadge status={report.status} />
        <SeverityBadge severity={report.severity} />
        <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
          {categoryLabel}
        </span>
      </div>

      {/* Metadata & Actions */}
      <div className="flex items-center justify-between border-t border-border/60 pt-2.5 text-[11px] text-muted-foreground">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="flex items-center gap-1">
            <Calendar className="size-3" aria-hidden="true" />
            <span>{formatReportDate(report.createdAt)}</span>
          </span>
          <span className="flex items-center gap-1">
            <ThumbsUp className="size-3" aria-hidden="true" />
            <span>{report.supportCount}</span>
          </span>
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onInspect(report)}
          aria-label={`Inspect complaint ${report.reference}`}
          className="h-7 px-2.5 text-xs gap-1"
        >
          <Eye className="size-3" aria-hidden="true" />
          <span>Inspect</span>
        </Button>
      </div>
    </article>
  );
}
