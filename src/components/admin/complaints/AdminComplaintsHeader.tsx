import { RefreshCw, Database, AlertOctagon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface AdminComplaintsHeaderProps {
  total: number;
  urgentCount: number;
  isDemoData?: boolean;
  isRefreshing?: boolean;
  onRefresh: () => void;
}

export function AdminComplaintsHeader({
  total,
  urgentCount,
  isDemoData,
  isRefreshing,
  onRefresh,
}: AdminComplaintsHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-border/80">
      <div className="space-y-1 min-w-0">
        <div className="flex items-center gap-2.5 flex-wrap">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground truncate">
            Manage Complaints
          </h1>
          <Badge
            variant="outline"
            className="text-xs border-primary/30 text-primary bg-primary/5 font-semibold"
          >
            {total} {total === 1 ? "Complaint" : "Complaints"}
          </Badge>
          {urgentCount > 0 && (
            <Badge
              variant="outline"
              className="text-xs border-destructive/40 text-destructive bg-destructive/10 font-bold gap-1"
            >
              <AlertOctagon className="size-3" aria-hidden="true" />
              <span>{urgentCount} Urgent</span>
            </Badge>
          )}
        </div>
        <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed max-w-3xl">
          Review reported civic issues, identify urgent complaints and organize the resolution workload.
        </p>
      </div>

      <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
        {isDemoData && (
          <Badge
            variant="outline"
            className="text-[10px] border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300 gap-1"
            title="Authoritative backend REST endpoint GET /api/reports?scope=admin is unprovisioned. Showing isolated development fixtures."
          >
            <Database className="size-2.5" aria-hidden="true" />
            <span>Demo Data</span>
          </Badge>
        )}

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onRefresh}
          disabled={isRefreshing}
          aria-label="Refresh complaints queue"
          className="text-xs gap-1.5 h-8"
        >
          <RefreshCw
            className={`size-3.5 ${isRefreshing ? "animate-spin" : ""}`}
            aria-hidden="true"
          />
          <span>{isRefreshing ? "Refreshing..." : "Refresh"}</span>
        </Button>
      </div>
    </div>
  );
}
