"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RotateCcw, ArrowLeft } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export default function ReportDetailsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Report details error boundary caught:", error);
  }, [error]);

  return (
    <div className="max-w-xl mx-auto py-12 px-4">
      <Card className="border-destructive/30 bg-destructive/5 shadow-xs">
        <CardContent className="flex flex-col items-center justify-center p-8 text-center space-y-4">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive border border-destructive/20">
            <AlertTriangle className="size-7" aria-hidden="true" />
          </div>

          <div className="space-y-1.5">
            <h1 className="text-xl font-bold tracking-tight text-foreground">
              We Couldn&apos;t Load This Complaint
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
              We encountered an issue communicating with the server. Please check your connection and try again.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2.5 pt-2">
            <Button
              type="button"
              variant="default"
              size="sm"
              onClick={() => reset()}
              className="gap-1.5 shadow-xs text-xs"
            >
              <RotateCcw className="size-3.5" aria-hidden="true" />
              <span>Retry</span>
            </Button>

            <Link
              href="/my-reports"
              className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-1.5 text-xs")}
            >
              <ArrowLeft className="size-3.5" aria-hidden="true" />
              <span>Return to My Complaints</span>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
