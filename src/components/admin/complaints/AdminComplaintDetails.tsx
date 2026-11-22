"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { AlertOctagon, Flame } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AdminComplaintHeader } from "./AdminComplaintHeader";
import { AdminComplaintOverview } from "./AdminComplaintOverview";
import { AdminComplaintTriageForm } from "./AdminComplaintTriageForm";
import { AdminStatusUpdateForm } from "./AdminStatusUpdateForm";
import { AdminVersionConflictDialog } from "./AdminVersionConflictDialog";
import { ReportImageGallery } from "@/components/reports/ReportImageGallery";
import { ReportLocationPreview } from "@/components/reports/ReportLocationPreview";
import { ReportStatusTimeline } from "@/components/reports/ReportStatusTimeline";
import { ReportResolutionEvidence } from "@/components/reports/ReportResolutionEvidence";
import { getAdminReportDetails } from "@/lib/api/admin-reports";
import type { ComplaintDetails, ComplaintSummary } from "@/types/domain";

interface AdminComplaintDetailsProps {
  initialDetails: ComplaintDetails;
}

export function AdminComplaintDetails({ initialDetails }: AdminComplaintDetailsProps) {
  const [details, setDetails] = useState<ComplaintDetails>(initialDetails);
  const [version, setVersion] = useState<number>(initialDetails.version || 1);
  const [isRefreshing, startRefresh] = useTransition();
  const [conflictMessage, setConflictMessage] = useState<string | null>(null);

  const { report, history } = details;

  const isUrgent =
    report.priority.urgent ||
    report.severity === "critical" ||
    report.priority.score >= 70;

  function handleTriageSuccess(updatedReport: ComplaintSummary, newVersion: number) {
    setVersion(newVersion);
    setDetails((prev) => ({
      ...prev,
      report: updatedReport,
      version: newVersion,
    }));
    // Re-fetch full details to sync history timeline
    refreshDetails(false);
  }

  function handleStatusSuccess(updatedReport: ComplaintSummary, newVersion: number) {
    setVersion(newVersion);
    setDetails((prev) => ({
      ...prev,
      report: updatedReport,
      version: newVersion,
    }));
    // Re-fetch full details to sync history timeline and resolution evidence
    refreshDetails(false);
  }

  function refreshDetails(showToast = true) {
    startRefresh(async () => {
      try {
        const refreshed = await getAdminReportDetails(report.id);
        setDetails(refreshed);
        setVersion(refreshed.version);
        setConflictMessage(null);
        if (showToast) {
          toast.info("Complaint record refreshed from server.");
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Could not refresh complaint record.";
        toast.error("Refresh failed", { description: msg });
      }
    });
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto w-full pb-16">
      {/* Header */}
      <AdminComplaintHeader
        report={report}
        version={version}
        onRefresh={() => refreshDetails(true)}
        isRefreshing={isRefreshing}
      />

      {/* Main Grid: 2 columns on desktop, 1 column on mobile */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (Main Information, Photo, Map, History) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Overview */}
          <AdminComplaintOverview report={report} />

          {/* Issue Photograph */}
          <div className="space-y-2">
            <h2 className="text-sm font-semibold text-foreground px-1">
              Submitted Issue Photograph
            </h2>
            <ReportImageGallery imageUrl={report.imageUrl} reference={report.reference} />
          </div>

          {/* Location Preview */}
          <ReportLocationPreview
            latitude={report.latitude}
            longitude={report.longitude}
            title={report.title}
          />

          {/* Status Timeline */}
          <ReportStatusTimeline history={history} />

          {/* Resolution Evidence (when resolved) */}
          {report.status === "resolved" && (
            <ReportResolutionEvidence details={details} />
          )}
        </div>

        {/* Right Column (Actions, Triage, Status) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Priority & Urgency Scorecard */}
          <Card className={`border shadow-xs ${isUrgent ? "border-rose-200 bg-rose-50/30 dark:border-rose-900/50 dark:bg-rose-950/10" : "border-border"}`}>
            <CardHeader className="pb-3 border-b border-border/60">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Flame className={`size-4 ${isUrgent ? "text-rose-600" : "text-primary"}`} aria-hidden="true" />
                  <span>Prioritization Assessment</span>
                </CardTitle>
                {isUrgent ? (
                  <Badge variant="destructive" className="text-[10px] gap-1">
                    <AlertOctagon className="size-3" aria-hidden="true" />
                    <span>Urgent Attention</span>
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-[10px]">
                    Standard Queue
                  </Badge>
                )}
              </div>
            </CardHeader>

            <CardContent className="pt-3 space-y-3 text-xs">
              <div className="flex items-baseline justify-between bg-background p-3 rounded-lg border border-border/60">
                <span className="font-medium text-muted-foreground">Weighted Priority Score:</span>
                <div className="flex items-baseline gap-1">
                  <span className="font-mono text-2xl font-bold text-foreground">
                    {report.priority.score}
                  </span>
                  <span className="text-muted-foreground">/ 100</span>
                </div>
              </div>

              {/* Point Breakdown */}
              <div className="space-y-1.5 text-muted-foreground">
                <div className="flex justify-between">
                  <span>Severity Contribution:</span>
                  <span className="font-mono font-medium text-foreground">
                    +{report.priority.severityPoints} pts
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Community Support Bonus:</span>
                  <span className="font-mono font-medium text-foreground">
                    +{report.priority.supportPoints} pts ({report.supportCount} votes)
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Open Age Factor:</span>
                  <span className="font-mono font-medium text-foreground">
                    +{report.priority.agePoints} pts
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Triage Form */}
          <AdminComplaintTriageForm
            report={report}
            version={version}
            onSuccess={handleTriageSuccess}
            onVersionConflict={(msg) => setConflictMessage(msg)}
          />

          {/* Status Update Form */}
          <AdminStatusUpdateForm
            report={report}
            version={version}
            onSuccess={handleStatusSuccess}
            onVersionConflict={(msg) => setConflictMessage(msg)}
          />
        </div>
      </div>

      {/* Version Conflict Modal */}
      <AdminVersionConflictDialog
        open={!!conflictMessage}
        message={conflictMessage || undefined}
        onReload={() => refreshDetails(true)}
        onKeepEditing={() => setConflictMessage(null)}
      />
    </div>
  );
}
