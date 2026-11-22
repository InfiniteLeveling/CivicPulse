"use client";

import { useMemo } from "react";
import type { ReportSummary } from "@/types/domain";
import { hasValidCoordinates } from "@/lib/validation/public-reports";
import { CivicIssueMarker } from "./CivicIssueMarker";

interface CivicMapMarkersProps {
  reports: ReportSummary[];
  selectedReportId: string | null;
  onSelect: (id: string) => void;
}

export function CivicMapMarkers({
  reports,
  selectedReportId,
  onSelect,
}: CivicMapMarkersProps) {
  // Only plot reports with valid coordinates
  const validReports = useMemo(
    () => reports.filter((r) => hasValidCoordinates(r)),
    [reports]
  );

  return (
    <>
      {validReports.map((report) => (
        <CivicIssueMarker
          key={report.id}
          report={report}
          isSelected={selectedReportId === report.id}
          onSelect={onSelect}
        />
      ))}
    </>
  );
}
