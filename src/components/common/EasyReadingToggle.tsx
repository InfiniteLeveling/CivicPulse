"use client";

import { useSyncExternalStore, useEffect } from "react";
import { Type } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface EasyReadingToggleProps {
  className?: string;
  variant?: "ghost" | "outline" | "default";
  size?: "sm" | "default";
}

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener("cp:reading-mode", callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener("cp:reading-mode", callback);
  };
}

function getSnapshot(): boolean {
  try {
    return localStorage.getItem("cp_easy_reading") === "true";
  } catch {
    return false;
  }
}

function getServerSnapshot(): boolean {
  return false;
}

/**
 * Accessible reading preference toggle that switches the application between standard
 * and enlarged, high-readability typography for older adults and visually impaired citizens.
 * React 19 useSyncExternalStore compliant.
 */
export function EasyReadingToggle({
  className,
  variant = "ghost",
  size = "sm",
}: EasyReadingToggleProps) {
  const isLarge = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  useEffect(() => {
    if (isLarge) {
      document.documentElement.classList.add("easy-reading");
    } else {
      document.documentElement.classList.remove("easy-reading");
    }
  }, [isLarge]);

  const toggle = () => {
    const next = !isLarge;
    try {
      localStorage.setItem("cp_easy_reading", String(next));
      window.dispatchEvent(new Event("cp:reading-mode"));
    } catch {
      // Ignore storage error
    }
  };

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      onClick={toggle}
      aria-pressed={isLarge}
      aria-label={isLarge ? "Disable larger text mode" : "Enable larger text mode for easier reading"}
      className={cn(
        "gap-1.5 text-xs font-medium transition-colors",
        isLarge && "bg-primary/10 text-primary font-semibold hover:bg-primary/15",
        className
      )}
      title="Toggle larger, easy-to-read text size"
    >
      <Type className={cn("size-4", isLarge ? "text-primary" : "text-muted-foreground")} aria-hidden="true" />
      <span>{isLarge ? "Standard Text" : "Larger Text"}</span>
    </Button>
  );
}
