import Link from "next/link";
import { SearchX, ArrowLeft, PlusCircle } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export default function ReportDetailsNotFound() {
  return (
    <div className="max-w-xl mx-auto py-12 px-4">
      <Card className="border-border shadow-xs">
        <CardContent className="flex flex-col items-center justify-center p-8 text-center space-y-4">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
            <SearchX className="size-7" aria-hidden="true" />
          </div>

          <div className="space-y-1.5">
            <h1 className="text-xl font-bold tracking-tight text-foreground">
              We Couldn&apos;t Find This Complaint
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
              The requested complaint report does not exist, was removed, or the provided tracking identifier is invalid.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2.5 pt-2">
            <Link
              href="/my-reports"
              className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-1.5 text-xs")}
            >
              <ArrowLeft className="size-3.5" aria-hidden="true" />
              <span>Browse My Complaints</span>
            </Link>

            <Link
              href="/report"
              className={cn(buttonVariants({ variant: "default", size: "sm" }), "gap-1.5 shadow-xs text-xs")}
            >
              <PlusCircle className="size-3.5" aria-hidden="true" />
              <span>Report a New Issue</span>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
