import { Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/common/StatusBadge";
import { SeverityBadge } from "@/components/common/SeverityBadge";
import { AdminPriorityCell } from "./AdminPriorityCell";
import { formatReportDate } from "@/lib/reports/formatting";
import { CATEGORY_LABELS } from "@/lib/constants";
import type { ComplaintSummary } from "@/types/domain";

interface AdminComplaintsTableProps {
  reports: ComplaintSummary[];
  onInspect: (report: ComplaintSummary) => void;
}

export function AdminComplaintsTable({
  reports,
  onInspect,
}: AdminComplaintsTableProps) {
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden shadow-2xs">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse" aria-label="Complaints Queue Table">
          <thead>
            <tr className="border-b border-border bg-muted/40 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              <th scope="col" className="py-3 px-4">
                Complaint
              </th>
              <th scope="col" className="py-3 px-3">
                Category
              </th>
              <th scope="col" className="py-3 px-3">
                Severity
              </th>
              <th scope="col" className="py-3 px-3">
                Status
              </th>
              <th scope="col" className="py-3 px-3">
                Priority
              </th>
              <th scope="col" className="py-3 px-3">
                Support
              </th>
              <th scope="col" className="py-3 px-3">
                Reported
              </th>
              <th scope="col" className="py-3 px-4 text-right">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60 text-xs">
            {reports.map((report) => {
              const categoryLabel =
                CATEGORY_LABELS[report.category] ?? report.category;

              return (
                <tr
                  key={report.id}
                  className="hover:bg-muted/30 transition-colors group"
                >
                  {/* Complaint Column */}
                  <td className="py-3 px-4 max-w-xs">
                    <div className="space-y-0.5 min-w-0">
                      <span className="font-mono text-[11px] font-bold text-primary block">
                        {report.reference}
                      </span>
                      <p
                        className="font-medium text-foreground truncate"
                        title={report.title}
                      >
                        {report.title}
                      </p>
                      {report.department && (
                        <p className="text-[10px] text-muted-foreground truncate">
                          Dept: {report.department.name}
                        </p>
                      )}
                    </div>
                  </td>

                  {/* Category Column */}
                  <td className="py-3 px-3 text-muted-foreground whitespace-nowrap">
                    {categoryLabel}
                  </td>

                  {/* Severity Column */}
                  <td className="py-3 px-3 whitespace-nowrap">
                    <SeverityBadge severity={report.severity} />
                  </td>

                  {/* Status Column */}
                  <td className="py-3 px-3 whitespace-nowrap">
                    <StatusBadge status={report.status} />
                  </td>

                  {/* Priority Column */}
                  <td className="py-3 px-3 whitespace-nowrap">
                    <AdminPriorityCell
                      priority={report.priority}
                      severity={report.severity}
                    />
                  </td>

                  {/* Support Column */}
                  <td className="py-3 px-3 tabular-nums text-foreground font-medium whitespace-nowrap">
                    {report.supportCount}
                  </td>

                  {/* Reported Date */}
                  <td className="py-3 px-3 text-muted-foreground whitespace-nowrap">
                    {formatReportDate(report.createdAt)}
                  </td>

                  {/* Actions Column */}
                  <td className="py-3 px-4 text-right whitespace-nowrap">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => onInspect(report)}
                      aria-label={`Inspect complaint ${report.reference}`}
                      className="h-7 px-2.5 text-xs gap-1 text-primary hover:text-primary hover:bg-primary/10"
                    >
                      <Eye className="size-3.5" aria-hidden="true" />
                      <span>Inspect</span>
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
