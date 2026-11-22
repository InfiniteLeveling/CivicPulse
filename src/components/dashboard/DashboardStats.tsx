import {
  ClipboardList,
  Clock3,
  CircleDashed,
  CircleCheck,
} from "lucide-react";
import type { ComplaintStats } from "@/types/domain";
import { DashboardStatCard } from "./DashboardStatCard";

interface DashboardStatsProps {
  stats: ComplaintStats;
}

export function DashboardStats({ stats }: DashboardStatsProps) {
  const resolutionText =
    stats.resolutionRate !== null
      ? `${stats.resolutionRate}% resolution rate`
      : stats.total === 0
      ? "No complaints yet"
      : "Pending completion";

  return (
    <section aria-label="Complaints Statistics" className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold tracking-tight text-foreground">
          Complaint Overview
        </h2>
        <span className="text-xs text-muted-foreground">
          Updated in real time
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <DashboardStatCard
          label="Total Reported"
          value={stats.total}
          icon={ClipboardList}
          description="Total civic issues submitted"
          tone="default"
        />

        <DashboardStatCard
          label="Pending Review"
          value={stats.pending}
          icon={Clock3}
          description="Awaiting department assignment"
          tone="warning"
        />

        <DashboardStatCard
          label="In Progress"
          value={stats.inProgress}
          icon={CircleDashed}
          description="Under active municipal work"
          tone="info"
        />

        <DashboardStatCard
          label="Resolved"
          value={stats.resolved}
          icon={CircleCheck}
          description={resolutionText}
          tone="success"
        />
      </div>
    </section>
  );
}
