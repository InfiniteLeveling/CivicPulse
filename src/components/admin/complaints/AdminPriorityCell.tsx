import { AlertOctagon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { PriorityBreakdown } from "@/types/domain";

interface AdminPriorityCellProps {
  priority?: PriorityBreakdown | null;
  severity?: string;
}

export function AdminPriorityCell({ priority, severity }: AdminPriorityCellProps) {
  if (!priority || typeof priority.score !== "number") {
    return <span className="text-xs text-muted-foreground italic">Not available</span>;
  }

  const isUrgent =
    priority.urgent === true ||
    severity === "critical" ||
    priority.score >= 70;

  const band =
    priority.score < 40 ? "Low" : priority.score < 70 ? "Medium" : "High";

  const scoreColor =
    priority.score >= 70
      ? "text-destructive font-bold"
      : priority.score >= 40
      ? "text-amber-600 dark:text-amber-400 font-semibold"
      : "text-muted-foreground font-medium";

  return (
    <div className="flex flex-col gap-1 items-start">
      <div className="flex items-center gap-1.5">
        <span className={`text-xs tabular-nums ${scoreColor}`}>
          {priority.score}
        </span>
        <span className="text-[10px] text-muted-foreground">({band})</span>
      </div>

      {isUrgent && (
        <Badge
          variant="outline"
          className="text-[10px] font-bold px-1.5 py-0 border-destructive/40 text-destructive bg-destructive/10 gap-1 uppercase tracking-wider"
        >
          <AlertOctagon className="size-2.5" aria-hidden="true" />
          <span>Urgent</span>
        </Badge>
      )}
    </div>
  );
}
