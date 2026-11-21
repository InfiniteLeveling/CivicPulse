import {
  LayoutDashboard,
  ClipboardList,
  BarChart3,
  MapPin,
  Globe,
} from "lucide-react";
import type { ElementType } from "react";

export interface AdminNavItem {
  label: string;
  href: string;
  icon: ElementType;
  available: boolean;
  phaseBadge?: string;
  exact?: boolean;
}

export interface AdminNavGroup {
  group: string;
  items: AdminNavItem[];
}

export const ADMIN_NAV_GROUPS: AdminNavGroup[] = [
  {
    group: "MAIN",
    items: [
      {
        label: "Overview",
        href: "/admin",
        icon: LayoutDashboard,
        available: true,
        exact: true,
      },
      {
        label: "Complaints Queue",
        href: "/admin/complaints",
        icon: ClipboardList,
        available: true,
      },
    ],
  },
  {
    group: "OPERATIONS",
    items: [
      {
        label: "City Analytics",
        href: "/admin/analytics",
        icon: BarChart3,
        available: false,
        phaseBadge: "Phase 20",
      },
    ],
  },
  {
    group: "PORTALS",
    items: [
      {
        label: "Live Civic Map",
        href: "/map",
        icon: MapPin,
        available: true,
      },
      {
        label: "Public Website",
        href: "/",
        icon: Globe,
        available: true,
      },
    ],
  },
];

/**
 * Checks whether an admin navigation link matches the current browser pathname.
 * Handles exact matching for root `/admin` and nested prefix matching for sub-routes.
 */
export function isActiveAdminRoute(
  pathname: string,
  href: string,
  exact = false
): boolean {
  if (exact || href === "/admin") {
    return pathname === href;
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}
