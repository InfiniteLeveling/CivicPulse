"use client";

import type { Route } from "next";
import { useState, useRef } from "react";
import Link from "next/link";
import {
  Calendar,
  Building2,
  ThumbsUp,
  MapPin,
  Info,
  ExternalLink,
} from "lucide-react";
import type { ComplaintSummary } from "@/types/domain";
import { StatusBadge } from "@/components/common/StatusBadge";
import { SeverityBadge } from "@/components/common/SeverityBadge";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CATEGORY_LABELS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";

interface RecentReportCardProps {
  report: ComplaintSummary;
}

export function RecentReportCard({ report }: RecentReportCardProps) {
  const [open, setOpen] = useState(false);
  const cancelRef = useRef<HTMLButtonElement>(null);

  const formattedDate = new Date(report.createdAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const categoryLabel =
    CATEGORY_LABELS[report.category] ?? report.category;

  return (
    <Card className="transition-all hover:border-primary/40 hover:shadow-sm">
      <CardContent className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Left: Info */}
        <div className="space-y-2 min-w-0 flex-1">
          {/* Reference + Category + Badges */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs font-semibold text-muted-foreground bg-muted px-2 py-0.5 rounded">
              {report.reference}
            </span>
            <Badge variant="outline" className="text-xs font-normal">
              {categoryLabel}
            </Badge>
            <StatusBadge status={report.status} />
            <SeverityBadge severity={report.severity} />
          </div>

          {/* Title */}
          <h3 className="text-base font-semibold text-foreground tracking-tight line-clamp-1">
            {report.title}
          </h3>

          {/* Metadata row */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Calendar className="size-3.5" aria-hidden="true" />
              <span>Reported {formattedDate}</span>
            </span>

            {report.department && (
              <span className="inline-flex items-center gap-1">
                <Building2 className="size-3.5" aria-hidden="true" />
                <span>{report.department.name}</span>
              </span>
            )}

            <span className="inline-flex items-center gap-1">
              <ThumbsUp className="size-3.5" aria-hidden="true" />
              <span>{report.supportCount} citizen supports</span>
            </span>
          </div>
        </div>

        {/* Right: View Details Action with Accessible Modal */}
        <div className="sm:self-center shrink-0">
          <AlertDialog open={open} onOpenChange={setOpen}>
            <AlertDialogTrigger
              render={
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full sm:w-auto gap-1.5 text-xs"
                >
                  <Info className="size-3.5" aria-hidden="true" />
                  <span>View Details</span>
                </Button>
              }
            />

            <AlertDialogContent initialFocus={cancelRef} className="max-w-md">
              <AlertDialogHeader>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono text-xs font-semibold text-muted-foreground bg-muted px-2 py-0.5 rounded">
                    {report.reference}
                  </span>
                  <StatusBadge status={report.status} />
                  <SeverityBadge severity={report.severity} />
                </div>
                <AlertDialogTitle className="text-lg font-semibold text-foreground">
                  {report.title}
                </AlertDialogTitle>
                <AlertDialogDescription className="text-sm text-foreground/80 mt-2">
                  {report.description}
                </AlertDialogDescription>
              </AlertDialogHeader>

              <div className="space-y-2.5 rounded-lg border bg-muted/30 p-3 text-xs text-muted-foreground my-2">
                <div className="flex justify-between items-center">
                  <span className="font-medium text-foreground">Category:</span>
                  <span>{categoryLabel}</span>
                </div>
                {report.department && (
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-foreground">Department:</span>
                    <span>{report.department.name}</span>
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <span className="font-medium text-foreground">Location:</span>
                  <span className="inline-flex items-center gap-1 font-mono text-[11px]">
                    <MapPin className="size-3" aria-hidden="true" />
                    {report.latitude.toFixed(4)}, {report.longitude.toFixed(4)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-medium text-foreground">Community Support:</span>
                  <span>{report.supportCount} citizens</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-medium text-foreground">Submitted:</span>
                  <span>{formattedDate}</span>
                </div>
              </div>

              <AlertDialogFooter className="flex-row items-center justify-between sm:justify-end gap-2">
                <Link
                  href={`/reports/${encodeURIComponent(report.id)}` as unknown as Route}
                  className={cn(buttonVariants({ variant: "outline", size: "sm" }), "text-xs gap-1.5")}
                >
                  <span>Open Full Page</span>
                  <ExternalLink className="size-3" aria-hidden="true" />
                </Link>
                <AlertDialogCancel ref={cancelRef} size="sm">
                  Close
                </AlertDialogCancel>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardContent>
    </Card>
  );
}
