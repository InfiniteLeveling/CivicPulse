import { Clock, Tag, ShieldCheck, Building2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { AdminAnalyticsData } from "@/lib/validation/admin-analytics";

interface AnalyticsDataTableProps {
  data: AdminAnalyticsData;
}

export function AnalyticsDataTable({ data }: AnalyticsDataTableProps) {
  return (
    <div className="space-y-6">
      {/* 1. Status Table */}
      <Card className="border-border bg-card shadow-2xs">
        <CardHeader className="pb-3 border-b border-border/60">
          <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Clock className="size-4 text-primary" aria-hidden="true" />
            <span>Complaint Status Data Table</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs" aria-label="Status Distribution Table">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  <th scope="col" className="py-2.5 px-4">Status Category</th>
                  <th scope="col" className="py-2.5 px-4 text-right">Complaint Count</th>
                  <th scope="col" className="py-2.5 px-4 text-right">Percentage of Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {data.statusBreakdown.map((row) => (
                  <tr key={row.status} className="hover:bg-muted/30 transition-colors">
                    <td className="py-2.5 px-4 font-medium text-foreground flex items-center gap-2">
                      <span className="size-2 rounded-full" style={{ backgroundColor: row.color }} aria-hidden="true" />
                      <span>{row.label}</span>
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono font-semibold text-foreground">
                      {row.count}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono text-muted-foreground">
                      {row.percentage}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* 2. Category Table */}
      <Card className="border-border bg-card shadow-2xs">
        <CardHeader className="pb-3 border-b border-border/60">
          <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Tag className="size-4 text-primary" aria-hidden="true" />
            <span>Issue Category Breakdown Data Table</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs" aria-label="Category Distribution Table">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  <th scope="col" className="py-2.5 px-4">Category Name</th>
                  <th scope="col" className="py-2.5 px-4 text-right">Complaint Count</th>
                  <th scope="col" className="py-2.5 px-4 text-right">Percentage</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {data.categoryBreakdown.map((row) => (
                  <tr key={row.category} className="hover:bg-muted/30 transition-colors">
                    <td className="py-2.5 px-4 font-medium text-foreground">
                      {row.label}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono font-semibold text-foreground">
                      {row.count}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono text-muted-foreground">
                      {row.percentage}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* 3. Severity Table */}
      <Card className="border-border bg-card shadow-2xs">
        <CardHeader className="pb-3 border-b border-border/60">
          <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
            <ShieldCheck className="size-4 text-primary" aria-hidden="true" />
            <span>Severity Assessment Data Table</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs" aria-label="Severity Distribution Table">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  <th scope="col" className="py-2.5 px-4">Severity Level</th>
                  <th scope="col" className="py-2.5 px-4 text-right">Complaints</th>
                  <th scope="col" className="py-2.5 px-4 text-right">Percentage</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {data.severityBreakdown.map((row) => (
                  <tr key={row.severity} className="hover:bg-muted/30 transition-colors">
                    <td className="py-2.5 px-4 font-medium text-foreground flex items-center gap-2">
                      <span className="size-2 rounded-full" style={{ backgroundColor: row.color }} aria-hidden="true" />
                      <span>{row.label}</span>
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono font-semibold text-foreground">
                      {row.count}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono text-muted-foreground">
                      {row.percentage}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* 4. Department Workload Table */}
      <Card className="border-border bg-card shadow-2xs">
        <CardHeader className="pb-3 border-b border-border/60">
          <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Building2 className="size-4 text-primary" aria-hidden="true" />
            <span>Department Assignment Workload Table</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs" aria-label="Department Workload Table">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  <th scope="col" className="py-2.5 px-4">Department Division</th>
                  <th scope="col" className="py-2.5 px-3 text-right">Pending</th>
                  <th scope="col" className="py-2.5 px-3 text-right">In Progress</th>
                  <th scope="col" className="py-2.5 px-3 text-right">Resolved</th>
                  <th scope="col" className="py-2.5 px-4 text-right">Total Assigned</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {data.departmentWorkload.map((row) => (
                  <tr key={row.departmentId} className="hover:bg-muted/30 transition-colors">
                    <td className="py-2.5 px-4 font-medium text-foreground">
                      {row.departmentName}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-amber-600 font-semibold">
                      {row.pending}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-blue-600 font-semibold">
                      {row.inProgress}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-emerald-600 font-semibold">
                      {row.resolved}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono font-bold text-foreground">
                      {row.total}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
