"use client";

import { useState, useCallback, useId } from "react";
import dynamic from "next/dynamic";
import { toast } from "sonner";
import {
  MapPin,
  Crosshair,
  CheckCircle2,
  Edit3,
  Loader2,
  SlidersHorizontal,
  ShieldCheck,
  Compass,
} from "lucide-react";
import type { LocationSelection } from "@/types/domain";
import { validateCoordinates, formatCoordinate } from "@/lib/validation/location";
import { useGeolocation } from "@/hooks/useGeolocation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { LocationAccuracyInfo } from "./LocationAccuracyInfo";

// Loading skeleton for client-only Leaflet map
function LocationMapSkeleton() {
  return (
    <div
      role="status"
      aria-label="Loading map"
      className="w-full h-[320px] sm:h-[380px] rounded-xl border border-border bg-muted/30 flex flex-col items-center justify-center gap-3 p-4 text-center animate-pulse"
    >
      <Compass className="size-8 text-muted-foreground animate-spin motion-reduce:animate-none" aria-hidden="true" />
      <div className="space-y-1">
        <p className="text-xs font-medium text-foreground">Loading interactive map...</p>
        <p className="text-[11px] text-muted-foreground">Preparing OpenStreetMap tiles and location markers.</p>
      </div>
    </div>
  );
}

// Client-only dynamic import of Leaflet map (prevents SSR / window reference errors)
const LocationPickerMap = dynamic(() => import("./LocationPickerMap"), {
  ssr: false,
  loading: () => <LocationMapSkeleton />,
});

interface LocationPickerProps {
  location: LocationSelection | null;
  onLocationChange: (loc: LocationSelection | null) => void;
  disabled?: boolean;
}

