import {
  ClipboardList,
  Clock,
  LoaderCircle,
  CheckCircle2,
  AlertOctagon,
  TrendingUp,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { AdminAnalyticsData } from "@/lib/validation/admin-analytics";

interface AnalyticsMetricsGridProps {
  data: AdminAnalyticsData;
}

export function AnalyticsMetricsGrid({ data }: AnalyticsMetricsGridProps) {
  const cards = [
    {
      title: "Total Complaints",
      value: data.total,
      description: "Lifetime municipal intake",
      icon: ClipboardList,
      color: "text-primary",
      bg: "bg-primary/10 border-primary/20",
    },
    {
      title: "Pending Intake",
      value: data.pending,
      description: "Awaiting triage review",
      icon: Clock,
      color: "text-amber-600",
      bg: "bg-amber-500/10 border-amber-500/20",
    },
    {
      title: "In Progress",
      value: data.inProgress,
      description: "Actively assigned & underway",
      icon: LoaderCircle,
      color: "text-blue-600",
      bg: "bg-blue-500/10 border-blue-500/20",
    },
    {
      title: "Verified Resolved",
      value: data.resolved,
      description: "Repaired & verified closed",
      icon: CheckCircle2,
      color: "text-emerald-600",
      bg: "bg-emerald-500/10 border-emerald-500/20",
    },
    {
      title: "Urgent Workload",
      value: data.criticalActive,
      description: "Critical hazard or priority ≥70",
      icon: AlertOctagon,
      color: "text-rose-600",
      bg: "bg-rose-500/10 border-rose-500/20",
      badge: data.criticalActive > 0 ? "Immediate" : "Clear",
    },
    {
      title: "Resolution Rate",
      value: data.resolutionRate !== null ? `${data.resolutionRate}%` : "No data",
      description: data.total > 0 ? `${data.resolved} of ${data.total} completed` : "Zero reports recorded",
      icon: TrendingUp,
      color: "text-emerald-600",
      bg: "bg-emerald-500/10 border-emerald-500/20",
      progress: data.resolutionRate,
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
      {cards.map((c) => {
        const Icon = c.icon;
        return (
          <Card key={c.title} className="border-border shadow-2xs">
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground truncate">
                  {c.title}
                </span>
                <div className={`size-7 rounded-lg flex items-center justify-center border shrink-0 ${c.bg}`}>
                  <Icon className={`size-3.5 ${c.color}`} aria-hidden="true" />
                </div>
              </div>

              <div className="flex items-baseline justify-between">
                <span className="text-xl sm:text-2xl font-bold font-mono text-foreground">
                  {c.value}
                </span>
                {c.badge && (
                  <Badge
                    variant={data.criticalActive > 0 ? "destructive" : "outline"}
                    className="text-[10px] px-1.5 py-0"
                  >
                    {c.badge}
                  </Badge>
                )}
              </div>

              {typeof c.progress === "number" && (
                <div className="w-full bg-muted/60 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(100, Math.max(0, c.progress))}%` }}
                  />
                </div>
              )}

              <p className="text-[11px] text-muted-foreground truncate">
                {c.description}
              </p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
