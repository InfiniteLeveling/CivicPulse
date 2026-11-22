"use client";

import Link from "next/link";
import { AlertCircle, ArrowLeft, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface AdminComplaintDetailErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function AdminComplaintDetailError({
  error,
  reset,
}: AdminComplaintDetailErrorProps) {
  return (
    <div className="max-w-xl mx-auto py-12 px-4">
      <Card className="border-destructive/30 bg-destructive/5 shadow-xs">
        <CardContent className="flex flex-col items-center justify-center p-8 text-center space-y-4">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive border border-destructive/20">
            <AlertCircle className="size-7" aria-hidden="true" />
          </div>

          <div className="space-y-1.5">
            <h1 className="text-xl font-bold tracking-tight text-foreground">
              Unable to Load Complaint Record
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
              {error.message ||
                "An unexpected error occurred while communicating with the administrative reports service."}
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={reset}
              className="text-xs gap-1.5"
            >
              <RefreshCw className="size-3.5" aria-hidden="true" />
              <span>Retry Request</span>
            </Button>
            <Link href="/admin/complaints">
              <Button size="sm" className="text-xs gap-1.5">
                <ArrowLeft className="size-3.5" aria-hidden="true" />
                <span>Return to Complaints Queue</span>
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