export function LocationPicker({
  location,
  onLocationChange,
  disabled = false,
}: LocationPickerProps) {
  const [candidateLat, setCandidateLat] = useState<number | null>(location?.latitude ?? null);
  const [candidateLng, setCandidateLng] = useState<number | null>(location?.longitude ?? null);
  const [source, setSource] = useState<"gps" | "map" | "manual">(location?.source ?? "map");
  const [accuracy, setAccuracy] = useState<number | undefined>(location?.accuracyMeters);
  const [showManualInputs, setShowManualInputs] = useState(false);
  const [manualInputLat, setManualInputLat] = useState<string>(location?.latitude?.toString() ?? "");
  const [manualInputLng, setManualInputLng] = useState<string>(location?.longitude?.toString() ?? "");
  const [manualError, setManualError] = useState<string | null>(null);

  const latInputId = useId();
  const lngInputId = useId();

  const { status: geoStatus, errorMessage: geoError, detectLocation } = useGeolocation();

  const isConfirmed = Boolean(location?.confirmed);

  const [prevLocation, setPrevLocation] = useState(location);

  // Synchronize internal candidate state when external location prop changes (during render pattern)
  if (location !== prevLocation) {
    setPrevLocation(location);
    if (location) {
      setCandidateLat(location.latitude);
      setCandidateLng(location.longitude);
      setSource(location.source);
      setAccuracy(location.accuracyMeters);
      setManualInputLat(location.latitude.toString());
      setManualInputLng(location.longitude.toString());
    } else {
      setCandidateLat(null);
      setCandidateLng(null);
      setAccuracy(undefined);
      setManualInputLat("");
      setManualInputLng("");
    }
  }

  // Handle marker drag or map click
  const handleMapPositionChange = useCallback(
    (lat: number, lng: number) => {
      setCandidateLat(lat);
      setCandidateLng(lng);
      setSource("map");
      setAccuracy(undefined); // Map click/drag clears GPS-specific accuracy
      setManualInputLat(lat.toFixed(5));
      setManualInputLng(lng.toFixed(5));

      // Moving the marker invalidates previous confirmation
      if (isConfirmed) {
        onLocationChange({
          latitude: lat,
          longitude: lng,
          source: "map",
          confirmed: false,
        });
        toast.info("Marker moved. Please re-confirm this new issue location.");
      }
    },
    [isConfirmed, onLocationChange]
  );

  // Handle GPS detection
  const handleDetectGPS = useCallback(async () => {
    const result = await detectLocation();
    if (result) {
      setCandidateLat(result.latitude);
      setCandidateLng(result.longitude);
      setSource("gps");
      setAccuracy(result.accuracy);
      setManualInputLat(result.latitude.toFixed(5));
      setManualInputLng(result.longitude.toFixed(5));

      // GPS detection updates candidate point and requires confirmation
      onLocationChange({
        latitude: result.latitude,
        longitude: result.longitude,
        source: "gps",
        accuracyMeters: result.accuracy,
        confirmed: false,
      });

      toast.info("Device GPS coordinates detected", {
        description: "Please verify the marker is placed directly on the problem and confirm location.",
      });
    }
  }, [detectLocation, onLocationChange]);

  // Handle manual coordinate submission (Accessibility alternative)
  function handleApplyManualCoordinates() {
    setManualError(null);
    const parsedLat = parseFloat(manualInputLat);
    const parsedLng = parseFloat(manualInputLng);

    const validation = validateCoordinates(parsedLat, parsedLng);
    if (!validation.valid) {
      const err = validation.errors.latitude || validation.errors.longitude || "Invalid coordinates.";
      setManualError(err);
      toast.error("Invalid coordinates", { description: err });
      return;
    }

    setCandidateLat(parsedLat);
    setCandidateLng(parsedLng);
    setSource("manual");
    setAccuracy(undefined);

    if (isConfirmed) {
      onLocationChange({
        latitude: parsedLat,
        longitude: parsedLng,
        source: "manual",
        confirmed: false,
      });
      toast.info("Coordinates updated. Please confirm location.");
    }
  }

  // Handle explicit confirmation
  function handleConfirmLocation() {
    if (candidateLat === null || candidateLng === null) {
      toast.error("Please select a location on the map first.");
      return;
    }

    const validation = validateCoordinates(candidateLat, candidateLng);
    if (!validation.valid) {
      toast.error("Invalid coordinates. Please re-position the marker.");
      return;
    }

    onLocationChange({
      latitude: candidateLat,
      longitude: candidateLng,
      source,
      accuracyMeters: accuracy,
      confirmed: true,
    });

    toast.success("Issue location confirmed successfully", {
      description: "Coordinates will be used to dispatch repairs and check nearby complaints.",
    });
  }

  // Handle editing previously confirmed location
  function handleEditLocation() {
    if (location) {
      onLocationChange({
        ...location,
        confirmed: false,
      });
    }
  }

  const candidatePosition: [number, number] | null =
    candidateLat !== null && candidateLng !== null ? [candidateLat, candidateLng] : null;

  return (
    <div className="space-y-4">
      {/* Confirmed State View */}
      {isConfirmed && location ? (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 sm:p-5 space-y-4 animate-in fade-in-50 duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-emerald-500/20 pb-3">
            <div className="flex items-center gap-2.5">
              <span className="flex size-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="size-4" aria-hidden="true" />
              </span>
              <div>
                <p className="text-sm font-semibold text-foreground">Location Confirmed</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Pinpoint coordinates bound to this complaint draft
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-[10px] uppercase font-normal border-emerald-500/40 text-emerald-700 dark:text-emerald-300">
                {location.source === "gps" ? "GPS Detected" : location.source === "manual" ? "Manual Entry" : "Map Selected"}
              </Badge>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleEditLocation}
                disabled={disabled}
                className="text-xs gap-1.5 h-8"
              >
                <Edit3 className="size-3.5" aria-hidden="true" />
                <span>Change Location</span>
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-lg bg-background/80 border border-border/60">
              <span className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider block mb-1">
                Latitude
              </span>
              <p className="font-mono text-sm font-semibold text-foreground">
                {formatCoordinate(location.latitude)}°
              </p>
            </div>

            <div className="p-3 rounded-lg bg-background/80 border border-border/60">
              <span className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider block mb-1">
                Longitude
              </span>
              <p className="font-mono text-sm font-semibold text-foreground">
                {formatCoordinate(location.longitude)}°
              </p>
            </div>
          </div>

          {location.accuracyMeters !== undefined && (
            <LocationAccuracyInfo accuracyMeters={location.accuracyMeters} />
          )}

          <p className="text-[11px] text-muted-foreground leading-relaxed">
            This geographical point will be used to dispatch municipal repair crews and check for nearby duplicates.
          </p>
        </div>
      ) : (
        /* Edit / Selection View */
        <Card className="border-border/80 shadow-xs overflow-hidden">
          <CardContent className="p-4 sm:p-5 space-y-4">
            {/* Top Toolbar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold text-foreground">
                  Pinpoint Problem Location
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Tap the map or click &quot;Detect My Location&quot; to position the marker.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleDetectGPS}
                  disabled={disabled || geoStatus === "loading"}
                  className="text-xs gap-1.5 h-9 shrink-0"
                >
                  {geoStatus === "loading" ? (
                    <Loader2 className="size-3.5 animate-spin motion-reduce:animate-none" aria-hidden="true" />
                  ) : (
                    <Crosshair className="size-3.5 text-primary" aria-hidden="true" />
                  )}
                  <span>Detect My Location</span>
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowManualInputs((prev) => !prev)}
                  className="text-xs gap-1 text-muted-foreground hover:text-foreground h-9"
                  aria-expanded={showManualInputs}
                >
                  <SlidersHorizontal className="size-3.5" aria-hidden="true" />
                  <span className="hidden sm:inline">Coordinates</span>
                </Button>
              </div>
            </div>

            {/* GPS Error Feedback Banner */}
            {geoError && (
              <div
                role="alert"
                className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-900 dark:text-amber-200"
              >
                <p className="font-medium">{geoError}</p>
              </div>
            )}

            {/* Accessibility Manual Coordinate Inputs */}
            {showManualInputs && (
              <div className="p-3.5 rounded-xl border border-border/80 bg-muted/20 space-y-3 animate-in fade-in-50 duration-200">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-foreground">Manual Coordinate Entry</span>
                  <span className="text-[10px] text-muted-foreground">Accessible alternative to pointer clicks</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor={latInputId} className="text-[11px] text-muted-foreground">
                      Latitude (-90 to +90)
                    </Label>
                    <Input
                      id={latInputId}
                      type="number"
                      step="any"
                      placeholder="e.g. 19.31490"
                      value={manualInputLat}
                      onChange={(e) => setManualInputLat(e.target.value)}
                      disabled={disabled}
                      className="font-mono text-xs h-8"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor={lngInputId} className="text-[11px] text-muted-foreground">
                      Longitude (-180 to +180)
                    </Label>
                    <Input
                      id={lngInputId}
                      type="number"
                      step="any"
                      placeholder="e.g. 84.79410"
                      value={manualInputLng}
                      onChange={(e) => setManualInputLng(e.target.value)}
                      disabled={disabled}
                      className="font-mono text-xs h-8"
                    />
                  </div>
                </div>

                {manualError && (
                  <p className="text-[11px] text-destructive font-medium">{manualError}</p>
                )}

                <div className="flex justify-end pt-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleApplyManualCoordinates}
                    disabled={disabled}
                    className="text-xs h-8"
                  >
                    Set Coordinates
                  </Button>
                </div>
              </div>
            )}

            {/* Interactive Leaflet Map */}
            <LocationPickerMap
              candidatePosition={candidatePosition}
              onPositionChange={handleMapPositionChange}
              disabled={disabled}
            />

            {/* Accuracy Information Banner */}
            {accuracy !== undefined && (
              <LocationAccuracyInfo accuracyMeters={accuracy} />
            )}

            {/* Selected Coordinates & Confirm Action */}
            <div className="pt-2 border-t border-border/60 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="text-xs">
                {candidatePosition ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="flex size-5 items-center justify-center rounded-md bg-primary/10 text-primary">
                      <MapPin className="size-3" aria-hidden="true" />
                    </span>
                    <span className="font-mono font-medium text-foreground">
                      {candidatePosition[0].toFixed(5)}°, {candidatePosition[1].toFixed(5)}°
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      ({source === "gps" ? "GPS" : source === "manual" ? "Manual" : "Map"})
                    </span>
                  </div>
                ) : (
                  <span className="text-muted-foreground text-[11px]">
                    No point selected yet. Click map or use &quot;Detect My Location&quot;.
                  </span>
                )}
              </div>

              <Button
                type="button"
                variant="default"
                size="sm"
                onClick={handleConfirmLocation}
                disabled={disabled || candidatePosition === null}
                className="text-xs gap-1.5 h-9 font-medium shadow-xs"
              >
                <CheckCircle2 className="size-3.5" aria-hidden="true" />
                <span>Confirm Issue Location</span>
              </Button>
            </div>

            {/* Privacy Guidance Footer */}
            <div className="pt-2 border-t border-border/40 flex items-start gap-2 text-[11px] text-muted-foreground leading-relaxed">
              <ShieldCheck className="size-3.5 text-primary shrink-0 mt-0.5" aria-hidden="true" />
              <span>
                Your selected location helps identify nearby reports and assists municipal dispatch.
                Public reports may display the issue coordinates on the community map.
              </span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
