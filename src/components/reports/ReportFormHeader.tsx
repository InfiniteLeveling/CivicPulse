import Link from "next/link";
import { ArrowLeft, Sparkles, ClipboardEdit } from "lucide-react";
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
              Step 1 of 4: Issue Details
            </Badge>
            <Badge variant="secondary" className="gap-1 text-xs">
              <Sparkles className="size-3 text-amber-500" aria-hidden="true" />
              <span>Phase 7 Active</span>
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
          In this phase, you specify the title, description, category, and visibility of the issue.
          In subsequent phases, photo verification (Phase 8) and GPS map placement (Phase 10) will be added to ensure fast, verified dispatch to municipal authorities.
        </p>
      </div>
    </div>
  );
}
