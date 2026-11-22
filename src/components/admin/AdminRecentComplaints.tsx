import { ClipboardList, Info, Calendar } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/common/StatusBadge";
import { SeverityBadge } from "@/components/common/SeverityBadge";
import { formatReportDate } from "@/lib/reports/formatting";
import { CATEGORY_LABELS } from "@/lib/constants";
import type { ComplaintSummary } from "@/types/domain";

interface AdminRecentComplaintsProps {
  reports: ComplaintSummary[];
}

export function AdminRecentComplaints({ reports }: AdminRecentComplaintsProps) {
  const hasReports = reports.length > 0;

  return (
    <Card className="border-border shadow-xs">
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <ClipboardList className="size-4 text-primary" aria-hidden="true" />
            <CardTitle className="text-base font-semibold text-foreground">
              Recent Complaints
            </CardTitle>
          </div>
          <Badge variant="outline" className="text-xs w-fit">
            {reports.length} {reports.length === 1 ? "report" : "reports"} displayed
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">
          Latest civic complaints submitted across municipal jurisdictions.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {hasReports ? (
          <div className="divide-y divide-border/60">
            {reports.map((report) => {
              const categoryLabel =
                CATEGORY_LABELS[report.category] ?? report.category;

              return (
                <div
                  key={report.id}
                  className="py-3 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs font-semibold text-primary">
                        {report.reference}
                      </span>
                      <StatusBadge status={report.status} />
                      <SeverityBadge severity={report.severity} />
                    </div>
                    <h3 className="text-sm font-medium text-foreground truncate max-w-xl">
                      {report.title}
                    </h3>
                    <div className="flex items-center gap-3 text-[11px] text-muted-foreground flex-wrap">
                      <span>{categoryLabel}</span>
                      <span>·</span>
                      <span className="flex items-center gap-1">
                        <Calendar className="size-3" aria-hidden="true" />
                        <span>{formatReportDate(report.createdAt)}</span>
                      </span>
                      {report.department && (
                        <>
                          <span>·</span>
                          <span>{report.department.name}</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="shrink-0 flex items-center">
                    <span className="text-[11px] text-muted-foreground italic">
                      Triage in Phase 19
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-8 text-center text-xs text-muted-foreground space-y-1">
            <p className="font-medium text-foreground">No Complaints Recorded Yet</p>
            <p>Submitted civic issues will appear here as the platform begins receiving reports.</p>
          </div>
        )}

        <div className="pt-2 border-t border-border/60 flex items-center gap-2 text-[11px] text-muted-foreground">
          <Info className="size-3.5 text-primary shrink-0" aria-hidden="true" />
          <span>
            Direct administrative triage, department assignment, and status mutations activate in Phase 19.
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
