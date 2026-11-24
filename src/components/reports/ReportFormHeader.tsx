import Link from "next/link";
import { ArrowLeft, ShieldCheck, ClipboardEdit } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function ReportFormHeader() {
  return (
    <div className="space-y-4">
      <PageHeader
        title="Report a Civic Issue"
        description="Tell us about the problem in your community. Add accurate details so it can be reviewed and resolved efficiently."
        badge={
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="border-primary/30 text-primary text-xs font-medium">
              Guided Issue Intake
            </Badge>
            <Badge variant="secondary" className="gap-1 text-xs">
              <ShieldCheck className="size-3 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
              <span>Verified Reporting</span>
            </Badge>
          </div>
        }
        action={
          <Link
            href="/dashboard"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-2 text-xs")}
          >
            <ArrowLeft className="size-3.5" aria-hidden="true" />
            <span>Back to Dashboard</span>
          </Link>
        }
      />

      {/* Process advisory card */}
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-xs text-foreground/90 space-y-2">
        <div className="flex items-center gap-2 font-semibold text-primary text-sm">
          <ClipboardEdit className="size-4 shrink-0" aria-hidden="true" />
          <span>How Reporting Works in CivicPulse</span>
        </div>
        <p className="text-muted-foreground leading-relaxed">
          Enter the issue title, description, category, and visibility, then attach a clear photo and pinpoint the exact map location so municipal teams can review and resolve it quickly.
        </p>
      </div>
    </div>
  );
}
