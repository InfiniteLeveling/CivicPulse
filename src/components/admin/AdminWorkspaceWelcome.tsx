import Link from "next/link";
import {
  ShieldCheck,
  CheckCircle2,
  Clock,
  MapPin,
  Globe,
  ClipboardList,
  Layers,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { AdminUserSummary } from "@/types/domain";

interface AdminWorkspaceWelcomeProps {
  user: AdminUserSummary;
}

export function AdminWorkspaceWelcome({ user }: AdminWorkspaceWelcomeProps) {
  return (
    <div className="space-y-6">
      {/* Verified Status Banner */}
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xs">
        <div className="flex items-start sm:items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shrink-0 shadow-xs">
            <ShieldCheck className="size-5" aria-hidden="true" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-sm sm:text-base font-semibold text-foreground">
                Administrator Access Verified
              </h2>
              <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-xs gap-1">
                <CheckCircle2 className="size-3" aria-hidden="true" />
                <span>Authorized</span>
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Signed in as <strong>{user.name}</strong> ({user.email}). Official municipal management console active.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Link href="/map">
            <Button variant="outline" size="sm" className="text-xs gap-1.5">
              <MapPin className="size-3.5 text-primary" aria-hidden="true" />
              <span>Live Civic Map</span>
            </Button>
          </Link>
          <Link href="/">
            <Button variant="ghost" size="sm" className="text-xs gap-1.5">
              <Globe className="size-3.5" aria-hidden="true" />
              <span>Public Site</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Roadmap & Capabilities Grid */}
      <div className="space-y-3">
        <div>
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Layers className="size-4 text-primary" aria-hidden="true" />
            <span>Administrative Portal Capabilities</span>
          </h2>
          <p className="text-xs text-muted-foreground">
            Manage municipal complaint queues, triage workflows, and city-wide performance analytics.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Card className="border-border shadow-xs border-l-4 border-l-emerald-500">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30">
                  Security · Active
                </Badge>
                <CheckCircle2 className="size-4 text-emerald-600" aria-hidden="true" />
              </div>
              <CardTitle className="text-sm font-semibold text-foreground pt-1">
                Role-Verified Operations Shell
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Server-side authority verification, municipal navigation bar, and account controls.
              </p>
            </CardContent>
          </Card>

          <Card className="border-border shadow-xs border-l-4 border-l-primary">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/30">
                  Overview · Active
                </Badge>
                <Clock className="size-4 text-primary" aria-hidden="true" />
              </div>
              <CardTitle className="text-sm font-semibold text-foreground pt-1">
                Live Operational Metrics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Authoritative operational metrics, caseload breakdown, SLA tracking, and department workload distribution.
              </p>
            </CardContent>
          </Card>

          <Card className="border-border shadow-xs border-l-4 border-l-amber-500">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30">
                  Triage · Active
                </Badge>
                <ClipboardList className="size-4 text-amber-600" aria-hidden="true" />
              </div>
              <CardTitle className="text-sm font-semibold text-foreground pt-1">
                Priority Queue &amp; Triage
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Multi-attribute triage queue, weighted priority scoring, severity verification, and department routing.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

