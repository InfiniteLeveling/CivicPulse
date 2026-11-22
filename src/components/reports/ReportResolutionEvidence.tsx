import { CheckCircle2, Calendar, FileText, Image as ImageIcon } from "lucide-react";
import type { ComplaintDetails } from "@/types/domain";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { formatReportDateTime } from "@/lib/reports/formatting";

interface ReportResolutionEvidenceProps {
  details: ComplaintDetails;
}

export function ReportResolutionEvidence({ details }: ReportResolutionEvidenceProps) {
  const { report, resolutionImages, history } = details;

  if (report.status !== "resolved") {
    return null;
  }

  // Find the resolution event from history if present
  const resolutionEvent = history.find(
    (h) => h.newStatus === "resolved" || h.eventType === "status_changed"
  );

  const resolutionRemark = resolutionEvent?.remark ?? "The reported infrastructure issue was reviewed, repaired, and marked resolved by municipal maintenance staff.";
  const resolvedTimestamp = report.resolvedAt ?? resolutionEvent?.createdAt ?? report.updatedAt;

  return (
    <Card className="border-emerald-500/40 bg-emerald-500/5 dark:bg-emerald-950/10 shadow-xs">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-emerald-950 dark:text-emerald-100 flex items-center gap-2">
            <CheckCircle2 className="size-4.5 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
            <span>Resolution Evidence</span>
          </h2>
          <span className="text-[11px] font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
            Municipal Verified
          </span>
        </div>
        <p className="text-xs text-muted-foreground">
          View the evidence provided when this issue was marked resolved.
        </p>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Official Remark */}
        <div className="space-y-1.5 bg-background/80 p-3.5 rounded-xl border border-emerald-500/20">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
            <FileText className="size-3.5 text-emerald-600" aria-hidden="true" />
            <span>Official Resolution Note</span>
          </div>
          <p className="text-xs sm:text-sm text-foreground/90 leading-relaxed">
            {resolutionRemark}
          </p>
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground pt-1">
            <Calendar className="size-3 text-muted-foreground" aria-hidden="true" />
            <span>Resolved on {formatReportDateTime(resolvedTimestamp)}</span>
          </div>
        </div>

        {/* Resolution Evidence Photographs */}
        {resolutionImages && resolutionImages.length > 0 ? (
          <div className="space-y-2">
            <h5 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <ImageIcon className="size-3.5 text-emerald-600" aria-hidden="true" />
              <span>Resolution Proof Photograph</span>
            </h5>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {resolutionImages.map((img) => (
                <div
                  key={img.id}
                  className="rounded-xl overflow-hidden border border-emerald-500/30 bg-background shadow-2xs"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={img.imageUrl}
                    alt={`Resolution evidence photograph for report ${report.reference}`}
                    className="w-full h-48 object-cover"
                  />
                  <div className="p-2 text-[11px] text-muted-foreground bg-muted/30 border-t">
                    Recorded {formatReportDateTime(img.createdAt)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground italic">
            No physical photographs were uploaded with this resolution note.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
