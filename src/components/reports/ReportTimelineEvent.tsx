import { Clock3, CircleDashed, CircleCheck } from "lucide-react";
import type { StatusHistory } from "@/types/domain";
import { formatReportDateTime } from "@/lib/reports/formatting";
import { cn } from "@/lib/utils";

interface ReportTimelineEventProps {
  event: StatusHistory;
  isLast?: boolean;
}

const eventTypeLabels: Record<StatusHistory["eventType"], string> = {
  submitted: "Report Submitted",
  triaged: "Municipal Triage & Assignment",
  status_changed: "Status Updated",
  feedback_reviewed: "Citizen Feedback Processed",
};

export function ReportTimelineEvent({
  event,
  isLast = false,
}: ReportTimelineEventProps) {
  const isResolved = event.newStatus === "resolved";
  const isInProgress = event.newStatus === "in_progress";

  const Icon = isResolved
    ? CircleCheck
    : isInProgress
    ? CircleDashed
    : Clock3;

  const toneClass = isResolved
    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
    : isInProgress
    ? "bg-primary/10 text-primary border-primary/20"
    : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20";

  return (
    <div className="relative flex items-start gap-3 sm:gap-4 group">
      {/* Connector line */}
      {!isLast && (
        <span
          className="absolute left-[17px] top-9 -bottom-3 w-[2px] bg-border/70"
          aria-hidden="true"
        />
      )}

      {/* Step Icon */}
      <span
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-xl border shadow-2xs z-10",
          toneClass
        )}
        aria-hidden="true"
      >
        <Icon className="size-4" />
      </span>

      {/* Event Details */}
      <div className="flex-1 min-w-0 pt-0.5 space-y-1">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
          <h4 className="text-xs sm:text-sm font-semibold text-foreground">
            {eventTypeLabels[event.eventType] || "Status Update"}
          </h4>
          <time className="text-[11px] text-muted-foreground whitespace-nowrap">
            {formatReportDateTime(event.createdAt)}
          </time>
        </div>

        {event.newStatus && (
          <p className="text-xs font-medium text-foreground/80">
            Current Stage:{" "}
            <span className="capitalize">
              {event.newStatus.replace("_", " ")}
            </span>
          </p>
        )}

        {event.remark && (
          <div className="pt-1">
            <p className="text-xs text-muted-foreground bg-muted/40 p-2.5 rounded-lg border border-border/50 leading-relaxed break-words">
              {event.remark}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
