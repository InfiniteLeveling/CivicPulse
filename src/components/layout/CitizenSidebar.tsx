"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  PlusCircle,
  ClipboardList,
  MapPin,
  Sparkles,
} from "lucide-react";
import { BrandLogo } from "@/components/common/BrandLogo";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { CitizenUserSummary } from "./CitizenProfileMenu";

interface CitizenSidebarProps {
  user?: CitizenUserSummary | null;
  className?: string;
}

const navItems = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    badge: null,
  },
  {
    title: "Report Issue",
    href: "/report",
    icon: PlusCircle,
    badge: "Phase 7",
  },
  {
    title: "My Complaints",
    href: "/my-reports",
    icon: ClipboardList,
    badge: null,
  },
  {
    title: "Civic Map",
    href: "/map",
    icon: MapPin,
    badge: null,
  },
] as const;

export function CitizenSidebar({ user, className }: CitizenSidebarProps) {
  const pathname = usePathname();

  const displayName = user?.name || "Jane Citizen";
  const displayEmail = user?.email || "citizen@example.org";
  const initial = displayName.charAt(0).toUpperCase() || "C";

  return (
    <aside
      className={cn(
        "hidden md:flex flex-col w-64 border-r border-border bg-card/50 h-screen sticky top-0 shrink-0",
        className
      )}
      aria-label="Citizen Navigation"
    >
      {/* Brand Header */}
      <div className="h-16 flex items-center px-6 border-b border-border/60">
        <Link
          href="/dashboard"
          className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg"
          aria-label="CivicPulse Citizen Dashboard"
        >
          <BrandLogo />
        </Link>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-1">
        <p className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Citizen Portal
        </p>

        <nav className="space-y-1.5" aria-label="Portal Navigation">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/dashboard" && pathname.startsWith(item.href));
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "group flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
                aria-current={isActive ? "page" : undefined}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Icon
                    className={cn(
                      "size-4 shrink-0 transition-colors",
                      isActive
                        ? "text-primary-foreground"
                        : "text-muted-foreground group-hover:text-foreground"
                    )}
                    aria-hidden="true"
                  />
                  <span className="truncate">{item.title}</span>
                </div>

                {item.badge && (
                  <Badge
                    variant={isActive ? "secondary" : "outline"}
                    className={cn(
                      "text-[10px] px-1.5 py-0 font-normal shrink-0",
                      isActive
                        ? "bg-primary-foreground/20 text-primary-foreground border-transparent"
                        : "text-muted-foreground border-border"
                    )}
                  >
                    {item.badge}
                  </Badge>
                )}
              </Link>
            );
          })}
        </nav>

        {/* AI Civic Assistance highlight card */}
        <div className="pt-6">
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-3.5 text-xs text-foreground/90 space-y-1.5">
            <div className="flex items-center gap-1.5 font-semibold text-primary">
              <Sparkles className="size-3.5" aria-hidden="true" />
              <span>Smart Civic Assistant</span>
            </div>
            <p className="text-muted-foreground text-[11px] leading-relaxed">
              Automated category detection, severity scoring, and duplicate consolidation keep city workflows efficient.
            </p>
          </div>
        </div>
      </div>

      {/* User identity & sign out footer */}
      <div className="p-4 border-t border-border/60 bg-muted/20 space-y-3">
        <div className="flex items-center gap-3">
          <span
            className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-xs border border-primary/20"
            aria-hidden="true"
          >
            {initial}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold truncate text-foreground">{displayName}</p>
            <p className="text-xs text-muted-foreground truncate">{displayEmail}</p>
          </div>
        </div>
        <LogoutButton
          variant="outline"
          size="sm"
          className="w-full justify-center gap-2 text-xs"
        />
      </div>
    </aside>
  );
}
