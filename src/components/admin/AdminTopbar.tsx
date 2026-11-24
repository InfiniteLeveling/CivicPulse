"use client";

import Link from "next/link";
import { Menu, ShieldCheck, Globe } from "lucide-react";
import { BrandLogo } from "@/components/common/BrandLogo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { AdminProfileMenu } from "./AdminProfileMenu";
import type { AdminUserSummary } from "@/types/domain";

interface AdminTopbarProps {
  user?: AdminUserSummary | null;
  onOpenMobileNav: () => void;
}

export function AdminTopbar({ user, onOpenMobileNav }: AdminTopbarProps) {
  return (
    <header className="sticky top-0 z-30 h-16 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 px-4 sm:px-6">
      <div className="h-full flex items-center justify-between gap-4">
        {/* Left: Mobile Trigger & Section Heading */}
        <div className="flex items-center gap-3">
          {/* Mobile Menu Trigger */}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onOpenMobileNav}
            aria-label="Open administrative navigation"
            className="md:hidden size-9 text-foreground"
          >
            <Menu className="size-5" aria-hidden="true" />
          </Button>

          {/* Compact brand logo for mobile */}
          <div className="md:hidden">
            <Link href="/admin" aria-label="Admin Portal">
              <BrandLogo compact />
            </Link>
          </div>

          {/* Title & Badge */}
          <div className="hidden sm:flex items-center gap-2.5">
            <h1 className="text-sm sm:text-base font-semibold tracking-tight text-foreground">
              Administrator Portal
            </h1>
            <Badge
              variant="outline"
              className="border-primary/30 text-primary bg-primary/5 text-xs font-medium gap-1"
            >
              <ShieldCheck className="size-3" aria-hidden="true" />
              <span>Official Console</span>
            </Badge>
          </div>
        </div>

        {/* Right: Public Website shortcut & Admin Profile Menu */}
        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            href="/"
            className="hidden sm:inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <Globe className="size-3.5" aria-hidden="true" />
            <span>Public Site</span>
          </Link>

          <ThemeToggle variant="ghost" size="sm" />

          <AdminProfileMenu user={user} />
        </div>
      </div>
    </header>
  );
}
