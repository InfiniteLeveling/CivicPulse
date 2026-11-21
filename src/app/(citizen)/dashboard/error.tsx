"use client";

import { useEffect } from "react";
import { ErrorState } from "@/components/common/ErrorState";

interface DashboardErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function DashboardError({ error, reset }: DashboardErrorProps) {
  useEffect(() => {
    // Log client error safely
    console.error("Dashboard error caught by boundary:", error);
  }, [error]);

  return (
    <div className="py-12 max-w-xl mx-auto space-y-4">
      <ErrorState
        message="Unable to load citizen dashboard"
        guidance="We encountered an unexpected error while retrieving your complaints data. Please verify your connection and try again."
        onRetry={reset}
      />
    </div>
  );
}
