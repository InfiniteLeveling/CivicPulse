"use client";

import Link from "next/link";
import type { Route } from "next";
import { usePathname } from "next/navigation";
import type { AdminNavItem as AdminNavItemType } from "@/config/admin-navigation";
import { isActiveAdminRoute } from "@/config/admin-navigation";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface AdminNavItemProps {
  item: AdminNavItemType;
  onNavigate?: () => void;
}

export function AdminNavItem({ item, onNavigate }: AdminNavItemProps) {
  const pathname = usePathname();
  const isActive = isActiveAdminRoute(pathname, item.href, item.exact);
  const Icon = item.icon;

  if (!item.available) {
    return (
      <div
        role="button"
        aria-disabled="true"
        title={`${item.label} will be available in ${item.phaseBadge ?? "a future phase"}`}
        className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg text-xs font-medium text-slate-500 cursor-not-allowed select-none transition-colors"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <Icon className="size-4 shrink-0 opacity-60" aria-hidden="true" />
          <span className="truncate">{item.label}</span>
        </div>
        {item.phaseBadge && (
          <Badge
            variant="outline"
            className="text-[10px] px-1.5 py-0 border-slate-700 bg-slate-800/80 text-slate-400 font-normal shrink-0"
          >
            {item.phaseBadge}
          </Badge>
        )}
      </div>
    );
  }

  return (
    <Link
      href={item.href as unknown as Route}
      onClick={onNavigate}
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "flex items-center justify-between gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
        isActive
          ? "bg-primary text-white shadow-xs font-semibold"
          : "text-slate-300 hover:text-white hover:bg-slate-800/80"
      )}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <Icon
          className={cn(
            "size-4 shrink-0 transition-colors",
            isActive ? "text-white" : "text-slate-400 group-hover:text-white"
          )}
          aria-hidden="true"
        />
        <span className="truncate">{item.label}</span>
      </div>
    </Link>
  );
}
