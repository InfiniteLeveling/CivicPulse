"use client";

import { useEffect, useMemo, useRef } from "react";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { ReportSummary } from "@/types/domain";
import { hasValidCoordinates } from "@/lib/validation/public-reports";
import { CivicMapMarkers } from "./CivicMapMarkers";

interface CivicMapClientProps {
  reports: ReportSummary[];
  selectedReportId: string | null;
  onSelect: (id: string | null) => void;
  fitBoundsTrigger: number;
  defaultCenter?: [number, number];
  defaultZoom?: number;
}

// Controller component inside MapContainer using useMap()
function MapViewController({
  reports,
  selectedReportId,
  fitBoundsTrigger,
}: {
  reports: ReportSummary[];
  selectedReportId: string | null;
  fitBoundsTrigger: number;
}) {
  const map = useMap();
  const initialFitDone = useRef(false);

  // Compute valid points
  const validCoords = useMemo(
    () =>
      reports
        .filter((r) => hasValidCoordinates(r))
        .map((r) => [r.latitude, r.longitude] as [number, number]),
    [reports]
  );

  // Fit bounds when fitBoundsTrigger updates or on initial load with valid coords
  useEffect(() => {
    if (validCoords.length === 0 || !map || !map.getContainer()) return;

    // Only auto-fit once initially, or whenever fitBoundsTrigger explicitly increments
    if (!initialFitDone.current || fitBoundsTrigger > 0) {
      initialFitDone.current = true;
      if (validCoords.length === 1) {
        map.setView(validCoords[0], 14, { animate: true });
      } else {
        const bounds = L.latLngBounds(validCoords);
        map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
      }
    }
  }, [validCoords, fitBoundsTrigger, map]);

  // Pan to selected report coordinates when selectedReportId changes
  useEffect(() => {
    if (!selectedReportId || !map || !map.getContainer()) return;

    const target = reports.find((r) => r.id === selectedReportId);
    if (target && hasValidCoordinates(target)) {
      map.setView([target.latitude, target.longitude], Math.max(map.getZoom(), 15), {
        animate: true,
      });
    }
  }, [selectedReportId, reports, map]);

  return null;
}

export default function CivicMapClient({
  reports,
  selectedReportId,
  onSelect,
  fitBoundsTrigger,
  defaultCenter = [12.9716, 77.5946],
  defaultZoom = 13,
}: CivicMapClientProps) {
  // Determine initial center: either the selected report or the first valid report or defaultCenter
  const validFirstReport = reports.find((r) => hasValidCoordinates(r));
  const initialCenter = validFirstReport
    ? ([validFirstReport.latitude, validFirstReport.longitude] as [number, number])
    : defaultCenter;

  return (
    <div
      className="relative w-full h-[380px] sm:h-[480px] lg:h-[calc(100vh-270px)] rounded-xl overflow-hidden border border-border bg-muted/30 z-0"
      role="region"
      aria-label="Interactive map displaying public civic complaints"
    >
      <MapContainer
        center={initialCenter}
        zoom={defaultZoom}
        scrollWheelZoom={true}
        className="size-full z-0"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
        />

        <MapViewController
          reports={reports}
          selectedReportId={selectedReportId}
          fitBoundsTrigger={fitBoundsTrigger}
        />

        <CivicMapMarkers
          reports={reports}
          selectedReportId={selectedReportId}
          onSelect={(id) => onSelect(id)}
        />
      </MapContainer>
    </div>
  );
}
