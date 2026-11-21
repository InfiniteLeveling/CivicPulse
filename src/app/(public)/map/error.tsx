"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertCircle, RotateCcw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function PublicMapError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Public map error:", error);
  }, [error]);

  return (
    <div className="max-w-md mx-auto py-12">
      <Card className="border-border shadow-xs text-center">
        <CardContent className="p-6 space-y-4">
          <div className="mx-auto flex size-12 items-center justify-center rounded-xl bg-destructive/10 text-destructive border border-destructive/20">
            <AlertCircle className="size-6" aria-hidden="true" />
          </div>

          <div className="space-y-1.5">
            <h2 className="text-base font-semibold text-foreground">
              Failed to Load Civic Map
            </h2>
            <p className="text-xs text-muted-foreground leading-relaxed">
              We encountered an error retrieving public civic reports. Please check your connection and try again.
            </p>
          </div>

          <div className="flex items-center justify-center gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={reset}
              className="text-xs gap-1.5"
            >
              <RotateCcw className="size-3.5" aria-hidden="true" />
              <span>Retry</span>
            </Button>

            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-md bg-muted hover:bg-muted/80 text-foreground transition-colors"
            >
              <Home className="size-3.5" aria-hidden="true" />
              <span>Return Home</span>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
