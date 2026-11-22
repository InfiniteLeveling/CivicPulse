import { BarChart3, Clock, CheckCircle2, ShieldCheck } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface MetricItem {
  icon: typeof BarChart3;
  label: string;
  value: string;
  description: string;
}

const illustrativeMetrics: MetricItem[] = [
  {
    icon: CheckCircle2,
    label: "Demo Resolution Rate",
    value: "84%",
    description: "Sample simulated resolution across pilot issues",
  },
  {
    icon: Clock,
    label: "Average Triage Time",
    value: "< 24h",
    description: "Target acknowledgment window for community reports",
  },
  {
    icon: ShieldCheck,
    label: "Verification Accuracy",
    value: "92%",
    description: "Assisted category precision verified by human review",
  },
  {
    icon: BarChart3,
    label: "Active Test Cases",
    value: "150+",
    description: "Synthetic test records in the development sandbox",
  },
];

/**
 * StatisticsSection – Illustrative demo metrics component (Option B).
 *
 * Per Phase 3 requirements:
 * If an actual backend endpoint exists with verified data, real statistics are shown.
 * When no live municipal integration is present, metrics MUST be clearly labeled
 * as illustrative demo data (Option B) or omitted entirely (Option A).
 */
export function StatisticsSection({ showDemo = false }: { showDemo?: boolean }) {
  if (!showDemo) {
    // Option A: Omit from public landing page until backed by verified production data.
    return null;
  }

  return (
    <section
      id="statistics"
      tabIndex={-1}
      aria-labelledby="statistics-title"
      className="border-t bg-muted/40 py-12"
    >
      <div className="content-container">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="demo-stamp">Illustrative Demo Metrics</span>
            </div>
            <h2 id="statistics-title" className="mt-2 text-2xl font-bold tracking-tight">
              Platform Performance Overview
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Simulated indicators for development preview. Not measured production data.
            </p>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {illustrativeMetrics.map((metric) => {
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
