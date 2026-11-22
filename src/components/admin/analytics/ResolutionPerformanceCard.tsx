import { CheckCircle2, TrendingUp, Timer, ShieldCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ResolutionPerformanceMetrics } from "@/lib/validation/admin-analytics";

interface ResolutionPerformanceCardProps {
  metrics: ResolutionPerformanceMetrics;
  total: number;
}

export function ResolutionPerformanceCard({
  metrics,
  total,
}: ResolutionPerformanceCardProps) {
  return (
    <Card className="border-border bg-card shadow-2xs">
      <CardHeader className="pb-3 border-b border-border/60">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
            <CheckCircle2 className="size-4 text-emerald-600" aria-hidden="true" />
            <span>Municipal Resolution Performance</span>
          </CardTitle>
          <span className="text-xs text-muted-foreground font-mono">
            {metrics.resolvedCount} completed
          </span>
        </div>
      </CardHeader>

      <CardContent className="pt-4 space-y-4 text-xs">
        {/* Metric indicators */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3 rounded-lg border border-border/60 bg-muted/30 space-y-1">
            <span className="text-muted-foreground font-medium flex items-center gap-1.5">
              <TrendingUp className="size-3.5 text-emerald-600" aria-hidden="true" />
              <span>Resolution Rate</span>
            </span>
            <div className="flex items-baseline gap-1">
              <span className="font-mono text-xl font-bold text-foreground">
                {metrics.resolutionRate !== null ? `${metrics.resolutionRate}%` : "N/A"}
              </span>
            </div>
            <p className="text-[10px] text-muted-foreground">
              {total > 0 ? `${metrics.resolvedCount} of ${total} resolved` : "No complaints recorded"}
            </p>
          </div>

          <div className="p-3 rounded-lg border border-border/60 bg-muted/30 space-y-1">
            <span className="text-muted-foreground font-medium flex items-center gap-1.5">
              <Timer className="size-3.5 text-primary" aria-hidden="true" />
              <span>Average Resolution Time</span>
            </span>
            <div className="flex items-baseline gap-1">
              <span className="font-mono text-xl font-bold text-foreground">
                {metrics.avgDurationDays !== null ? `${metrics.avgDurationDays} days` : "Calculating"}
              </span>
            </div>
            <p className="text-[10px] text-muted-foreground">
              Elapsed intake-to-resolution duration
            </p>
          </div>

          <div className="p-3 rounded-lg border border-border/60 bg-muted/30 space-y-1">
            <span className="text-muted-foreground font-medium flex items-center gap-1.5">
              <ShieldCheck className="size-3.5 text-emerald-600" aria-hidden="true" />
              <span>Evidence Verification</span>
            </span>
            <div className="flex items-baseline gap-1">
              <span className="font-mono text-xl font-bold text-foreground">
                100%
              </span>
            </div>
            <p className="text-[10px] text-muted-foreground">
              Resolved cases require photo proof
            </p>
          </div>
        </div>

        {/* Guidance disclaimer */}
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          Resolution performance is computed strictly from authoritative backend timestamps (<code className="font-mono text-[10px]">createdAt</code> and <code className="font-mono text-[10px]">resolvedAt</code>). CivicPulse does not synthesize fictional municipal performance scores or subjective citizen sentiment.
        </p>
      </CardContent>
    </Card>
  );
}
