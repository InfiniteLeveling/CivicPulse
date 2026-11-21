import Link from "next/link";
import {
  MapPin,
  Globe,
  LayoutDashboard,
  ClipboardList,
  Layers,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function AdminQuickActions() {
  return (
    <Card className="border-border shadow-xs">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Layers className="size-4 text-primary" aria-hidden="true" />
          <CardTitle className="text-base font-semibold text-foreground">
            Administrative Navigation
          </CardTitle>
        </div>
        <p className="text-xs text-muted-foreground">
          Active civic portals and upcoming operational modules.
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Action 1: Live Civic Map */}
          <Link href="/map" className="block">
            <Button
              variant="outline"
              className="w-full justify-start gap-2.5 h-11 text-xs font-medium"
            >
              <MapPin className="size-4 text-primary shrink-0" aria-hidden="true" />
              <div className="text-left truncate">
                <p className="font-semibold text-foreground">Live Civic Map</p>
                <p className="text-[10px] text-muted-foreground truncate">
                  Explore public incidents
                </p>
              </div>
            </Button>
          </Link>

          {/* Action 2: Citizen Dashboard */}
          <Link href="/dashboard" className="block">
            <Button
              variant="outline"
              className="w-full justify-start gap-2.5 h-11 text-xs font-medium"
            >
              <LayoutDashboard className="size-4 text-primary shrink-0" aria-hidden="true" />
              <div className="text-left truncate">
                <p className="font-semibold text-foreground">Citizen Portal</p>
                <p className="text-[10px] text-muted-foreground truncate">
                  Standard citizen dashboard
                </p>
              </div>
            </Button>
          </Link>

          {/* Action 3: Public Website */}
          <Link href="/" className="block">
            <Button
              variant="outline"
              className="w-full justify-start gap-2.5 h-11 text-xs font-medium"
            >
              <Globe className="size-4 text-primary shrink-0" aria-hidden="true" />
              <div className="text-left truncate">
                <p className="font-semibold text-foreground">Public Website</p>
                <p className="text-[10px] text-muted-foreground truncate">
                  Landing page & about
                </p>
              </div>
            </Button>
          </Link>

          {/* Action 4: Complaints Queue (Phase 18 Coming Soon) */}
          <div className="relative">
            <Button
              variant="outline"
              disabled
              aria-disabled="true"
              className="w-full justify-start gap-2.5 h-11 text-xs font-medium opacity-60 cursor-not-allowed border-dashed"
            >
              <ClipboardList className="size-4 text-muted-foreground shrink-0" aria-hidden="true" />
              <div className="text-left truncate">
                <div className="flex items-center gap-1.5">
                  <p className="font-semibold text-foreground truncate">Complaints Queue</p>
                </div>
                <p className="text-[10px] text-muted-foreground truncate">
                  Phase 18 Scheduled Next
                </p>
              </div>
            </Button>
            <Badge
              variant="outline"
              className="absolute -top-2 right-2 text-[9px] px-1.5 py-0 bg-primary/10 text-primary border-primary/30"
            >
              Phase 18
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
