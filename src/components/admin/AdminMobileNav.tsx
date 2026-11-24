"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { X, Shield } from "lucide-react";
import { BrandLogo } from "@/components/common/BrandLogo";
import { Badge } from "@/components/ui/badge";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { ADMIN_NAV_GROUPS } from "@/config/admin-navigation";
import { AdminNavItem } from "./AdminNavItem";
import type { AdminUserSummary } from "@/types/domain";

interface AdminMobileNavProps {
  open: boolean;
  onClose: () => void;
  user?: AdminUserSummary | null;
}

export function AdminMobileNav({ open, onClose, user }: AdminMobileNavProps) {
  const drawerRef = useRef<HTMLDivElement>(null);
  const displayName = user?.name || "Administrator";
  const displayEmail = user?.email || "admin@civicpulse.gov";
  const initial = displayName.charAt(0).toUpperCase() || "A";

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && open) {
        onClose();
      }
    }

    if (open) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Mobile administrative navigation drawer"
      className="fixed inset-0 z-50 md:hidden"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer Panel */}
      <div
        ref={drawerRef}
        className="fixed inset-y-0 left-0 w-72 max-w-[85vw] bg-slate-900 border-r border-slate-800 text-slate-100 flex flex-col shadow-2xl animate-in slide-in-from-left duration-200"
      >
        {/* Header */}
        <div className="h-16 px-4 flex items-center justify-between border-b border-slate-800">
          <Link href="/admin" onClick={onClose} className="flex items-center gap-2">
            <BrandLogo inverse />
            <Badge
              variant="outline"
              className="text-[10px] font-bold px-1.5 py-0.5 border-destructive/40 text-destructive bg-destructive/10 uppercase tracking-wider"
            >
              Admin
            </Badge>
          </Link>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close navigation drawer"
            className="size-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>

        {/* Navigation Groups */}
        <nav
          className="flex-1 px-3 py-4 space-y-5 overflow-y-auto"
          aria-label="Admin mobile navigation"
        >
          {ADMIN_NAV_GROUPS.map((group) => (
            <div key={group.group} className="space-y-1">
              <h2 className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                {group.group}
              </h2>
              <div className="space-y-0.5 pt-0.5">
                {group.items.map((item) => (
                  <AdminNavItem
                    key={item.label}
                    item={item}
                    onNavigate={onClose}
                  />
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* Identity & Logout Footer */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/50 space-y-2">
          <div className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg bg-slate-800/50 border border-slate-700/50">
            <span className="flex size-7 items-center justify-center rounded-full bg-destructive/20 text-destructive border border-destructive/30 font-bold text-xs shrink-0">
              {initial}
            </span>
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-semibold text-slate-200 truncate">
                {displayName}
              </span>
              <span className="text-[10px] text-slate-400 truncate flex items-center gap-1">
                <Shield className="size-2.5 text-destructive shrink-0" aria-hidden="true" />
                <span>{displayEmail}</span>
              </span>
            </div>
          </div>

          <LogoutButton
            variant="ghost"
            className="w-full justify-start text-xs text-slate-400 hover:text-white hover:bg-slate-800 h-8 px-2"
          />
        </div>
      </div>
    </div>
  );
}
