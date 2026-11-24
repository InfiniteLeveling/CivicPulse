"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  PlusCircle,
  ClipboardList,
  MapPin,
} from "lucide-react";
import { cn } from "@/lib/utils";

const mobileNavItems = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    isPrimary: false,
  },
  {
    title: "My Reports",
    href: "/my-reports",
    icon: ClipboardList,
    isPrimary: false,
  },
  {
    title: "Report",
    href: "/report",
    icon: PlusCircle,
    isPrimary: true,
  },
  {
    title: "Map",
    href: "/map",
    icon: MapPin,
    isPrimary: false,
  },
] as const;

export function CitizenMobileNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-background/95 backdrop-blur-md md:hidden pb-safe"
      aria-label="Mobile Navigation"
    >
      <div className="grid grid-cols-4 h-16 items-center px-2">
        {mobileNavItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));
          const Icon = item.icon;

          if (item.isPrimary) {
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex flex-col items-center justify-center -mt-4 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-full"
                aria-current={isActive ? "page" : undefined}
                aria-label="Report a new civic issue"
              >
                <span className="flex size-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform group-hover:scale-105 group-active:scale-95">
                  <PlusCircle className="size-6" aria-hidden="true" />
                </span>
                <span className="text-[11px] font-semibold text-primary mt-0.5">
                  Report
                </span>
              </Link>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center gap-1 h-full min-h-[44px] rounded-lg text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                isActive
                  ? "text-primary font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              )}
              aria-current={isActive ? "page" : undefined}
            >
              <Icon
                className={cn(
                  "size-5 transition-transform",
                  isActive ? "scale-110 text-primary" : "text-muted-foreground"
                )}
                aria-hidden="true"
              />
              <span className="text-[11px] leading-tight">{item.title}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
