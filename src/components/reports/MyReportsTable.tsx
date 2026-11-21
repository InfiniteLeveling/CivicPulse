import type { Route } from "next";
import Link from "next/link";
import { Globe, Lock, ThumbsUp, ExternalLink } from "lucide-react";
import type { ComplaintSummary } from "@/types/domain";
import { CATEGORY_LABELS, ROUTES } from "@/lib/constants";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatReportDate } from "@/lib/reports/formatting";
import { cn } from "@/lib/utils";

interface MyReportsTableProps {
  reports: ComplaintSummary[];
}

export function MyReportsTable({ reports }: MyReportsTableProps) {
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden shadow-xs">
      <Table>
        <TableHeader className="bg-muted/40">
          <TableRow>
            <TableHead className="w-[38%] min-w-[240px]">Complaint</TableHead>
            <TableHead className="w-[14%]">Category</TableHead>
            <TableHead className="w-[12%]">Status</TableHead>
            <TableHead className="w-[10%]">Visibility</TableHead>
            <TableHead className="w-[12%]">Submitted</TableHead>
            <TableHead className="w-[8%] text-center">Support</TableHead>
            <TableHead className="w-[6%] text-right pr-4">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {reports.map((report) => {
            const isPublic = report.visibility === "public";

            return (
              <TableRow key={report.id} className="hover:bg-muted/30">
                {/* Title & Reference */}
                <TableCell className="align-middle py-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-semibold px-1.5 py-0.5 rounded bg-muted text-muted-foreground shrink-0">
                        {report.reference}
                      </span>
                      <span className="font-medium text-sm text-foreground line-clamp-1">
                        {report.title}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-1 max-w-md">
                      {report.description}
                    </p>
                  </div>
                </TableCell>

                {/* Category */}
                <TableCell className="align-middle py-3 text-xs font-medium text-foreground/90 whitespace-nowrap">
                  {CATEGORY_LABELS[report.category] ?? report.category}
                </TableCell>

                {/* Status */}
                <TableCell className="align-middle py-3 whitespace-nowrap">
                  <StatusBadge status={report.status} />
                </TableCell>

                {/* Visibility */}
                <TableCell className="align-middle py-3 whitespace-nowrap">
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
                </TableCell>

                {/* Submitted Date */}
                <TableCell className="align-middle py-3 text-xs text-muted-foreground whitespace-nowrap">
                  {formatReportDate(report.createdAt)}
                </TableCell>

                {/* Support Count */}
                <TableCell className="align-middle py-3 text-center whitespace-nowrap">
                  <div
                    className="inline-flex items-center gap-1 text-xs font-medium tabular-nums text-foreground/90 justify-center"
                    title={`${report.supportCount} citizens supported this issue`}
                  >
                    <ThumbsUp className="size-3 text-primary" aria-hidden="true" />
                    <span>{report.supportCount}</span>
                  </div>
                </TableCell>

                {/* Actions */}
                <TableCell className="align-middle py-3 text-right pr-4 whitespace-nowrap">
                  <Link
                    href={ROUTES.reportDetails(report.id) as unknown as Route}
                    className={cn(
                      buttonVariants({ variant: "outline", size: "sm" }),
                      "text-xs h-7 gap-1 px-2.5 font-medium hover:text-primary"
                    )}
                  >
                    <span>Details</span>
                    <ExternalLink className="size-3 text-muted-foreground" aria-hidden="true" />
                  </Link>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
