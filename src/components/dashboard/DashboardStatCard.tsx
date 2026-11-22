import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface DashboardStatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  description?: string;
  tone?: "default" | "warning" | "info" | "success";
  className?: string;
}

const toneStyles = {
  default: "bg-primary/10 text-primary border-primary/20",
  warning: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  info: "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20",
  success: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
};

export function DashboardStatCard({
  label,
  value,
  icon: Icon,
  description,
  tone = "default",
  className,
}: DashboardStatCardProps) {
  return (
    <Card className={cn("overflow-hidden transition-all hover:shadow-sm border-border", className)}>
      <CardContent className="p-5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-medium text-muted-foreground truncate">{label}</span>
          <span
            className={cn(
              "flex size-9 shrink-0 items-center justify-center rounded-xl border",
              toneStyles[tone]
            )}
            aria-hidden="true"
          >
            <Icon className="size-4" />
          </span>
        </div>
        <div className="mt-3">
          <span className="text-3xl font-bold tracking-tight text-foreground tabular-nums">
            {value}
          </span>
        </div>
        {description && (
          <p className="mt-1 text-xs text-muted-foreground truncate">{description}</p>
        )}
      </CardContent>
    </Card>
  );
}
