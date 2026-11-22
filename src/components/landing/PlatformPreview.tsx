import { PublicLink } from "@/components/layout/PublicLink";
import { ArrowRight, Building2, MapPin, Plus, UserRound } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { StatusBadge } from "@/components/common/StatusBadge";
import { PriorityBadge } from "@/components/common/PriorityBadge";
import { demoReports } from "./demo-reports";

export function PlatformPreview() {
  const [road, lamp] = demoReports;
  const counts = [
    ["Total issues", demoReports.length],
    ["Pending", demoReports.filter((report) => report.status === "pending").length],
    ["Resolved", demoReports.filter((report) => report.status === "resolved").length],
  ];

  return (
    <section className="content-container section-space" aria-labelledby="preview-title">
      <h2 id="preview-title">Inside the platform</h2>
      <p id="account-access" tabIndex={-1} className="section-description">Sign-in and report submission are coming in later phases. Explore both portals here without an account.</p>
      <div className="mt-6 grid items-stretch gap-5 md:grid-cols-2">
        <Card id="report-preview" tabIndex={-1} className="gap-0 border py-0">
          <CardHeader className="flex items-center gap-2 border-b bg-primary-light py-4 text-primary-hover">
            <UserRound aria-hidden="true" size={19} /><h3 className="text-base">Citizen portal</h3>
            <span className="demo-stamp ml-auto">Demo preview</span>
          </CardHeader>
          <CardContent className="grid gap-4 py-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h4>Welcome, resident</h4>
              <PublicLink className="preview-link" href="/#how-it-works" aria-label="Report New Issue – preview the reporting steps">
                <Plus aria-hidden="true" size={15} />Report New Issue
              </PublicLink>
            </div>
            <p className="font-semibold">My complaints <span className="font-normal text-muted-foreground">· 2 recent issues</span></p>
            <ul className="divide-y border-t">
              {[road, lamp].map((report) => <li key={report.reference} className="flex flex-wrap items-center justify-between gap-2 py-3">
                <div><p className="font-medium">{report.title}</p>
                  <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground"><MapPin aria-hidden="true" size={12} />{report.location}</p></div>
                <StatusBadge status={report.status} />
              </li>)}
            </ul>
          </CardContent>
        </Card>
        <Card className="gap-0 border py-0">
          <CardHeader className="flex items-center gap-2 bg-foreground py-4 text-white">
            <Building2 aria-hidden="true" size={19} /><h3 className="text-base">Authority portal</h3>
            <span className="demo-stamp ml-auto border border-white/40">Demo preview</span>
          </CardHeader>
          <CardContent className="grid gap-4 py-5">
            <dl className="grid grid-cols-3 divide-x rounded-md border bg-background py-3 text-center">
              {counts.map(([label, value]) => <div key={label}><dt className="text-xs text-muted-foreground">{label}</dt>
                <dd className="text-2xl font-semibold tabular-nums">{value}</dd></div>)}
            </dl>
            <h4 className="text-base">Priority queue</h4>
            <ol className="divide-y border-t">
              {[{ report: road, score: 74, urgent: true }, { report: lamp, score: 46, urgent: false }].map(({ report, score, urgent }) => (
                <li key={report.reference} className="flex flex-wrap items-center justify-between gap-2 py-2">
                  <div><p className="font-medium">{report.title}</p>
                    <p className="flex items-center gap-1 text-xs text-muted-foreground"><ArrowRight aria-hidden="true" size={12} />{report.department}</p></div>
                  <PriorityBadge score={score} urgent={urgent} />
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
