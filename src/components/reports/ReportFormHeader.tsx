import Link from "next/link";
import { ArrowLeft, Sparkles, ShieldCheck, CheckCircle2 } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function ReportFormHeader() {
  return (
    <div className="space-y-4">
      <PageHeader
        title="Report a Civic Issue"
        description="Tell us about the problem in your community. Follow the four simple steps to record your issue and track its resolution."
        badge={
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="border-primary/30 text-primary text-xs font-semibold">
              <Sparkles className="size-3 text-primary mr-1" aria-hidden="true" />
              AI-Assisted Reporting
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
          <CheckCircle2 className="size-4 shrink-0" aria-hidden="true" />
          <span>Quick 4-Step Resolution Journey</span>
        </div>
        <p className="text-muted-foreground leading-relaxed">
          1. Issue Details → 2. Add an optional Photo (AI will help describe it) → 3. Confirm Map Location → 4. Check Nearby Reports & Submit.
        </p>
      </div>
    </div>
  );
}
