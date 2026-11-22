"use client";

import { useMemo, useRef } from "react";
import { Marker, Popup } from "react-leaflet";
import type { Marker as LeafletMarker } from "leaflet";
import L from "leaflet";

interface DraggableLocationMarkerProps {
  position: [number, number];
  onPositionChange: (lat: number, lng: number) => void;
  disabled?: boolean;
}

export function createCivicMarkerIcon() {
  return L.divIcon({
    className: "civic-issue-marker-pin",
    html: `
      <div style="position: relative; width: 34px; height: 34px; display: flex; align-items: center; justify-content: center;" role="img" aria-label="Selected issue location marker">
        <div style="position: absolute; bottom: 1px; left: 50%; transform: translateX(-50%); width: 14px; height: 5px; background: rgba(15, 23, 42, 0.35); border-radius: 50%; filter: blur(1px);"></div>
        <div style="position: relative; width: 30px; height: 30px; background: #2563EB; border: 3px solid #FFFFFF; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); box-shadow: 0 4px 10px rgba(15, 23, 42, 0.35); display: flex; align-items: center; justify-content: center; cursor: grab;">
          <div style="width: 9px; height: 9px; background: #FFFFFF; border-radius: 50%; transform: rotate(45deg);"></div>
        </div>
      </div>
    `,
    iconSize: [34, 34],
    iconAnchor: [17, 34],
    popupAnchor: [0, -34],
  });
}

export function DraggableLocationMarker({
  position,
  onPositionChange,
  disabled = false,
}: DraggableLocationMarkerProps) {
  const markerRef = useRef<LeafletMarker | null>(null);
  const customIcon = useMemo(() => createCivicMarkerIcon(), []);

  const eventHandlers = useMemo(
    () => ({
      dragend() {
        const marker = markerRef.current;
        if (marker != null) {
          const latLng = marker.getLatLng();
          onPositionChange(latLng.lat, latLng.lng);
        }
      },
    }),
    [onPositionChange]
  );

  return (
    <Marker
      draggable={!disabled}
      eventHandlers={eventHandlers}
      position={position}
      ref={markerRef}
      icon={customIcon}
    >
      <Popup minWidth={160}>
        <div className="text-xs p-1 space-y-1 font-sans">
          <p className="font-semibold text-foreground">Civic Issue Location</p>
          <p className="text-muted-foreground text-[11px]">
            Drag marker or click the map to reposition.
          </p>
          <p className="text-[10px] font-mono text-muted-foreground pt-0.5">
            {position[0].toFixed(5)}, {position[1].toFixed(5)}
          </p>
        </div>
      </Popup>
    </Marker>
  );
}
