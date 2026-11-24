import { Clock } from "lucide-react";
import { formatReportTime } from "@/lib/reports/formatting";

interface AdminDataFreshnessProps {
  lastRefreshedAt: string;
  isDemoData?: boolean;
}

export function AdminDataFreshness({
  lastRefreshedAt,
}: AdminDataFreshnessProps) {
  const timeFormatted = formatReportTime(lastRefreshedAt);

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Clock className="size-3.5 text-muted-foreground" aria-hidden="true" />
        <span>
          Last refreshed:{" "}
          <strong className="text-foreground font-medium">
            {timeFormatted || "Just now"}
          </strong>
        </span>
      </div>
    </div>
  );
}
