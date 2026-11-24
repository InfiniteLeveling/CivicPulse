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
  },
  {
    title: "Report",
    href: "/report",
    icon: PlusCircle,
  },
  {
    title: "My Reports",
    href: "/my-reports",
    icon: ClipboardList,
  },
  {
    title: "Map",
    href: "/map",
    icon: MapPin,
  },
] as const;

export function CitizenMobileNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-card/95 backdrop-blur-md md:hidden safe-bottom shadow-lg"
      aria-label="Mobile Navigation"
    >
      <div className="grid grid-cols-4 h-16 items-center px-1">
        {mobileNavItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));
          const Icon = item.icon;
          const isReport = item.href === "/report";

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center gap-1 h-full min-h-[44px] rounded-lg text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                isActive
                  ? "text-primary font-bold"
                  : "text-muted-foreground hover:text-foreground"
              )}
              aria-current={isActive ? "page" : undefined}
            >
              {isReport ? (
                <div className="size-8 rounded-full bg-primary/10 text-primary flex items-center justify-center active:scale-95 transition-transform">
                  <Icon className="size-5" aria-hidden="true" />
                </div>
              ) : (
                <Icon
                  className={cn(
                    "size-5 transition-transform",
                    isActive ? "scale-110 text-primary" : "text-muted-foreground"
                  )}
                  aria-hidden="true"
                />
              )}
              <span className="text-[11px] leading-tight">{item.title}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
