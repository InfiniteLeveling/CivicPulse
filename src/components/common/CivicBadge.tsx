import type { CSSProperties, ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function CivicBadge({ tone, icon: Icon, children }: { tone: string; icon: LucideIcon; children: ReactNode }) {
  return (
    <Badge variant="outline" className="civic-badge" style={{ "--tone": tone } as CSSProperties}>
      <Icon aria-hidden="true" /><span>{children}</span>
    </Badge>
  );
}
