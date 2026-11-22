"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Admin portal error:", error);
  }, [error]);

  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center p-6 text-center">
      <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive mb-4">
        <AlertTriangle className="size-6" aria-hidden="true" />
      </div>
      <h2 className="text-xl font-bold tracking-tight text-foreground">
        Failed to Load Admin Workspace
      </h2>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">
        An unexpected error occurred while loading the administrative console. Please try reloading or
        return to the main dashboard.
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <Button onClick={() => reset()} className="gap-2">
          <RefreshCw className="size-4" aria-hidden="true" />
          Retry
        </Button>
        <Link href="/dashboard">
          <Button variant="outline" className="gap-2">
            <ArrowLeft className="size-4" aria-hidden="true" />
            Citizen Dashboard
          </Button>
        </Link>
      </div>
    </div>
  );
}
