import Link from "next/link";
import { PlusCircle, ClipboardList, MapPin, ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const quickActions = [
  {
    title: "Report an Issue",
    description: "Submit a new infrastructure problem with AI-assisted categorization and photo verification.",
    href: "/report",
    icon: PlusCircle,
    badge: "Submit",
    cta: "Start Report",
    highlight: true,
  },
  {
    title: "My Complaints",
    description: "Review detailed status history, departmental responses, and timeline updates on all your reports.",
    href: "/my-reports",
    icon: ClipboardList,
    badge: "Track",
    cta: "View Complaints",
    highlight: false,
  },
  {
    title: "Explore Civic Map",
    description: "View community complaints on an interactive neighborhood map and support existing issues.",
    href: "/map",
    icon: MapPin,
    badge: "Map",
    cta: "Open Map",
    highlight: false,
  },
] as const;

export function DashboardQuickActions() {
  return (
    <section aria-label="Quick Actions" className="space-y-3">
      <h2 className="text-lg font-semibold tracking-tight text-foreground">
        Quick Actions
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {quickActions.map((action) => {
          const Icon = action.icon;
          return (
            <Card
              key={action.title}
              className={`flex flex-col justify-between transition-all hover:shadow-sm ${
                action.highlight ? "border-primary/40 bg-primary/5" : "border-border"
              }`}
            >
              <CardContent className="p-5 flex flex-col justify-between h-full space-y-4">
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span
                      className={`flex size-10 items-center justify-center rounded-xl border ${
                        action.highlight
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-muted text-foreground border-border"
                      }`}
                      aria-hidden="true"
                    >
                      <Icon className="size-5" />
                    </span>
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-normal">
                      {action.badge}
                    </Badge>
                  </div>

                  <h3 className="font-semibold text-foreground tracking-tight">
                    {action.title}
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {action.description}
                  </p>
                </div>

                <div className="pt-2">
                  <Link
                    href={action.href}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
                  >
                    <span>{action.cta}</span>
                    <ArrowRight className="size-3" aria-hidden="true" />
                  </Link>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
