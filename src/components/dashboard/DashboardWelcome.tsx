"use client";

import Link from "next/link";
import { PlusCircle, MapPin, Sparkles, Eye } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface DashboardWelcomeProps {
  userName?: string;
  isDemoData?: boolean;
  isEmptyView?: boolean;
}

export function DashboardWelcome({
  userName = "Jane",
  isDemoData = true,
  isEmptyView = false,
}: DashboardWelcomeProps) {
  // Extract first name for friendly greeting
  const firstName = userName.split(" ")[0] || "Citizen";

  return (
    <section className="space-y-4">
      {/* Friendly greeting hero card */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary/10 via-primary/5 to-muted/30 border border-primary/15 p-6 sm:p-8">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2">
              <Badge variant="outline" className="bg-background/80 text-primary border-primary/20 text-xs py-0.5">
                Citizen Portal
              </Badge>
              {isDemoData && (
                <Badge variant="secondary" className="text-[11px] gap-1">
                  <Sparkles className="size-3 text-amber-500" aria-hidden="true" />
                  <span>Preview Fixtures</span>
                </Badge>
              )}
            </div>

            <p className="text-xs font-semibold text-primary uppercase tracking-wider">
              How can we help your community today?
            </p>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Welcome back, {firstName}!
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
              Track infrastructure reports in real time, monitor municipal resolution progress, and help keep our city clean and safe.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <Link
              href="/report"
              className={cn(buttonVariants({ variant: "default", size: "default" }), "gap-2 shadow-sm font-semibold h-11 px-5")}
            >
              <PlusCircle className="size-4" aria-hidden="true" />
              <span>Report a New Issue</span>
            </Link>
            <Link
              href="/map"
              className={cn(buttonVariants({ variant: "outline", size: "default" }), "gap-2")}
            >
              <MapPin className="size-4" aria-hidden="true" />
              <span>Explore Map</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Demo / State Notice Banner */}
      {isDemoData && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-border/80 bg-muted/40 px-4 py-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <Sparkles className="size-4 text-primary shrink-0" aria-hidden="true" />
            <span>
              <strong>Demonstration Mode:</strong> Displaying sample citizen activity. Full backend synchronization activates in Phases 7–8.
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Link
              href={isEmptyView ? "/dashboard" : "/dashboard?empty=true"}
              className={cn(
                buttonVariants({ variant: "ghost", size: "xs" }),
                "text-xs h-7 gap-1.5 text-foreground hover:bg-background"
              )}
            >
              <Eye className="size-3.5" aria-hidden="true" />
              <span>{isEmptyView ? "Show populated view" : "Preview empty state"}</span>
            </Link>
          </div>
        </div>
      )}
    </section>
  );
}
