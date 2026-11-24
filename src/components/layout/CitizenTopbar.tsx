"use client";

import Link from "next/link";
import { PlusCircle, Sparkles } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CitizenProfileMenu, type CitizenUserSummary } from "./CitizenProfileMenu";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { BrandLogo } from "@/components/common/BrandLogo";
import { cn } from "@/lib/utils";

interface CitizenTopbarProps {
  user?: CitizenUserSummary | null;
  isDemoData?: boolean;
}

export function CitizenTopbar({ user, isDemoData }: CitizenTopbarProps) {
  return (
    <header className="sticky top-0 z-30 h-16 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 px-4 sm:px-6">
      <div className="h-full flex items-center justify-between gap-4">
        {/* Left: Mobile Brand / Page Title */}
        <div className="flex items-center gap-3">
          <div className="md:hidden">
            <Link href="/dashboard" aria-label="Citizen Dashboard">
              <BrandLogo compact />
            </Link>
          </div>
          <div className="hidden sm:block">
            <h1 className="text-base sm:text-lg font-semibold tracking-tight text-foreground">
              Citizen Dashboard
            </h1>
            <p className="text-xs text-muted-foreground hidden md:block">
              Track infrastructure reports and monitor community resolution
            </p>
          </div>
        </div>

        {/* Right side: Demo badge, quick action, profile menu */}
        <div className="flex items-center gap-2 sm:gap-3">
          {isDemoData && (
            <Badge
              variant="outline"
              className="hidden lg:inline-flex items-center gap-1 border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300 text-xs px-2.5 py-0.5"
            >
              <Sparkles className="size-3" aria-hidden="true" />
              <span>Preview Mode</span>
            </Badge>
          )}

          <Link
            href="/report"
            className={cn(buttonVariants({ variant: "default", size: "sm" }), "gap-1.5 font-medium shadow-sm")}
          >
            <PlusCircle className="size-4" aria-hidden="true" />
            <span>Report Issue</span>
          </Link>

          <ThemeToggle variant="ghost" size="sm" />

          <CitizenProfileMenu user={user} />
        </div>
      </div>
    </header>
  );
}
