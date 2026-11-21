import type { ComplaintSummary } from "@/types/domain";
import { MyReportsTable } from "./MyReportsTable";
import { MyReportCard } from "./MyReportCard";

interface MyReportsListProps {
  reports: ComplaintSummary[];
}

export function MyReportsList({ reports }: MyReportsListProps) {
  return (
    <div className="w-full">
      {/* Desktop View (Table) */}
      <div className="hidden md:block">
        <MyReportsTable reports={reports} />
      </div>

      {/* Mobile View (Card List) */}
      <div className="md:hidden space-y-3">
        {reports.map((report) => (
          <MyReportCard key={report.id} report={report} />
        ))}
      </div>
    </div>
  );
}
