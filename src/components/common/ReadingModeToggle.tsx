"use client";

import { useSyncExternalStore, useCallback, useEffect } from "react";
import { Type } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMounted } from "@/hooks/useMounted";

interface ReadingModeToggleProps {
  className?: string;
  variant?: "ghost" | "outline" | "compact";
}

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener("civicpulse_reading_mode_change", callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener("civicpulse_reading_mode_change", callback);
  };
}

function getSnapshot(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem("civicpulse_reading_mode") === "large";
}

function getServerSnapshot(): boolean {
  return false;
}

export function ReadingModeToggle({
  className,
  variant = "ghost",
}: ReadingModeToggleProps) {
  const mounted = useMounted();
  const isLargeText = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  // Synchronize document attribute with external store state
  useEffect(() => {
    if (isLargeText) {
      document.documentElement.setAttribute("data-reading-mode", "large");
    } else {
      document.documentElement.removeAttribute("data-reading-mode");
    }
  }, [isLargeText]);

  const toggleReadingMode = useCallback(() => {
    const nextState = !isLargeText;
    if (nextState) {
      localStorage.setItem("civicpulse_reading_mode", "large");
    } else {
      localStorage.removeItem("civicpulse_reading_mode");
    }
    window.dispatchEvent(new Event("civicpulse_reading_mode_change"));
  }, [isLargeText]);

  if (!mounted) {
    return (
      <button
        type="button"
        disabled
        aria-label="Toggle larger text for easier reading"
        className={cn(
          "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-muted-foreground opacity-60",
          className
        )}
      >
        <Type className="size-4 shrink-0" aria-hidden="true" />
        <span>Larger Text</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggleReadingMode}
      aria-pressed={isLargeText}
      title={isLargeText ? "Switch to standard text size" : "Switch to larger text for easier reading"}
      aria-label={isLargeText ? "Switch to standard text size" : "Switch to larger text for easier reading"}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
        variant === "outline" && "border border-border bg-card hover:bg-muted",
        variant === "compact" && "p-2",
        isLargeText
          ? "bg-primary/10 text-primary font-semibold ring-1 ring-primary/30"
          : "text-muted-foreground hover:bg-muted hover:text-foreground",
        className
      )}
    >
      <Type className="size-4 shrink-0" aria-hidden="true" />
      <span className={cn(variant === "compact" ? "sr-only sm:not-sr-only" : "")}>
        {isLargeText ? "Larger Text (On)" : "Larger Text"}
      </span>
    </button>
  );
}
