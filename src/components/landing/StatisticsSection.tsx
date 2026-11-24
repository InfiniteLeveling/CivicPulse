import { BarChart3, Clock, CheckCircle2, FileText } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export interface PublicMetricsSummary {
  total: number;
  pending: number;
  inProgress: number;
  resolved: number;
}

export function StatisticsSection({ stats }: { stats?: PublicMetricsSummary | null }) {
  if (!stats || stats.total === 0) {
    return null;
  }

  const resolutionRate =
    stats.total > 0 ? `${Math.round((stats.resolved / stats.total) * 100)}%` : "0%";

  const metrics = [
    {
      icon: FileText,
      label: "Total Public Reports",
      value: String(stats.total),
      description: "Verified issues visible on the community civic map",
    },
    {
      icon: Clock,
      label: "In Progress",
      value: String(stats.inProgress),
      description: "Active issues currently assigned to municipal departments",
    },
    {
      icon: CheckCircle2,
      label: "Resolved Issues",
      value: String(stats.resolved),
      description: "Completed repairs backed by resolution evidence",
    },
    {
      icon: BarChart3,
      label: "Resolution Rate",
      value: resolutionRate,
      description: "Share of public reports marked resolved",
    },
  ];

  return (
    <section
      id="statistics"
      tabIndex={-1}
      aria-labelledby="statistics-title"
      className="border-t bg-muted/40 py-12"
    >
      <div className="content-container">
        <div>
          <h2 id="statistics-title" className="text-2xl font-bold tracking-tight">
            Live Community Statistics
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Real-time public complaint counts and municipal resolution metrics.
          </p>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {metrics.map((metric) => {
            const Icon = metric.icon;
            return (
              <Card key={metric.label} className="border bg-card">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-muted-foreground">
                      {metric.label}
                    </span>
                    <Icon className="size-5 text-primary" aria-hidden="true" />
                  </div>
                  <p className="mt-3 text-3xl font-bold tabular-nums text-foreground">
                    {metric.value}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {metric.description}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}
