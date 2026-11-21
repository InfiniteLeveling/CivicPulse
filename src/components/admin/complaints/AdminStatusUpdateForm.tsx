"use client";

import { useState } from "react";
import { CheckCircle2, Clock, LoaderCircle, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ResolutionEvidenceUpload } from "./ResolutionEvidenceUpload";
import { AdminMutationConfirmation } from "./AdminMutationConfirmation";
import { updateReportStatus } from "@/lib/api/admin-reports";
import { getAllowedNextStatuses } from "@/lib/validation/admin-status";
import { ApiError } from "@/lib/api/client";
import type { ComplaintSummary, ReportStatus } from "@/types/domain";

interface AdminStatusUpdateFormProps {
  report: ComplaintSummary;
  version: number;
  onSuccess: (updated: ComplaintSummary, newVersion: number) => void;
  onVersionConflict: (message: string) => void;
}

export function AdminStatusUpdateForm({
  report,
  version,
  onSuccess,
  onVersionConflict,
}: AdminStatusUpdateFormProps) {
  const allowedNextStatuses = getAllowedNextStatuses(report.status);
  const [targetStatus, setTargetStatus] = useState<ReportStatus>(
    allowedNextStatuses[0] ?? report.status
  );
  const [remark, setRemark] = useState("");
  const [resolutionImageId, setResolutionImageId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showResolvedConfirm, setShowResolvedConfirm] = useState(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  if (report.status === "resolved") {
    return (
      <Card className="border-border shadow-xs">
        <CardHeader className="pb-3 border-b border-border/60">
          <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
            <CheckCircle2 className="size-4 text-emerald-600" aria-hidden="true" />
            <span>Resolution Completed</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4 text-xs text-muted-foreground space-y-2">
          <p>
            This civic complaint has been verified and marked as <strong>Resolved</strong>. The case is closed in the municipal ledger.
          </p>
          <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900 text-emerald-800 dark:text-emerald-300">
            Resolution timestamps and uploaded evidence photographs are permanently recorded in the official audit history.
          </div>
        </CardContent>
      </Card>
    );
  }

  async function executeStatusUpdate() {
    setIsSubmitting(true);
    setErrorBanner(null);

    try {
      const res = await updateReportStatus(report.id, {
        version,
        status: targetStatus,
        remark: remark.trim() || undefined,
        resolutionImageId: targetStatus === "resolved" ? resolutionImageId : undefined,
      });

      toast.success("Complaint status updated successfully.", {
        description: `Status changed to "${res.report.status}".`,
      });

      setRemark("");
      setResolutionImageId(null);
      onSuccess(res.report, res.version);
    } catch (err: unknown) {
      if (err instanceof ApiError && err.status === 409) {
        onVersionConflict(err.message);
      } else {
        const msg = err instanceof Error ? err.message : "Failed to update complaint status.";
        setErrorBanner(msg);
        toast.error("Status transition failed", { description: msg });
      }
    } finally {
      setIsSubmitting(false);
      setShowResolvedConfirm(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (targetStatus === "resolved") {
      setShowResolvedConfirm(true);
      return;
    }

    executeStatusUpdate();
  }

  return (
    <>
      <Card className="border-border shadow-xs">
        <CardHeader className="pb-3 border-b border-border/60">
          <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Clock className="size-4 text-primary" aria-hidden="true" />
            <span>Status Transition</span>
          </CardTitle>
        </CardHeader>

        <CardContent className="pt-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            {errorBanner && (
              <div
                role="alert"
                className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-start gap-2"
              >
                <AlertCircle className="size-4 shrink-0 mt-0.5" aria-hidden="true" />
                <span>{errorBanner}</span>
              </div>
            )}

            {/* Target Status Selection */}
            <div className="space-y-1.5">
              <label htmlFor="target-status-select" className="text-xs font-semibold text-foreground">
                Target Status
              </label>
              <select
                id="target-status-select"
                value={targetStatus}
                onChange={(e) => setTargetStatus(e.target.value as ReportStatus)}
                disabled={isSubmitting || allowedNextStatuses.length === 0}
                className="w-full text-xs rounded-lg border border-border bg-background px-3 py-2 text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/40 disabled:opacity-50 transition-colors"
              >
                {allowedNextStatuses.map((st) => (
                  <option key={st} value={st}>
                    {st === "in_progress"
                      ? "In Progress (Work Assigned & Underway)"
                      : st === "resolved"
                      ? "Resolved (Completed & Verified)"
                      : st}
                  </option>
                ))}
              </select>
            </div>

            {/* Resolution Photo Upload (when target is resolved) */}
            {targetStatus === "resolved" && (
              <div className="pt-1 border-t border-border/60">
                <ResolutionEvidenceUpload
                  onUploaded={setResolutionImageId}
                  onCleared={() => setResolutionImageId(null)}
                  disabled={isSubmitting}
                />
              </div>
            )}

            {/* Remark */}
            <div className="space-y-1.5">
              <label htmlFor="status-remark" className="text-xs font-semibold text-foreground">
                Status Update Remark <span className="font-normal text-muted-foreground">(Optional)</span>
              </label>
              <textarea
                id="status-remark"
                value={remark}
                onChange={(e) => setRemark(e.target.value)}
                placeholder={
                  targetStatus === "resolved"
                    ? "Summary of completed repairs, department team sign-off, or inspection notes..."
                    : "Notes on active work progress, crew deployment, or materials arrival..."
                }
                rows={3}
                maxLength={1000}
                disabled={isSubmitting}
                className="w-full text-xs rounded-lg border border-border bg-background p-2.5 text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/40 disabled:opacity-50 transition-colors resize-none"
              />
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={isSubmitting || targetStatus === report.status}
              className="w-full text-xs gap-1.5 shadow-xs"
            >
              {isSubmitting ? (
                <>
                  <LoaderCircle className="size-3.5 animate-spin" aria-hidden="true" />
                  <span>Updating Status...</span>
                </>
              ) : targetStatus === "resolved" ? (
                <>
                  <CheckCircle2 className="size-3.5" aria-hidden="true" />
                  <span>Mark Complaint as Resolved</span>
                </>
              ) : (
                <>
                  <LoaderCircle className="size-3.5" aria-hidden="true" />
                  <span>Start Progress</span>
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Confirmation modal for marking resolved */}
      <AdminMutationConfirmation
        open={showResolvedConfirm}
        type="mark_resolved"
        onConfirm={executeStatusUpdate}
        onCancel={() => setShowResolvedConfirm(false)}
        isSubmitting={isSubmitting}
      />
    </>
  );
}
