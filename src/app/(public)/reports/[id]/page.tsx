import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { ShieldAlert, ArrowLeft } from "lucide-react";
import { getReport } from "@/lib/api/reports";
import { ApiError } from "@/lib/api/client";
import { ReportDetailsView } from "@/components/reports/ReportDetailsView";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;

  try {
    const details = await getReport(id);
    return {
      title: `${details.report.title} (${details.report.reference}) | CivicPulse`,
      description: details.report.description.slice(0, 160),
    };
  } catch {
    return {
      title: "Complaint Details | CivicPulse",
      description: "View verified civic infrastructure complaint details and status timeline.",
    };
  }
}

export default async function ReportDetailsPage({ params }: PageProps) {
  const { id } = await params;

  let details;
  let isForbidden = false;

  try {
    details = await getReport(id);
  } catch (err: unknown) {
    if (err instanceof ApiError && err.status === 404) {
      notFound();
    }

    if (err instanceof ApiError && err.status === 403) {
      isForbidden = true;
    } else {
      throw err;
    }
  }

  if (isForbidden || !details) {
    return (
      <div className="max-w-xl mx-auto py-12 px-4">
        <Card className="border-destructive/30 bg-destructive/5 shadow-xs">
          <CardContent className="flex flex-col items-center justify-center p-8 text-center space-y-4">
            <div className="flex size-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive border border-destructive/20">
              <ShieldAlert className="size-7" aria-hidden="true" />
            </div>

            <div className="space-y-1.5">
              <h1 className="text-xl font-bold tracking-tight text-foreground">
                Access Denied
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
                You don&apos;t have permission to view this complaint. This issue is marked private and is only accessible by the reporter and authorized municipal staff.
              </p>
            </div>

            <div className="pt-2">
              <Link
                href="/my-reports"
                className={cn(buttonVariants({ variant: "default", size: "sm" }), "gap-2 shadow-xs text-xs")}
              >
                <ArrowLeft className="size-3.5" aria-hidden="true" />
                <span>Return to My Complaints</span>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="py-2 sm:py-4">
      <ReportDetailsView initialDetails={details} />
    </div>
  );
}
