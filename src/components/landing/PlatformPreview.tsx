import { PublicLink } from "@/components/layout/PublicLink";
import { ArrowRight, Building2, MapPin, Plus, UserRound } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { StatusBadge } from "@/components/common/StatusBadge";
import { PriorityBadge } from "@/components/common/PriorityBadge";
import type { ComplaintSummary } from "@/types/domain";

interface PlatformPreviewProps {
  reports?: ComplaintSummary[];
}

export function PlatformPreview({ reports = [] }: PlatformPreviewProps) {
  const recent = reports.slice(0, 2);
  const counts = [
    ["Total public issues", reports.length],
    ["Pending", reports.filter((r) => r.status === "pending").length],
    ["Resolved", reports.filter((r) => r.status === "resolved").length],
  ] as const;

  const prioritized = [...reports]
    .sort((a, b) => (b.priority?.score ?? 0) - (a.priority?.score ?? 0))
    .slice(0, 2);

  return (
    <section className="content-container section-space" aria-labelledby="preview-title">
      <h2 id="preview-title">Inside the platform</h2>
      <p id="account-access" tabIndex={-1} className="section-description">
        Dedicated citizen reporting and municipal triage workspaces powered by live community reports.
      </p>
      <div className="mt-6 grid items-stretch gap-5 md:grid-cols-2">
        <Card id="report-preview" tabIndex={-1} className="gap-0 border py-0">
          <CardHeader className="flex items-center gap-2 border-b bg-primary-light py-4 text-primary-hover">
            <UserRound aria-hidden="true" size={19} /><h3 className="text-base">Citizen portal</h3>
            <span className="ml-auto rounded-full bg-background/80 px-2.5 py-0.5 text-[11px] font-medium text-primary">
              Live Portal
            </span>
          </CardHeader>
          <CardContent className="grid gap-4 py-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h4>Community feed</h4>
              <PublicLink className="preview-link" href="/report" aria-label="Report New Issue">
                <Plus aria-hidden="true" size={15} />Report New Issue
              </PublicLink>
            </div>
            <p className="font-semibold">
              Public reports{" "}
              <span className="font-normal text-muted-foreground">
                · {recent.length} {recent.length === 1 ? "recent issue" : "recent issues"}
              </span>
            </p>
            {recent.length > 0 ? (
              <ul className="divide-y border-t">
                {recent.map((report) => (
                  <li key={report.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                    <div>
                      <p className="font-medium">{report.title}</p>
                      <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin aria-hidden="true" size={12} />
                        {report.latitude.toFixed(4)}, {report.longitude.toFixed(4)}
                      </p>
                    </div>
                    <StatusBadge status={report.status} />
                  </li>
                ))}
              </ul>
            ) : (
              <div className="border-t py-6 text-center text-sm text-muted-foreground">
                No public civic reports filed yet. Sign in to submit the first report in your area.
              </div>
            )}
          </CardContent>
        </Card>
        <Card className="gap-0 border py-0">
          <CardHeader className="flex items-center gap-2 bg-foreground py-4 text-white">
            <Building2 aria-hidden="true" size={19} /><h3 className="text-base">Authority portal</h3>
            <span className="ml-auto rounded-full border border-white/30 px-2.5 py-0.5 text-[11px] font-medium text-white">
              Municipal Queue
            </span>
          </CardHeader>
          <CardContent className="grid gap-4 py-5">
            <dl className="grid grid-cols-3 divide-x rounded-md border bg-background py-3 text-center">
              {counts.map(([label, value]) => (
                <div key={label}>
                  <dt className="text-xs text-muted-foreground">{label}</dt>
                  <dd className="text-2xl font-semibold tabular-nums">{value}</dd>
                </div>
              ))}
            </dl>
            <h4 className="text-base">Priority queue</h4>
            {prioritized.length > 0 ? (
              <ol className="divide-y border-t">
                {prioritized.map((report) => (
                  <li key={report.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                    <div>
                      <p className="font-medium">{report.title}</p>
                      <p className="flex items-center gap-1 text-xs text-muted-foreground">
                        <ArrowRight aria-hidden="true" size={12} />
                        {report.department?.name ?? "Auto-routing"}
                      </p>
                    </div>
                    <PriorityBadge
                      score={report.priority?.score ?? 0}
                      urgent={Boolean(report.priority?.urgent)}
                    />
                  </li>
                ))}
              </ol>
            ) : (
              <div className="border-t py-6 text-center text-sm text-muted-foreground">
                Submitted complaints are scored automatically by severity, community support, and age.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
