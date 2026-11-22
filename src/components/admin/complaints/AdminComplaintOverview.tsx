import {
  Building2,
  Calendar,
  Eye,
  Lock,
  ThumbsUp,
  AlertOctagon,
  ShieldCheck,
  Tag,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CATEGORY_LABELS } from "@/lib/constants";
import type { ComplaintSummary } from "@/types/domain";

interface AdminComplaintOverviewProps {
  report: ComplaintSummary;
}

export function AdminComplaintOverview({ report }: AdminComplaintOverviewProps) {
  const categoryLabel = CATEGORY_LABELS[report.category] ?? report.category;
  const isUrgent =
    report.priority.urgent ||
    report.severity === "critical" ||
    report.priority.score >= 70;

  return (
    <div className="space-y-6">
      {/* Description Section */}
      <Card className="border-border shadow-xs">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-foreground">
            Complaint Description
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-relaxed text-foreground/90 whitespace-pre-wrap break-words">
            {report.description}
          </p>
        </CardContent>
      </Card>

      {/* Metadata Overview Grid */}
      <Card className="border-border shadow-xs">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-foreground">
            Current Case Parameters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 text-xs sm:text-sm">
            {/* Category */}
            <div className="space-y-1">
              <dt className="text-muted-foreground font-medium flex items-center gap-1.5">
                <Tag className="size-4 text-primary" aria-hidden="true" />
                <span>Issue Category</span>
              </dt>
              <dd className="font-semibold text-foreground pl-5.5">
                {categoryLabel}
              </dd>
            </div>

            {/* Department */}
            <div className="space-y-1">
              <dt className="text-muted-foreground font-medium flex items-center gap-1.5">
                <Building2 className="size-4 text-primary" aria-hidden="true" />
                <span>Assigned Department</span>
              </dt>
              <dd className="font-medium text-foreground pl-5.5">
                {report.department?.name ? (
                  <span className="font-semibold text-foreground">
                    {report.department.name}
                  </span>
                ) : (
                  <span className="text-muted-foreground italic">
                    Unassigned (Field Services)
                  </span>
                )}
              </dd>
            </div>

            {/* Severity Assessment */}
            <div className="space-y-1">
              <dt className="text-muted-foreground font-medium flex items-center gap-1.5">
                <ShieldCheck className="size-4 text-primary" aria-hidden="true" />
                <span>Severity Review</span>
              </dt>
              <dd className="pl-5.5 flex items-center gap-2">
                <span className="capitalize font-semibold text-foreground">
                  {report.severity}
                </span>
                {report.severityReviewed ? (
                  <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200">
                    Admin Verified
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700 border-amber-200">
                    Provisional (Citizen)
                  </Badge>
                )}
              </dd>
            </div>

            {/* Visibility */}
            <div className="space-y-1">
              <dt className="text-muted-foreground font-medium flex items-center gap-1.5">
                {report.visibility === "public" ? (
                  <Eye className="size-4 text-primary" aria-hidden="true" />
                ) : (
                  <Lock className="size-4 text-amber-600" aria-hidden="true" />
                )}
                <span>Visibility Access</span>
              </dt>
              <dd className="pl-5.5">
                {report.visibility === "public" ? (
                  <span className="font-medium text-foreground">
                    Public (Map & Discovery Visible)
                  </span>
                ) : (
                  <span className="font-medium text-amber-700 dark:text-amber-400">
                    Private (Citizen & Staff Only)
                  </span>
                )}
              </dd>
            </div>

            {/* Community Support */}
            <div className="space-y-1">
              <dt className="text-muted-foreground font-medium flex items-center gap-1.5">
                <ThumbsUp className="size-4 text-primary" aria-hidden="true" />
                <span>Community Support</span>
              </dt>
              <dd className="font-semibold text-foreground pl-5.5">
                {report.supportCount} citizen{report.supportCount === 1 ? "" : "s"}
              </dd>
            </div>

            {/* Priority Assessment */}
            <div className="space-y-1">
              <dt className="text-muted-foreground font-medium flex items-center gap-1.5">
                {isUrgent ? (
                  <AlertOctagon className="size-4 text-rose-600" aria-hidden="true" />
                ) : (
                  <Calendar className="size-4 text-primary" aria-hidden="true" />
                )}
                <span>Server Priority Score</span>
              </dt>
              <dd className="pl-5.5 flex items-center gap-2">
                <span className="font-mono font-bold text-base text-foreground">
                  {report.priority.score}
                </span>
                <span className="text-xs text-muted-foreground">/ 100</span>
                {isUrgent && (
                  <Badge variant="destructive" className="text-[10px] gap-1 px-1.5 py-0">
                    <AlertOctagon className="size-3" aria-hidden="true" />
                    <span>Urgent</span>
                  </Badge>
                )}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}
