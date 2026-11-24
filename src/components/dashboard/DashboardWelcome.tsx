"use client";

import Link from "next/link";
import { PlusCircle, MapPin } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface DashboardWelcomeProps {
  userName?: string;
  isDemoData?: boolean;
  isEmptyView?: boolean;
}

export function DashboardWelcome({
  userName = "Citizen",
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
            </div>

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
              className={cn(buttonVariants({ variant: "default", size: "default" }), "gap-2 shadow-sm")}
            >
              <PlusCircle className="size-4" aria-hidden="true" />
              <span>Report an Issue</span>
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
    </section>
  );
}
