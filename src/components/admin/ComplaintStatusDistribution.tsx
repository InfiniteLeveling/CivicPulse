import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PieChart } from "lucide-react";
import {
  type AdminStatsResponse,
  calculateStatusDistribution,
} from "@/lib/validation/admin-stats";

interface ComplaintStatusDistributionProps {
  stats: AdminStatsResponse;
}

export function ComplaintStatusDistribution({
  stats,
}: ComplaintStatusDistributionProps) {
  const distribution = calculateStatusDistribution(stats);
  const hasData = stats.total > 0;

  return (
    <Card className="border-border shadow-xs">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <PieChart className="size-4 text-primary" aria-hidden="true" />
            <CardTitle className="text-base font-semibold text-foreground">
              Status Distribution
            </CardTitle>
          </div>
          <Badge variant="outline" className="text-xs">
            {stats.total} total
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {hasData ? (
          <>
            {/* Segmented Progress Bar */}
            <div
              className="h-3 w-full rounded-full bg-muted flex overflow-hidden"
              role="img"
              aria-label={`Status distribution: Pending ${distribution.pending.percentage}%, In Progress ${distribution.inProgress.percentage}%, Resolved ${distribution.resolved.percentage}%`}
            >
              {distribution.pending.percentage > 0 && (
                <div
                  className="bg-amber-500 transition-all duration-300"
                  style={{ width: `${distribution.pending.percentage}%` }}
                  title={`Pending: ${distribution.pending.count} (${distribution.pending.percentage}%)`}
                />
              )}
              {distribution.inProgress.percentage > 0 && (
                <div
                  className="bg-primary transition-all duration-300"
                  style={{ width: `${distribution.inProgress.percentage}%` }}
                  title={`In Progress: ${distribution.inProgress.count} (${distribution.inProgress.percentage}%)`}
                />
              )}
              {distribution.resolved.percentage > 0 && (
                <div
                  className="bg-emerald-600 transition-all duration-300"
                  style={{ width: `${distribution.resolved.percentage}%` }}
                  title={`Resolved: ${distribution.resolved.count} (${distribution.resolved.percentage}%)`}
                />
              )}
            </div>

            {/* Status Breakdown Legend & Counts */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              {/* Pending */}
              <div className="flex items-center justify-between p-2.5 rounded-lg border border-amber-500/20 bg-amber-500/5">
                <div className="flex items-center gap-2">
                  <span className="size-2 rounded-full bg-amber-500" aria-hidden="true" />
                  <span className="text-xs font-medium text-foreground">Pending</span>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-foreground tabular-nums">
                    {distribution.pending.count}
                  </span>
                  <span className="text-[10px] text-muted-foreground ml-1">
                    ({distribution.pending.percentage}%)
                  </span>
                </div>
              </div>

              {/* In Progress */}
              <div className="flex items-center justify-between p-2.5 rounded-lg border border-primary/20 bg-primary/5">
                <div className="flex items-center gap-2">
                  <span className="size-2 rounded-full bg-primary" aria-hidden="true" />
                  <span className="text-xs font-medium text-foreground">In Progress</span>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-foreground tabular-nums">
                    {distribution.inProgress.count}
                  </span>
                  <span className="text-[10px] text-muted-foreground ml-1">
                    ({distribution.inProgress.percentage}%)
                  </span>
                </div>
              </div>

              {/* Resolved */}
              <div className="flex items-center justify-between p-2.5 rounded-lg border border-emerald-500/20 bg-emerald-500/5">
                <div className="flex items-center gap-2">
                  <span className="size-2 rounded-full bg-emerald-600" aria-hidden="true" />
                  <span className="text-xs font-medium text-foreground">Resolved</span>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-foreground tabular-nums">
                    {distribution.resolved.count}
                  </span>
                  <span className="text-[10px] text-muted-foreground ml-1">
                    ({distribution.resolved.percentage}%)
                  </span>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="py-6 text-center text-xs text-muted-foreground">
            No complaints recorded yet. Status distribution will appear as reports are submitted.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
