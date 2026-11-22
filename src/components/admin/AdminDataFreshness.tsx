import { Clock, Database } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatReportTime } from "@/lib/reports/formatting";

interface AdminDataFreshnessProps {
  lastRefreshedAt: string;
  isDemoData?: boolean;
}

export function AdminDataFreshness({
  lastRefreshedAt,
  isDemoData,
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

      {isDemoData && (
        <Badge
          variant="outline"
          className="text-[10px] border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300 gap-1"
          title="Authoritative backend REST endpoint GET /api/stats?scope=admin is unprovisioned. Showing isolated development fixtures."
        >
          <Database className="size-2.5" aria-hidden="true" />
          <span>Demo Data / Unprovisioned Backend</span>
        </Badge>
      )}
    </div>
  );
}
