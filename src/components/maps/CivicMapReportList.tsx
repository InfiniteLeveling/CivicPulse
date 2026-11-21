"use client";

import { useEffect, useRef } from "react";
import type { ReportSummary } from "@/types/domain";
import { CivicMapReportCard } from "./CivicMapReportCard";
import { CivicMapEmptyState } from "./CivicMapEmptyState";

interface CivicMapReportListProps {
  reports: ReportSummary[];
  totalAvailable: number;
  selectedReportId: string | null;
  onSelect: (id: string) => void;
  onResetFilters: () => void;
}

export function CivicMapReportList({
  reports,
  totalAvailable,
  selectedReportId,
  onSelect,
  onResetFilters,
}: CivicMapReportListProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Scroll active card into view when selected from the map
  useEffect(() => {
    if (!selectedReportId || !containerRef.current) return;
    const cardElement = containerRef.current.querySelector(
      `[data-report-id="${selectedReportId}"]`
    );
    if (cardElement) {
      cardElement.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [selectedReportId]);

  if (reports.length === 0) {
    return (
      <CivicMapEmptyState
        type={totalAvailable === 0 ? "no_data" : "no_matches"}
        onResetFilters={totalAvailable > 0 ? onResetFilters : undefined}
      />
    );
  }

  return (
    <div
      ref={containerRef}
      role="region"
      aria-label="Public civic complaints list"
      className="space-y-3 max-h-[500px] lg:max-h-[calc(100vh-270px)] overflow-y-auto pr-1"
    >
      {reports.map((report) => (
        <CivicMapReportCard
          key={report.id}
          report={report}
          isSelected={selectedReportId === report.id}
          onFocus={onSelect}
        />
      ))}
    </div>
  );
}
