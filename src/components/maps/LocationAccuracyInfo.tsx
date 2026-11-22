"use client";

import { Crosshair, AlertCircle } from "lucide-react";

interface LocationAccuracyInfoProps {
  accuracyMeters?: number;
  className?: string;
}

export function LocationAccuracyInfo({ accuracyMeters, className = "" }: LocationAccuracyInfoProps) {
  if (accuracyMeters === undefined || accuracyMeters === null || !Number.isFinite(accuracyMeters)) {
    return null;
  }

  const rounded = Math.round(accuracyMeters);
  const isPoorAccuracy = rounded > 50;

  return (
    <div
      role="status"
      aria-live="polite"
      className={`rounded-lg border px-3 py-2 text-xs flex items-start gap-2 ${
        isPoorAccuracy
          ? "border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-200"
          : "border-primary/20 bg-primary/5 text-primary-900 dark:text-primary-200"
      } ${className}`}
    >
      {isPoorAccuracy ? (
        <AlertCircle className="size-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" aria-hidden="true" />
      ) : (
        <Crosshair className="size-4 shrink-0 mt-0.5 text-primary" aria-hidden="true" />
      )}
      <div className="space-y-0.5 leading-snug">
        <p className="font-medium text-foreground">
          Estimated location accuracy: approximately {rounded} meters.
        </p>
        <p className="text-muted-foreground text-[11px]">
          GPS accuracy varies by device and surroundings.
          {isPoorAccuracy
            ? " Accuracy is low; please drag the marker or tap the map to place it directly on the problem."
            : " Tap the map or drag the marker if the issue is located elsewhere."}
        </p>
      </div>
    </div>
  );
}
