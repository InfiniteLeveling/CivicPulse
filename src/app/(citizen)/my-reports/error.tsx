"use client";

import { useEffect } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function MyReportsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("MyReports page error boundary caught error:", error);
  }, [error]);

  return (
    <div className="max-w-2xl mx-auto py-12 px-4">
      <Card className="border-destructive/30 bg-destructive/5 shadow-sm">
        <CardContent className="flex flex-col items-center justify-center p-8 text-center space-y-4">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive border border-destructive/20">
            <AlertTriangle className="size-7" aria-hidden="true" />
          </div>

          <div className="space-y-1.5">
            <h2 className="text-xl font-bold tracking-tight text-foreground">
              Unable to Load My Complaints
            </h2>
            <p className="text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
              An unexpected error occurred while loading your complaints. Please check your network connection and retry.
            </p>
          </div>

          <div className="pt-2">
            <Button
              type="button"
              variant="default"
              onClick={() => reset()}
              className="gap-2 shadow-xs"
            >
              <RotateCcw className="size-4" aria-hidden="true" />
              <span>Retry Loading Page</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
