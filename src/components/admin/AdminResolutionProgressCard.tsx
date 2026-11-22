import { TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface AdminResolutionProgressCardProps {
  resolutionRate: number | null;
  total: number;
  resolved: number;
}

export function AdminResolutionProgressCard({
  resolutionRate,
  total,
  resolved,
}: AdminResolutionProgressCardProps) {
  const hasData = total > 0 && resolutionRate !== null;

  return (
    <Card className="border-border shadow-xs border-l-4 border-l-emerald-500">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
            <TrendingUp className="size-3.5" aria-hidden="true" />
            <span>Caseload Progress</span>
          </span>
          <Badge
            variant="outline"
            className="border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-[10px]"
          >
            {hasData ? `${resolved} of ${total} closed` : "Zero reports logged"}
          </Badge>
        </div>
        <CardTitle className="text-base font-semibold text-foreground pt-1">
          Resolution Rate
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-baseline gap-3">
          <span className="text-3xl font-bold tracking-tight text-foreground tabular-nums">
            {hasData ? `${resolutionRate}%` : "—"}
          </span>
          <span className="text-xs text-muted-foreground">
            {hasData
              ? "of all recorded complaints resolved"
              : "No complaints recorded yet"}
          </span>
        </div>

        {/* Progress Bar */}
        <div className="space-y-1">
          <div
            className="h-2.5 w-full rounded-full bg-muted overflow-hidden"
            role="progressbar"
            aria-valuenow={hasData ? resolutionRate : 0}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Municipal complaint resolution progress percentage"
          >
            <div
              className="h-full bg-emerald-600 transition-all duration-300 rounded-full"
              style={{ width: `${hasData ? resolutionRate : 0}%` }}
            />
          </div>
        </div>

        <p className="text-xs text-muted-foreground leading-relaxed">
          Calculated as verified resolved cases over total complaints recorded across all departments.
        </p>
      </CardContent>
    </Card>
  );
}
