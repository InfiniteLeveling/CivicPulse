import Link from "next/link";
import { PlusCircle, ExternalLink, Inbox } from "lucide-react";
import type { ComplaintSummary } from "@/types/domain";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/common/EmptyState";
import { RecentReportCard } from "./RecentReportCard";
import { cn } from "@/lib/utils";

interface RecentReportsProps {
  reports: ComplaintSummary[];
}

export function RecentReports({ reports }: RecentReportsProps) {
  return (
    <section aria-label="Recent Complaints" className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-foreground">
            Recent Complaints
          </h2>
          <p className="text-xs text-muted-foreground">
            Latest infrastructure reports submitted from your account
          </p>
        </div>

        {reports.length > 0 && (
          <Link
            href="/my-reports"
            className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "text-xs gap-1")}
          >
            <span>View All Complaints</span>
            <ExternalLink className="size-3" aria-hidden="true" />
          </Link>
        )}
      </div>

      {reports.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title="No complaints reported yet"
          description="You haven't submitted any civic issue reports yet. Notice a pothole, broken streetlight, or garbage backlog? Submit your first report to notify authorities."
          action={
            <Link
              href="/report"
              className={cn(buttonVariants({ variant: "default", size: "sm" }), "mt-2 gap-1.5 shadow-sm")}
            >
              <PlusCircle className="size-4" aria-hidden="true" />
              <span>Report an Issue</span>
            </Link>
          }
        />
      ) : (
        <div className="space-y-3">
          {reports.map((report) => (
            <RecentReportCard key={report.id} report={report} />
          ))}
        </div>
      )}
    </section>
  );
}
