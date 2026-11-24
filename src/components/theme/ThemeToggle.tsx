"use client";

import { useEffect, useRef, useState } from "react";
import { useTheme } from "next-themes";
import { Sun, Moon, Monitor, Check } from "lucide-react";
import { useMounted } from "@/hooks/useMounted";
import { cn } from "@/lib/utils";

interface ThemeToggleProps {
  className?: string;
  variant?: "ghost" | "outline" | "default";
  showLabel?: boolean;
}

const THEME_OPTIONS = [
  { value: "light", label: "Light", icon: Sun, description: "Clean daylight appearance" },
  { value: "dark", label: "Dark", icon: Moon, description: "Midnight navy palette" },
  { value: "system", label: "System", icon: Monitor, description: "Match device setting" },
] as const;

export function ThemeToggle({
  className,
  variant = "ghost",
  showLabel = false,
}: ThemeToggleProps) {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const mounted = useMounted();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }

    function handleClickOutside(e: MouseEvent) {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open]);

  // Determine current active icon and label
  const currentTheme = mounted ? theme : "system";
  const currentEffective = mounted ? resolvedTheme : "light";

  const CurrentIcon =
    !mounted
      ? Sun
      : currentTheme === "system"
        ? Monitor
        : currentTheme === "dark"
          ? Moon
          : Sun;

  const currentLabel =
    currentTheme === "dark"
      ? "Dark"
      : currentTheme === "system"
        ? `System (${currentEffective === "dark" ? "Dark" : "Light"})`
        : "Light";

  const baseStyles =
    "relative inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-xl text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2";

  const variantStyles = {
    ghost: "text-muted-foreground hover:bg-muted hover:text-foreground",
    outline: "border border-border bg-card text-foreground hover:bg-muted/80 shadow-2xs",
    default: "bg-primary text-primary-foreground hover:bg-primary-hover shadow-xs",
  };

  return (
    <div className={cn("relative inline-block text-left", className)}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={cn(baseStyles, variantStyles[variant], "px-2.5")}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Appearance settings (currently ${currentLabel})`}
        title={`Appearance: ${currentLabel}`}
      >
        <CurrentIcon
          className="size-4 shrink-0 transition-transform duration-200"
          aria-hidden="true"
        />
        {showLabel && (
          <span className="hidden sm:inline font-medium text-xs">
            {currentLabel}
          </span>
        )}
      </button>

      {open && (
        <div
          ref={menuRef}
          role="menu"
          aria-label="Color theme options"
          className="absolute right-0 mt-2 w-56 origin-top-right rounded-xl border border-border bg-popover/95 backdrop-blur-md p-1.5 text-popover-foreground shadow-lg ring-1 ring-black/5 dark:ring-white/10 z-50 animate-scale-in"
        >
          <div className="px-2.5 py-1.5 border-b border-border/60 mb-1">
            <p className="text-xs font-semibold text-foreground">Appearance</p>
            <p className="text-[11px] text-muted-foreground">Select interface color mode</p>
          </div>

          <div className="space-y-0.5">
            {THEME_OPTIONS.map(({ value, label, icon: Icon, description }) => {
              const isSelected = mounted && theme === value;
              return (
                <button
                  key={value}
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setTheme(value);
                    setOpen(false);
                    triggerRef.current?.focus();
                  }}
                  className={cn(
                    "w-full flex items-center justify-between gap-3 px-2.5 py-2 rounded-lg text-left text-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary",
                    isSelected
                      ? "bg-primary/10 text-primary font-semibold"
                      : "text-foreground hover:bg-muted/80"
                  )}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Icon className={cn("size-4 shrink-0", isSelected ? "text-primary" : "text-muted-foreground")} aria-hidden="true" />
                    <div className="truncate">
                      <div className="leading-tight">{label}</div>
                      <div className="text-[10px] text-muted-foreground font-normal leading-tight mt-0.5">
                        {description}
                      </div>
                    </div>
                  </div>
                  {isSelected && (
                    <Check className="size-3.5 shrink-0 text-primary" aria-hidden="true" />
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
