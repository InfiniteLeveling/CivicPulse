import type { Route } from "next";
import Link from "next/link";
import { ThumbsUp, Globe, Lock, ExternalLink } from "lucide-react";
import type { ComplaintSummary } from "@/types/domain";
import { CATEGORY_LABELS, ROUTES } from "@/lib/constants";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { formatReportDate } from "@/lib/reports/formatting";
import { cn } from "@/lib/utils";

interface MyReportCardProps {
  report: ComplaintSummary;
}

export function MyReportCard({ report }: MyReportCardProps) {
  const isPublic = report.visibility === "public";

  return (
    <article
      data-testid="my-report-card"
      className="p-4 rounded-xl border border-border bg-card shadow-xs space-y-3 transition-colors hover:border-border/80"
    >
      {/* Top Header Row: Reference, Status, Visibility */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded-md bg-muted text-muted-foreground">
            {report.reference}
          </span>
          <StatusBadge status={report.status} />
        </div>

        <Badge
          variant="outline"
          className="text-[11px] gap-1 font-normal text-muted-foreground py-0.5"
        >
          {isPublic ? (
            <>
              <Globe className="size-3" aria-hidden="true" />
              <span>Public</span>
            </>
          ) : (
            <>
              <Lock className="size-3" aria-hidden="true" />
              <span>Private</span>
            </>
          )}
        </Badge>
      </div>

      {/* Title & Description */}
      <div className="space-y-1">
        <h3 className="font-semibold text-sm sm:text-base text-foreground leading-snug">
          {report.title}
        </h3>
        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
          {report.description}
        </p>
      </div>

      {/* Metadata: Category, Date, Support */}
      <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t border-border/50">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-foreground/80">
            {CATEGORY_LABELS[report.category] ?? report.category}
          </span>
          <span>•</span>
          <span>{formatReportDate(report.createdAt)}</span>
        </div>

        <div
          className="inline-flex items-center gap-1 font-medium text-foreground/90 tabular-nums"
          title={`${report.supportCount} citizens supported this issue`}
        >
          <ThumbsUp className="size-3 text-primary" aria-hidden="true" />
          <span>{report.supportCount}</span>
        </div>
      </div>

      {/* Action Row */}
      <div className="pt-1">
        <Link
          href={ROUTES.reportDetails(report.id) as unknown as Route}
          className={cn(
            buttonVariants({ variant: "outline", size: "sm" }),
            "w-full text-xs h-8 gap-1.5 font-medium hover:text-primary"
          )}
        >
          <span>View Details</span>
          <ExternalLink className="size-3 text-muted-foreground" aria-hidden="true" />
        </Link>
      </div>
    </article>
  );
}
