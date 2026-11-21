"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw, LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AdminComplaintsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Admin complaints queue error:", error);
  }, [error]);

  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center p-6 text-center">
      <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive mb-4">
        <AlertTriangle className="size-6" aria-hidden="true" />
      </div>
      <h2 className="text-xl font-bold tracking-tight text-foreground">
        Failed to Load Complaints Queue
      </h2>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">
        An error occurred while loading the administrative complaints queue. You can retry loading or return to the overview dashboard.
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <Button onClick={() => reset()} className="gap-2">
          <RefreshCw className="size-4" aria-hidden="true" />
          Retry
        </Button>
        <Link href="/admin">
          <Button variant="outline" className="gap-2">
            <LayoutDashboard className="size-4" aria-hidden="true" />
            Back to Overview
          </Button>
        </Link>
      </div>
    </div>
  );
}
