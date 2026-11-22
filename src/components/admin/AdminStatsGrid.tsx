import { ClipboardList, Clock3, LoaderCircle, CheckCircle2 } from "lucide-react";
import type { AdminStatsResponse } from "@/lib/validation/admin-stats";
import { AdminStatCard } from "./AdminStatCard";

interface AdminStatsGridProps {
  stats: AdminStatsResponse;
}

export function AdminStatsGrid({ stats }: AdminStatsGridProps) {
  return (
    <section aria-label="Main Complaint Statistics" className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <AdminStatCard
          label="Total Complaints"
          value={stats.total}
          icon={ClipboardList}
          description="Total municipal issues logged"
          tone="default"
        />
        <AdminStatCard
          label="Pending"
          value={stats.pending}
          icon={Clock3}
          description="Awaiting department review"
          tone="warning"
        />
        <AdminStatCard
          label="In Progress"
          value={stats.inProgress}
          icon={LoaderCircle}
          description="Under active field remediation"
          tone="info"
        />
        <AdminStatCard
          label="Resolved"
          value={stats.resolved}
          icon={CheckCircle2}
          description="Remediated infrastructure cases"
          tone="success"
        />
      </div>
    </section>
  );
}
