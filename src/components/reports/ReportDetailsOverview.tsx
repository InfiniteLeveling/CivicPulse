import {
  Construction,
  Trash2,
  Droplets,
  Lightbulb,
  Waves,
  CircleHelp,
  Building2,
  Clock,
  ShieldCheck,
} from "lucide-react";
import type { ComplaintSummary, IssueCategory } from "@/types/domain";
import { CATEGORY_LABELS } from "@/lib/constants";
import { SeverityBadge } from "@/components/common/SeverityBadge";
import { PriorityBadge } from "@/components/common/PriorityBadge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { formatReportDateTime } from "@/lib/reports/formatting";

const CATEGORY_ICONS: Record<IssueCategory, React.ElementType> = {
  pothole: Construction,
  garbage: Trash2,
  water_leakage: Droplets,
  streetlight: Lightbulb,
  drainage: Waves,
  other: CircleHelp,
};

interface ReportDetailsOverviewProps {
  report: ComplaintSummary;
}

export function ReportDetailsOverview({ report }: ReportDetailsOverviewProps) {
  const CategoryIcon = CATEGORY_ICONS[report.category] ?? CircleHelp;
  const categoryLabel = CATEGORY_LABELS[report.category] ?? report.category;

  return (
    <div className="space-y-6">
      {/* Description Section */}
      <Card className="border-border shadow-xs">
        <CardHeader className="pb-3">
          <h2 className="text-base font-semibold text-foreground">
            Issue Description
          </h2>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm leading-relaxed text-foreground/90 whitespace-pre-wrap break-words">
            {report.description}
          </p>
        </CardContent>
      </Card>

      {/* Information Grid */}
      <Card className="border-border shadow-xs">
        <CardHeader className="pb-3">
          <h2 className="text-base font-semibold text-foreground">
            Report Information
          </h2>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 text-xs sm:text-sm">
            {/* Category */}
            <div className="space-y-1">
              <dt className="text-muted-foreground font-medium flex items-center gap-1.5">
                <CategoryIcon className="size-4 text-primary" aria-hidden="true" />
                <span>Category</span>
              </dt>
              <dd className="font-semibold text-foreground text-sm pl-5.5">
                {categoryLabel}
              </dd>
            </div>

            {/* Department Assignment */}
            <div className="space-y-1">
              <dt className="text-muted-foreground font-medium flex items-center gap-1.5">
                <Building2 className="size-4 text-primary" aria-hidden="true" />
                <span>Assigned Department</span>
              </dt>
              <dd className="font-medium text-foreground text-sm pl-5.5">
                {report.department?.name ? (
                  <span className="text-foreground font-semibold">
                    {report.department.name}
                  </span>
                ) : (
                  <span className="text-muted-foreground italic">
                    Not assigned yet
                  </span>
                )}
              </dd>
            </div>

            {/* Severity */}
            <div className="space-y-1">
              <dt className="text-muted-foreground font-medium flex items-center gap-1.5">
                <ShieldCheck className="size-4 text-primary" aria-hidden="true" />
                <span>Severity Assessment</span>
              </dt>
              <dd className="pt-0.5 pl-5.5">
                <SeverityBadge
                  severity={report.severity}
                  source={report.severityReviewed ? "admin" : undefined}
                />
              </dd>
            </div>

            {/* Priority Score (if provided by backend) */}
            {report.priority && (
              <div className="space-y-1">
                <dt className="text-muted-foreground font-medium flex items-center gap-1.5">
                  <Clock className="size-4 text-primary" aria-hidden="true" />
                  <span>Calculated Priority</span>
                </dt>
                <dd className="pt-0.5 pl-5.5">
                  <PriorityBadge
                    score={report.priority.score}
                    urgent={report.priority.urgent}
                  />
                </dd>
              </div>
            )}

            {/* Submitted Date */}
            <div className="space-y-1">
              <dt className="text-muted-foreground font-medium">
                Submission Timestamp
              </dt>
              <dd className="font-medium text-foreground text-xs sm:text-sm">
                {formatReportDateTime(report.createdAt)}
              </dd>
            </div>

            {/* Last Updated Date */}
            <div className="space-y-1">
              <dt className="text-muted-foreground font-medium">
                Last Activity
              </dt>
              <dd className="font-medium text-foreground text-xs sm:text-sm">
                {formatReportDateTime(report.updatedAt)}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}
