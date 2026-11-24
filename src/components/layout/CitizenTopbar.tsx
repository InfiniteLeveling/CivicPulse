"use client";

import Link from "next/link";
import { PlusCircle } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { CitizenProfileMenu, type CitizenUserSummary } from "./CitizenProfileMenu";
import { BrandLogo } from "@/components/common/BrandLogo";
import { cn } from "@/lib/utils";

interface CitizenTopbarProps {
  user?: CitizenUserSummary | null;
  isDemoData?: boolean;
}

export function CitizenTopbar({ user }: CitizenTopbarProps) {
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

        {/* Right side: quick action, profile menu */}
        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            href="/report"
            className={cn(buttonVariants({ variant: "default", size: "sm" }), "gap-1.5 font-medium shadow-sm")}
          >
            <PlusCircle className="size-4" aria-hidden="true" />
            <span>Report Issue</span>
          </Link>

          <CitizenProfileMenu user={user} />
        </div>
      </div>
    </header>
  );
}
