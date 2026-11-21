"use client";

import { useEffect, useMemo, useRef } from "react";
import { Marker, Popup } from "react-leaflet";
import type { Marker as LeafletMarker } from "leaflet";
import L from "leaflet";
import type { ReportStatus, ReportSummary } from "@/types/domain";
import { CivicIssuePopup } from "./CivicIssuePopup";

interface CivicIssueMarkerProps {
  report: ReportSummary;
  isSelected: boolean;
  onSelect: (id: string) => void;
}

const STATUS_COLORS: Record<
  ReportStatus,
  { bg: string; border: string; glow: string; text: string }
> = {
  pending: {
    bg: "#D97706",
    border: "#FEF3C7",
    glow: "rgba(217, 119, 6, 0.45)",
    text: "Pending Review",
  },
  in_progress: {
    bg: "#2563EB",
    border: "#DBEAFE",
    glow: "rgba(37, 99, 235, 0.45)",
    text: "In Progress",
  },
  resolved: {
    bg: "#16A34A",
    border: "#DCFCE7",
    glow: "rgba(22, 163, 74, 0.45)",
    text: "Resolved",
  },
};

export function createStatusMarkerIcon(
  status: ReportStatus,
  isCritical: boolean,
  isSelected: boolean,
  title: string
) {
  const { bg, border, glow } = STATUS_COLORS[status] ?? STATUS_COLORS.pending;
  const size = isSelected ? 40 : 32;
  const pinSize = isSelected ? 34 : 28;
  const innerDotSize = isSelected ? 10 : 8;
  const safeTitle = title.replace(/"/g, "&quot;");

  const criticalBadge = isCritical
    ? `<div style="position: absolute; top: -3px; right: -3px; width: 10px; height: 10px; background: #DC2626; border: 2px solid #FFFFFF; border-radius: 50%; box-shadow: 0 0 6px rgba(220, 38, 38, 0.8);"></div>`
    : "";

  const selectedRing = isSelected
    ? `<div style="position: absolute; inset: -5px; border: 2px solid #2563EB; border-radius: 50%; animation: pulse 2s infinite;"></div>`
    : "";

  return L.divIcon({
    className: "civic-issue-marker-icon",
    html: `
      <div style="position: relative; width: ${size}px; height: ${size}px; display: flex; align-items: center; justify-content: center; cursor: pointer;" role="img" aria-label="${status} issue marker: ${safeTitle}">
        ${selectedRing}
        <!-- Shadow -->
        <div style="position: absolute; bottom: 1px; left: 50%; transform: translateX(-50%); width: ${pinSize * 0.5}px; height: 5px; background: rgba(15, 23, 42, 0.4); border-radius: 50%; filter: blur(1.5px);"></div>
        <!-- Pin Body -->
        <div style="position: relative; width: ${pinSize}px; height: ${pinSize}px; background: ${bg}; border: 3px solid ${border}; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); box-shadow: 0 4px 12px ${glow}; display: flex; align-items: center; justify-content: center; transition: transform 0.15s ease;">
          <div style="width: ${innerDotSize}px; height: ${innerDotSize}px; background: #FFFFFF; border-radius: 50%; transform: rotate(45deg);"></div>
        </div>
        ${criticalBadge}
      </div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
    popupAnchor: [0, -size + 4],
  });
}

export function CivicIssueMarker({
  report,
  isSelected,
  onSelect,
}: CivicIssueMarkerProps) {
  const markerRef = useRef<LeafletMarker | null>(null);
  const isCritical = report.severity === "critical";

  const customIcon = useMemo(
    () => createStatusMarkerIcon(report.status, isCritical, isSelected, report.title),
    [report.status, isCritical, isSelected, report.title]
  );

  const eventHandlers = useMemo(
    () => ({
      click() {
        onSelect(report.id);
      },
    }),
    [onSelect, report.id]
  );

  useEffect(() => {
    if (isSelected && markerRef.current) {
      markerRef.current.openPopup();
    }
  }, [isSelected]);

  return (
    <Marker
      position={[report.latitude, report.longitude]}
      icon={customIcon}
      ref={markerRef}
      eventHandlers={eventHandlers}
      title={report.title}
    >
      <Popup minWidth={260} maxWidth={300} className="civic-issue-leaflet-popup">
        <CivicIssuePopup report={report} />
      </Popup>
    </Marker>
  );
}
