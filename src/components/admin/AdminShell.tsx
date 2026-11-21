"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import { AdminSidebar } from "./AdminSidebar";
import { AdminTopbar } from "./AdminTopbar";
import { AdminMobileNav } from "./AdminMobileNav";
import type { AdminUserSummary } from "@/types/domain";

interface AdminShellProps {
  user: AdminUserSummary;
  children: ReactNode;
}

export function AdminShell({ user, children }: AdminShellProps) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-muted/20 text-foreground">
      {/* Desktop Sidebar */}
      <AdminSidebar user={user} />

      {/* Main Column */}
      <div className="flex flex-1 flex-col min-w-0">
        <AdminTopbar user={user} onOpenMobileNav={() => setMobileNavOpen(true)} />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
          {children}
        </main>
      </div>

      {/* Mobile Drawer */}
      <AdminMobileNav
        open={mobileNavOpen}
        onClose={() => setMobileNavOpen(false)}
        user={user}
      />
    </div>
  );
}
