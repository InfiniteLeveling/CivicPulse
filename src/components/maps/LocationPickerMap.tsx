"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, useMapEvents, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { DraggableLocationMarker } from "./DraggableLocationMarker";

interface LocationPickerMapProps {
  candidatePosition: [number, number] | null;
  onPositionChange: (lat: number, lng: number) => void;
  defaultCenter?: [number, number];
  defaultZoom?: number;
  disabled?: boolean;
}

// Map events handler to select point on click/tap
function MapClickHandler({
  onSelect,
  disabled,
}: {
  onSelect: (lat: number, lng: number) => void;
  disabled: boolean;
}) {
  useMapEvents({
    click(e) {
      if (disabled) return;
      onSelect(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

// Controller to smoothly re-center map when coordinates change
function MapCenterController({ position }: { position: [number, number] | null }) {
  const map = useMap();

  useEffect(() => {
    if (position && map && map.getContainer()) {
      map.setView(position, Math.max(map.getZoom(), 15), { animate: false });
    }
  }, [position, map]);

  return null;
}

export default function LocationPickerMap({
  candidatePosition,
  onPositionChange,
  defaultCenter = [22.5726, 88.3639],
  defaultZoom = 13,
  disabled = false,
}: LocationPickerMapProps) {
  const initialCenter = candidatePosition || defaultCenter;

  return (
    <div
      className="relative w-full h-[320px] sm:h-[380px] rounded-xl overflow-hidden border border-border bg-muted/40 z-0"
      role="region"
      aria-label="Interactive map for selecting civic issue location"
    >
      <MapContainer
        center={initialCenter}
        zoom={defaultZoom}
        scrollWheelZoom={false}
        className="size-full z-0"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
        />

        <MapClickHandler onSelect={onPositionChange} disabled={disabled} />

        <MapCenterController position={candidatePosition} />

        {candidatePosition && (
          <DraggableLocationMarker
            position={candidatePosition}
            onPositionChange={onPositionChange}
            disabled={disabled}
          />
        )}
      </MapContainer>
    </div>
  );
}
