import {
  ClipboardList,
  Clock3,
  CircleDashed,
  CircleCheck,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface MyReportsSummaryProps {
  stats: {
    total: number;
    pending: number;
    inProgress: number;
    resolved: number;
  };
}

const toneStyles = {
  default: "bg-primary/10 text-primary border-primary/20",
  warning: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  info: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  success: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
};

export function MyReportsSummary({ stats }: MyReportsSummaryProps) {
  const cards = [
    {
      label: "Total Complaints",
      value: stats.total,
      icon: ClipboardList,
      description: "All personal reports submitted",
      tone: "default" as const,
    },
    {
      label: "Pending Review",
      value: stats.pending,
      icon: Clock3,
      description: "Awaiting triage by authority",
      tone: "warning" as const,
    },
    {
      label: "In Progress",
      value: stats.inProgress,
      icon: CircleDashed,
      description: "Active maintenance underway",
      tone: "info" as const,
    },
    {
      label: "Resolved",
      value: stats.resolved,
      icon: CircleCheck,
      description: "Repaired or completed issues",
      tone: "success" as const,
    },
  ];

  return (
    <section aria-label="Complaints Summary" className="space-y-3">
      <h2 className="sr-only">Complaints Summary Statistics</h2>
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <Card
              key={c.label}
              className="border-border shadow-xs transition-shadow hover:shadow-sm"
            >
              <CardContent className="p-4 sm:p-5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs sm:text-sm font-medium text-muted-foreground truncate">
                    {c.label}
                  </span>
                  <span
                    className={cn(
                      "flex size-8 sm:size-9 shrink-0 items-center justify-center rounded-xl border",
                      toneStyles[c.tone]
                    )}
                    aria-hidden="true"
                  >
                    <Icon className="size-4" />
                  </span>
                </div>
                <div className="mt-2 sm:mt-3">
                  <span className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground tabular-nums">
                    {c.value}
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground truncate hidden sm:block">
                  {c.description}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
