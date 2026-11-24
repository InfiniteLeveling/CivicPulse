import Link from "next/link";
import { ArrowLeft, Sparkles, ClipboardCheck } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function ReportFormHeader() {
  return (
    <div className="space-y-4">
      <PageHeader
        title="Report a Civic Issue"
        description="Describe the infrastructure issue in your community. Provide accurate details and location so municipal field crews can review, prioritize, and resolve it."
        badge={
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="border-primary/30 text-primary text-xs font-semibold">
              4-Step Reporting Wizard
            </Badge>
            <Badge variant="secondary" className="gap-1 text-xs">
              <Sparkles className="size-3 text-primary" aria-hidden="true" />
              <span>AI Assisted</span>
            </Badge>
          </div>
        }
        action={
          <Link
            href="/dashboard"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-2 text-xs font-medium")}
          >
            <ArrowLeft className="size-3.5" aria-hidden="true" />
            <span>Back to Dashboard</span>
          </Link>
        }
      />

      {/* Advisory card */}
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-xs text-foreground/90 space-y-2">
        <div className="flex items-center gap-2 font-semibold text-primary text-sm">
          <ClipboardCheck className="size-4 shrink-0" aria-hidden="true" />
          <span>Simple, Transparent Reporting</span>
        </div>
        <p className="text-muted-foreground leading-relaxed">
          Complete each step to submit your report: describe what happened, attach a clear photograph (with optional AI suggestions), confirm the map coordinates, and check for nearby existing complaints.
        </p>
      </div>
    </div>
  );
}
