"use client";

import Link from "next/link";
import { Shield } from "lucide-react";
import { BrandLogo } from "@/components/common/BrandLogo";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { Badge } from "@/components/ui/badge";
import { ADMIN_NAV_GROUPS } from "@/config/admin-navigation";
import { AdminNavItem } from "./AdminNavItem";
import type { AdminUserSummary } from "@/types/domain";
import { cn } from "@/lib/utils";

interface AdminSidebarProps {
  user?: AdminUserSummary | null;
  className?: string;
}

export function AdminSidebar({ user, className }: AdminSidebarProps) {
  const displayName = user?.name || "Administrator";
  const displayEmail = user?.email || "admin@civicpulse.gov";
  const initial = displayName.charAt(0).toUpperCase() || "A";

  return (
    <aside
      className={cn(
        "hidden md:flex flex-col w-64 bg-slate-900 border-r border-slate-800 text-slate-100 h-screen sticky top-0 shrink-0",
        className
      )}
      aria-label="Admin desktop navigation"
    >
      {/* Brand Header */}
      <div className="h-16 px-5 flex items-center justify-between border-b border-slate-800/80">
        <Link
          href="/admin"
          className="flex items-center gap-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-md"
        >
          <BrandLogo />
        </Link>
        <Badge
          variant="outline"
          className="text-[10px] font-bold px-1.5 py-0.5 border-destructive/40 text-destructive bg-destructive/10 uppercase tracking-wider"
        >
          Admin
        </Badge>
      </div>

      {/* Navigation Groups */}
      <nav
        className="flex-1 px-3 py-4 space-y-5 overflow-y-auto"
        aria-label="Admin portal sections"
      >
        {ADMIN_NAV_GROUPS.map((group) => (
          <div key={group.group} className="space-y-1">
            <h2 className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              {group.group}
            </h2>
            <div className="space-y-0.5 pt-0.5">
              {group.items.map((item) => (
                <AdminNavItem key={item.label} item={item} />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Admin Identity Footer */}
      <div className="p-3 border-t border-slate-800/80 bg-slate-950/40 space-y-2">
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
    </aside>
  );
}
