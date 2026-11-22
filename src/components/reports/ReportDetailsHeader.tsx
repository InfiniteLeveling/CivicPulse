import type { Route } from "next";
import Link from "next/link";
import { ArrowLeft, Globe, Lock, Calendar } from "lucide-react";
import type { ComplaintSummary } from "@/types/domain";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { formatReportDate } from "@/lib/reports/formatting";
import { cn } from "@/lib/utils";

interface ReportDetailsHeaderProps {
  report: ComplaintSummary;
  backHref?: Route | string;
  backLabel?: string;
}

export function ReportDetailsHeader({
  report,
  backHref = "/my-reports",
  backLabel = "Back to My Complaints",
}: ReportDetailsHeaderProps) {
  const isPublic = report.visibility === "public";

  return (
    <header className="space-y-4">
      {/* Back button */}
      <div>
        <Link
          href={backHref as unknown as Route}
          className={cn(
            buttonVariants({ variant: "ghost", size: "sm" }),
            "-ml-2 h-8 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
          )}
        >
          <ArrowLeft className="size-3.5" aria-hidden="true" />
          <span>{backLabel}</span>
        </Link>
      </div>

      {/* Main heading & badges */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2 flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded-md bg-muted text-muted-foreground">
              {report.reference}
            </span>
            <StatusBadge status={report.status} />
            <Badge
              variant="outline"
              className="text-[11px] gap-1 font-normal text-muted-foreground py-0.5"
            >
              {isPublic ? (
                <>
                  <Globe className="size-3" aria-hidden="true" />
                  <span>Public Report</span>
                </>
              ) : (
                <>
                  <Lock className="size-3" aria-hidden="true" />
                  <span>Private Report</span>
                </>
              )}
            </Badge>
          </div>

          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight text-foreground leading-snug break-words">
            {report.title}
          </h1>

          <div className="flex items-center gap-2 text-xs text-muted-foreground pt-0.5">
            <Calendar className="size-3.5 shrink-0" aria-hidden="true" />
            <span>Reported on {formatReportDate(report.createdAt)}</span>
          </div>
        </div>
      </div>
    </header>
  );
}
