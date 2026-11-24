import Link from "next/link";
import { AlertOctagon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface AdminUrgentIssuesCardProps {
  urgentCount?: number;
}

export function AdminUrgentIssuesCard({ urgentCount }: AdminUrgentIssuesCardProps) {
  const isAvailable = urgentCount !== undefined;

  return (
    <Card className="border-border shadow-xs border-l-4 border-l-destructive">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-destructive uppercase tracking-wider flex items-center gap-1.5">
            <AlertOctagon className="size-3.5" aria-hidden="true" />
            <span>Priority Attention</span>
          </span>
          <Badge
            variant="outline"
            className={
              isAvailable
                ? "border-destructive/30 bg-destructive/10 text-destructive text-[10px]"
                : "border-muted text-muted-foreground text-[10px]"
            }
          >
            {isAvailable ? "Server Authoritative" : "Metric Unavailable"}
          </Badge>
        </div>
        <CardTitle className="text-base font-semibold text-foreground pt-1">
          Urgent Issues
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-baseline gap-3">
          <span className="text-3xl font-bold tracking-tight text-destructive tabular-nums">
            {isAvailable ? urgentCount : "—"}
          </span>
          <span className="text-xs text-muted-foreground">
            {isAvailable
              ? urgentCount === 1
                ? "active case requiring immediate response"
                : "active cases requiring immediate response"
              : "Backend urgent count not exposed"}
          </span>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Complaints classified as critical severity or weighted priority score ≥ 70.
          Filter urgent cases directly in the{" "}
          <Link href="/admin/complaints?urgent=true" className="text-primary font-medium hover:underline">
            priority triage queue
          </Link>.
        </p>
      </CardContent>
    </Card>
  );
}
