"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { ChevronDown, Globe, Shield } from "lucide-react";
import type { AdminUserSummary } from "@/types/domain";
import { Badge } from "@/components/ui/badge";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { cn } from "@/lib/utils";

interface AdminProfileMenuProps {
  user?: AdminUserSummary | null;
  className?: string;
}

export function AdminProfileMenu({ user, className }: AdminProfileMenuProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const displayName = user?.name || "Administrator";
  const displayEmail = user?.email || "admin@civicpulse.gov";
  const initial = displayName.charAt(0).toUpperCase() || "A";

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
        id="admin-menu-button"
        aria-expanded={open}
        aria-haspopup="true"
        aria-label="Open administrator account menu"
        onClick={() => setOpen((prev) => !prev)}
        className="flex items-center gap-2.5 rounded-full p-1 sm:px-2.5 sm:py-1.5 text-xs font-medium text-foreground hover:bg-muted/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors"
      >
        <span className="flex size-8 items-center justify-center rounded-full bg-destructive/10 text-destructive border border-destructive/20 font-bold text-xs shrink-0">
          {initial}
        </span>
        <div className="hidden sm:flex flex-col items-start text-left min-w-0">
          <span className="font-semibold truncate max-w-[120px]">{displayName}</span>
          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
            <Shield className="size-2.5 text-destructive shrink-0" aria-hidden="true" />
            <span>Admin</span>
          </span>
        </div>
        <ChevronDown
          className={cn(
            "size-3.5 text-muted-foreground transition-transform duration-200 hidden sm:block",
            open && "rotate-180"
          )}
          aria-hidden="true"
        />
      </button>

      {open && (
        <div
          role="menu"
          aria-orientation="vertical"
          aria-labelledby="admin-menu-button"
          className="absolute right-0 z-50 mt-2 w-64 origin-top-right rounded-xl border border-border bg-popover p-2 text-popover-foreground shadow-lg focus:outline-none animate-in fade-in-0 zoom-in-95"
        >
          {/* User Identity Header */}
          <div className="px-3 py-2 border-b border-border/80 mb-1 space-y-1">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold text-foreground truncate">{displayName}</p>
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-destructive/30 text-destructive bg-destructive/5 font-semibold">
                Administrator
              </Badge>
            </div>
            <p className="text-[11px] text-muted-foreground truncate">{displayEmail}</p>
          </div>

          {/* Navigation Links */}
          <div className="py-1 space-y-0.5">
            <Link
              href="/"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-foreground hover:bg-muted transition-colors"
            >
              <Globe className="size-3.5 text-muted-foreground" aria-hidden="true" />
              <span>View Public Website</span>
            </Link>
          </div>

          {/* Logout Section */}
          <div className="pt-1 border-t border-border/80 mt-1">
            <LogoutButton
              variant="ghost"
              className="w-full justify-start text-xs font-medium text-destructive hover:bg-destructive/10 hover:text-destructive h-8 px-3"
            />
          </div>
        </div>
      )}
    </div>
  );
}
