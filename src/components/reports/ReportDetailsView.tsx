"use client";

import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { RefreshCw, Shield } from "lucide-react";
import type { ComplaintDetails } from "@/types/domain";
import { supportReport, getReport } from "@/lib/api/reports";
import { isSupabaseConfigured, createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ReportDetailsHeader } from "./ReportDetailsHeader";
import { ReportDetailsOverview } from "./ReportDetailsOverview";
import { ReportImageGallery } from "./ReportImageGallery";
import { ReportLocationPreview } from "./ReportLocationPreview";
import { ReportStatusTimeline } from "./ReportStatusTimeline";
import { ReportResolutionEvidence } from "./ReportResolutionEvidence";
import { ReportSupportCard } from "./ReportSupportCard";

interface ReportDetailsViewProps {
  initialDetails: ComplaintDetails;
  backHref?: string;
  backLabel?: string;
}

export function ReportDetailsView({
  initialDetails,
  backHref,
  backLabel,
}: ReportDetailsViewProps) {
  const [details, setDetails] = useState<ComplaintDetails>(initialDetails);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(true); // default true for demo environment
  const [isRefreshing, startRefresh] = useTransition();

  // Check client-side authentication status
  useEffect(() => {
    if (!isSupabaseConfigured()) {
      return;
    }

    try {
      const supabase = createClient();
      supabase.auth.getSession().then(({ data: { session } }) => {
        setIsAuthenticated(!!session?.user);
      });
    } catch {
      // Preserve default
    }
  }, []);

  const handleSupport = async () => {
    const res = await supportReport(details.report.id);

    setDetails((prev) => ({
      ...prev,
      report: {
        ...prev.report,
        supportCount: res.supportCount,
        viewerHasSupported: res.viewerHasSupported,
        ...(res.priority ? { priority: res.priority } : {}),
      },
    }));

    toast.success("Your support has been recorded.", {
      description: "Thank you for helping prioritize community infrastructure issues.",
    });
  };

  const handleRefresh = () => {
    startRefresh(async () => {
      try {
        const refreshed = await getReport(details.report.id);
        setDetails(refreshed);
        toast.info("Report details refreshed.");
      } catch {
        toast.error("Could not refresh report details.");
      }
    });
  };

  const { report, history } = details;

  return (
    <div className="space-y-6 max-w-6xl mx-auto w-full pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="flex-1 min-w-0">
          <ReportDetailsHeader
            report={report}
            backHref={backHref}
            backLabel={backLabel}
          />
        </div>

        <div className="shrink-0 pt-6 sm:pt-9">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
            title="Refresh complaint status from server"
          >
            <RefreshCw
              className={`size-3.5 ${isRefreshing ? "animate-spin" : ""}`}
              aria-hidden="true"
            />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {/* Main Grid: Left content (65%) & Right sidebar (35%) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left / Main Content Column */}
        <div className="lg:col-span-8 space-y-6 min-w-0">
          {/* Main Issue Photograph */}
          <ReportImageGallery
            imageUrl={report.imageUrl}
            reference={report.reference}
          />

          {/* Issue Overview & Full Description */}
          <ReportDetailsOverview report={report} />

          {/* Location Preview */}
          <ReportLocationPreview
            latitude={report.latitude}
            longitude={report.longitude}
            title={report.title}
          />

          {/* Status Lifecycle Timeline */}
          <ReportStatusTimeline history={history} />

          {/* Resolution Evidence (when resolved) */}
          <ReportResolutionEvidence details={details} />
        </div>

        {/* Right / Secondary Sidebar Column */}
        <div className="lg:col-span-4 space-y-5 lg:sticky lg:top-6">
          {/* Community Support Widget */}
          <ReportSupportCard
            report={report}
            isAuthenticated={isAuthenticated}
            onSupport={handleSupport}
          />

          {/* Authority and Safety Note */}
          <Card className="border-border/80 bg-muted/20 shadow-xs">
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                <Shield className="size-4 text-primary" aria-hidden="true" />
                <span>Verified Civic Process</span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Status transitions are authorized by municipal engineers and field supervisors. Community endorsements boost municipal urgency points without duplicate filings.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
