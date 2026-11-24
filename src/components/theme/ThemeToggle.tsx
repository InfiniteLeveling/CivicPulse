"use client";

import { useEffect, useRef, useState, useId } from "react";
import { useTheme } from "next-themes";
import { Sun, Moon, Monitor, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMounted } from "@/hooks/useMounted";
import { cn } from "@/lib/utils";

interface ThemeToggleProps {
  variant?: "ghost" | "outline" | "default";
  size?: "default" | "sm" | "xs" | "lg";
  className?: string;
  align?: "left" | "right";
  showLabel?: boolean;
}

const THEME_OPTIONS = [
  {
    value: "light",
    label: "Light Mode",
    description: "Bright, high-clarity daylight theme",
    icon: Sun,
  },
  {
    value: "dark",
    label: "Dark Mode",
    description: "Midnight navy, low-glare dark theme",
    icon: Moon,
  },
  {
    value: "system",
    label: "System Default",
    description: "Follow operating system preference",
    icon: Monitor,
  },
] as const;

export function ThemeToggle({
  variant = "ghost",
  size = "sm",
  className,
  align = "right",
  showLabel = false,
}: ThemeToggleProps) {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const mounted = useMounted();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();

  // Keyboard navigation & outside click handlers
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (!open) return;

      if (e.key === "Escape") {
        e.preventDefault();
        setOpen(false);
        triggerRef.current?.focus();
      } else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        const items = containerRef.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]');
        if (!items || items.length === 0) return;
        const currentFocus = document.activeElement as HTMLButtonElement;
        const currentIndex = Array.from(items).indexOf(currentFocus);
        let nextIndex = 0;
        if (e.key === "ArrowDown") {
          nextIndex = currentIndex < items.length - 1 ? currentIndex + 1 : 0;
        } else {
          nextIndex = currentIndex > 0 ? currentIndex - 1 : items.length - 1;
        }
        items[nextIndex]?.focus();
      }
    }

    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }

    if (open) {
      document.addEventListener("keydown", handleKeyDown);
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open]);

  // Determine current active label and icon
  const currentPreference = mounted ? theme ?? "system" : "system";
  const activeIcon = !mounted ? (
    <Sun className="size-4 shrink-0 transition-transform duration-200" aria-hidden="true" />
  ) : resolvedTheme === "dark" ? (
    <Moon className="size-4 shrink-0 transition-transform duration-200 rotate-0 dark:-rotate-90 text-sky-400" aria-hidden="true" />
  ) : (
    <Sun className="size-4 shrink-0 transition-transform duration-200 rotate-0 text-amber-500" aria-hidden="true" />
  );

  const currentLabel =
    currentPreference === "dark"
      ? "Dark Mode"
      : currentPreference === "light"
      ? "Light Mode"
      : "System Default";

  return (
    <div ref={containerRef} className="relative inline-block text-left">
      <Button
        ref={triggerRef}
        type="button"
        variant={variant}
        size={size}
        onClick={() => setOpen((prev) => !prev)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label={`Appearance settings: current theme is ${currentLabel}`}
        title={`Appearance: ${currentLabel}`}
        className={cn(
          "min-h-[36px] sm:min-h-[38px] px-2.5 gap-2 rounded-lg transition-all duration-150",
          "focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
          open && "bg-muted text-foreground",
          className
        )}
      >
        <span className="relative flex items-center justify-center">
          {activeIcon}
        </span>
        {showLabel && (
          <span className="text-xs font-medium hidden sm:inline">
            {currentLabel}
          </span>
        )}
      </Button>

      {open && (
        <div
          id={menuId}
          role="menu"
          aria-label="Appearance options"
          aria-orientation="vertical"
          className={cn(
            "absolute z-50 mt-1.5 w-60 rounded-xl border border-border bg-popover p-1.5 text-popover-foreground shadow-lg backdrop-blur-md",
            "animate-in fade-in-0 zoom-in-95 duration-150 origin-top",
            align === "right" ? "right-0" : "left-0"
          )}
        >
          <div className="px-3 py-1.5 border-b border-border/60 mb-1">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              Appearance
            </p>
          </div>

          <div className="space-y-0.5">
            {THEME_OPTIONS.map((option) => {
              const Icon = option.icon;
              const isSelected = mounted && theme === option.value;

              return (
                <button
                  key={option.value}
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setTheme(option.value);
                    setOpen(false);
                    triggerRef.current?.focus();
                  }}
                  className={cn(
                    "w-full flex items-center justify-between gap-3 px-3 py-2 text-xs rounded-lg transition-colors text-left",
                    "hover:bg-muted hover:text-foreground focus-visible:bg-muted focus-visible:text-foreground focus-visible:outline-none",
                    isSelected
                      ? "bg-primary/10 text-primary font-semibold"
                      : "text-foreground font-medium"
                  )}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Icon className={cn("size-4 shrink-0", isSelected ? "text-primary" : "text-muted-foreground")} aria-hidden="true" />
                    <div className="truncate">
                      <p className="leading-none">{option.label}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5 font-normal truncate">
                        {option.description}
                      </p>
                    </div>
                  </div>

                  {isSelected && (
                    <Check className="size-3.5 text-primary shrink-0" aria-hidden="true" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
