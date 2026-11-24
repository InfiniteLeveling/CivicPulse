"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { ChevronDown, LayoutDashboard } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { ROLE_LABELS } from "@/lib/constants";
import { cn } from "@/lib/utils";

export interface CitizenUserSummary {
  name: string;
  email: string;
  role: "citizen" | "admin";
}

interface CitizenProfileMenuProps {
  user?: CitizenUserSummary | null;
  className?: string;
}

export function CitizenProfileMenu({
  user = {
    name: "Citizen",
    email: "citizen@civicpulse.org",
    role: "citizen",
  },
  className,
}: CitizenProfileMenuProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const displayName = user?.name || "Citizen";
  const displayEmail = user?.email || "citizen@civicpulse.org";
  const initial = displayName.charAt(0).toUpperCase() || "C";
  const roleLabel = user?.role ? ROLE_LABELS[user.role] : "Citizen";

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && open) {
        setOpen(false);
      }
    }

    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
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

  return (
    <div ref={containerRef} className={cn("relative inline-block text-left", className)}>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`User menu for ${displayName}`}
        onClick={() => setOpen((prev) => !prev)}
        className="flex items-center gap-2 px-2 py-1.5 rounded-full hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring text-left transition-colors cursor-pointer"
      >
        <span
          className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-xs border border-primary/20"
          aria-hidden="true"
        >
          {initial}
        </span>
        <span className="hidden sm:inline-flex flex-col text-left leading-tight">
          <span className="text-sm font-medium truncate max-w-[120px]">{displayName}</span>
          <span className="text-[11px] text-muted-foreground capitalize">{roleLabel}</span>
        </span>
        <ChevronDown
          className={cn("size-3.5 text-muted-foreground transition-transform duration-200", open && "rotate-180")}
          aria-hidden="true"
        />
      </button>

      {open && (
        <div
          role="menu"
          aria-label="User profile options"
          className="absolute right-0 mt-2 w-64 origin-top-right rounded-xl border bg-popover p-2 text-popover-foreground shadow-lg ring-1 ring-black/5 focus:outline-none z-50 animate-in fade-in-0 zoom-in-95 duration-100"
        >
          {/* User info header */}
          <div className="flex items-center gap-3 p-2 border-b border-border/50 pb-3 mb-1">
            <span
              className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-semibold text-sm"
              aria-hidden="true"
            >
              {initial}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold truncate text-foreground">{displayName}</p>
              <p className="text-xs text-muted-foreground truncate">{displayEmail}</p>
              <div className="mt-1">
                <Badge variant="secondary" className="text-[10px] uppercase tracking-wider font-semibold px-1.5 py-0">
                  {roleLabel}
                </Badge>
              </div>
            </div>
          </div>

          {/* Navigation links */}
          <div className="py-1">
            <Link
              href="/dashboard"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-foreground hover:bg-muted transition-colors"
              role="menuitem"
            >
              <LayoutDashboard className="size-4 text-muted-foreground" aria-hidden="true" />
              <span>Citizen Dashboard</span>
            </Link>
          </div>

          {/* Logout section */}
          <div className="border-t border-border/50 pt-1 mt-1">
            <LogoutButton
              variant="ghost"
              size="sm"
              className="w-full justify-start text-destructive hover:bg-destructive/10 hover:text-destructive gap-2.5 px-2.5"
            />
          </div>
        </div>
      )}
    </div>
  );
}
