"use client";

import { useState } from "react";
import { Sliders, Save, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DepartmentSelector } from "./DepartmentSelector";
import { AdminMutationConfirmation } from "./AdminMutationConfirmation";
import { updateReportTriage } from "@/lib/api/admin-reports";
import { CATEGORY_LABELS } from "@/lib/constants";
import { ApiError } from "@/lib/api/client";
import type {
  ComplaintSummary,
  IssueCategory,
  IssueSeverity,
  ReportVisibility,
} from "@/types/domain";

interface AdminComplaintTriageFormProps {
  report: ComplaintSummary;
  version: number;
  onSuccess: (updated: ComplaintSummary, newVersion: number) => void;
  onVersionConflict: (message: string) => void;
}

export function AdminComplaintTriageForm({
  report,
  version,
  onSuccess,
  onVersionConflict,
}: AdminComplaintTriageFormProps) {
  const [category, setCategory] = useState<IssueCategory>(report.category);
  const [severity, setSeverity] = useState<IssueSeverity>(report.severity);
  const [departmentId, setDepartmentId] = useState<string | null>(
    report.department?.id ?? null
  );
  const [visibility, setVisibility] = useState<ReportVisibility>(report.visibility);
  const [remark, setRemark] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showVisibilityConfirm, setShowVisibilityConfirm] = useState(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  // Check if meaningful triage changes exist
  const hasChanges =
    category !== report.category ||
    severity !== report.severity ||
    departmentId !== (report.department?.id ?? null) ||
    visibility !== report.visibility ||
    remark.trim().length > 0;

  async function executeSave() {
    setIsSubmitting(true);
    setErrorBanner(null);

    try {
      const res = await updateReportTriage(report.id, {
        version,
        category,
        severity,
        departmentId,
        visibility,
        remark: remark.trim() || undefined,
      });

      toast.success("Complaint triage updated successfully.", {
        description: `Version bumped to v${res.version}.`,
      });

      setRemark("");
      onSuccess(res.report, res.version);
    } catch (err: unknown) {
      if (err instanceof ApiError && err.status === 409) {
        onVersionConflict(err.message);
      } else {
        const msg = err instanceof Error ? err.message : "Failed to save triage updates.";
        setErrorBanner(msg);
        toast.error("Triage update failed", { description: msg });
      }
    } finally {
      setIsSubmitting(false);
      setShowVisibilityConfirm(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // Privacy safeguard: If changing from private to public, require deliberate confirmation
    if (report.visibility === "private" && visibility === "public") {
      setShowVisibilityConfirm(true);
      return;
    }

    executeSave();
  }

  return (
    <>
      <Card className="border-border shadow-xs">
        <CardHeader className="pb-3 border-b border-border/60">
          <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Sliders className="size-4 text-primary" aria-hidden="true" />
            <span>Administrative Triage</span>
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

            {/* Category */}
            <div className="space-y-1.5">
              <label htmlFor="triage-category" className="text-xs font-semibold text-foreground">
                Issue Category
              </label>
              <select
                id="triage-category"
                value={category}
                onChange={(e) => setCategory(e.target.value as IssueCategory)}
                disabled={isSubmitting}
                className="w-full text-xs rounded-lg border border-border bg-background px-3 py-2 text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/40 disabled:opacity-50 transition-colors"
              >
                {Object.entries(CATEGORY_LABELS).map(([catKey, label]) => (
                  <option key={catKey} value={catKey}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            {/* Severity */}
            <div className="space-y-1.5">
              <label htmlFor="triage-severity" className="text-xs font-semibold text-foreground">
                Severity Assessment
              </label>
              <select
                id="triage-severity"
                value={severity}
                onChange={(e) => setSeverity(e.target.value as IssueSeverity)}
                disabled={isSubmitting}
                className="w-full text-xs rounded-lg border border-border bg-background px-3 py-2 text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/40 disabled:opacity-50 transition-colors"
              >
                <option value="low">Low (15 priority pts)</option>
                <option value="medium">Medium (30 priority pts)</option>
                <option value="high">High (50 priority pts)</option>
                <option value="critical">Critical (70 priority pts - Urgent)</option>
              </select>
            </div>

            {/* Department */}
            <DepartmentSelector
              value={departmentId}
              category={category}
              onChange={setDepartmentId}
              disabled={isSubmitting}
            />

            {/* Visibility */}
            <div className="space-y-1.5">
              <label htmlFor="triage-visibility" className="text-xs font-semibold text-foreground">
                Visibility Setting
              </label>
              <select
                id="triage-visibility"
                value={visibility}
                onChange={(e) => setVisibility(e.target.value as ReportVisibility)}
                disabled={isSubmitting}
                className="w-full text-xs rounded-lg border border-border bg-background px-3 py-2 text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/40 disabled:opacity-50 transition-colors"
              >
                <option value="public">Public (Visible on Live Civic Map)</option>
                <option value="private">Private (Restricted to Reporter & Staff)</option>
              </select>
            </div>

            {/* Remark */}
            <div className="space-y-1.5">
              <label htmlFor="triage-remark" className="text-xs font-semibold text-foreground">
                Triage Notes & Remarks <span className="font-normal text-muted-foreground">(Optional)</span>
              </label>
              <textarea
                id="triage-remark"
                value={remark}
                onChange={(e) => setRemark(e.target.value)}
                placeholder="Reason for reassignment, category reclassification, or severity revision..."
                rows={3}
                maxLength={1000}
                disabled={isSubmitting}
                className="w-full text-xs rounded-lg border border-border bg-background p-2.5 text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/40 disabled:opacity-50 transition-colors resize-none"
              />
            </div>

            {/* Submit */}
            <Button
              type="submit"
              disabled={isSubmitting || !hasChanges}
              className="w-full text-xs gap-1.5 shadow-xs"
            >
              <Save className="size-3.5" aria-hidden="true" />
              <span>{isSubmitting ? "Saving Triage..." : "Save Triage Changes"}</span>
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Confirmation modal for changing private -> public */}
      <AdminMutationConfirmation
        open={showVisibilityConfirm}
        type="publish_private"
        onConfirm={executeSave}
        onCancel={() => setShowVisibilityConfirm(false)}
        isSubmitting={isSubmitting}
      />
    </>
  );
}
