"use client";

import { useState, useCallback, useRef, useEffect } from "react";

export type GeolocationStatus =
  | "idle"
  | "loading"
  | "success"
  | "permission_denied"
  | "unavailable"
  | "timeout"
  | "error"
  | "unsupported";

export interface DetectedLocation {
  latitude: number;
  longitude: number;
  accuracy: number;
}

export interface UseGeolocationReturn {
  status: GeolocationStatus;
  location: DetectedLocation | null;
  errorMessage: string | null;
  detectLocation: () => Promise<DetectedLocation | null>;
  clear: () => void;
}

export function useGeolocation(): UseGeolocationReturn {
  const [status, setStatus] = useState<GeolocationStatus>("idle");
  const [location, setLocation] = useState<DetectedLocation | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const clear = useCallback(() => {
    setStatus("idle");
    setLocation(null);
    setErrorMessage(null);
  }, []);

  const detectLocation = useCallback(async (): Promise<DetectedLocation | null> => {
    if (typeof window === "undefined" || !("geolocation" in navigator)) {
      const msg = "Automatic location detection is unavailable in this browser. Please select the issue location on the map.";
      setStatus("unsupported");
      setErrorMessage(msg);
      return null;
    }

    setStatus("loading");
    setErrorMessage(null);

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          if (!isMountedRef.current) return;
          const detected: DetectedLocation = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
          };
          setLocation(detected);
          setStatus("success");
          resolve(detected);
        },
        (error) => {
          if (!isMountedRef.current) return;
          let msg: string;
          let newStatus: GeolocationStatus = "error";

          switch (error.code) {
            case error.PERMISSION_DENIED:
              newStatus = "permission_denied";
              msg = "Location permission was denied. You can still choose the issue location manually on the map.";
              break;
            case error.POSITION_UNAVAILABLE:
              newStatus = "unavailable";
              msg = "Your device could not determine your location. Please select the location manually.";
              break;
            case error.TIMEOUT:
              newStatus = "timeout";
              msg = "Location detection took too long. Try again or select the location manually.";
              break;
            default:
              newStatus = "error";
              msg = error.message || "An error occurred while detecting your location. Please select the location manually.";
              break;
          }

          setStatus(newStatus);
          setErrorMessage(msg);
          resolve(null);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        }
      );
    });
  }, []);

  return {
    status,
    location,
    errorMessage,
    detectLocation,
    clear,
  };
}
