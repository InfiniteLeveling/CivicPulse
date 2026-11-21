import { Minus, Equal, ChevronsUp, TriangleAlert } from "lucide-react";
import type { IssueSeverity } from "@/types/domain";
import { SEVERITY_COLORS, SEVERITY_LABELS } from "@/lib/constants";
import { CivicBadge } from "./CivicBadge";

const icons = { low: Minus, medium: Equal, high: ChevronsUp, critical: TriangleAlert };

export function SeverityBadge({ severity, source }: { severity: IssueSeverity; source?: "ai" | "admin" }) {
  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <CivicBadge tone={SEVERITY_COLORS[severity]} icon={icons[severity]}>{SEVERITY_LABELS[severity]}</CivicBadge>
      {source && <span className="caption text-muted-foreground">{source === "ai" ? "AI-suggested" : "Admin-reviewed"}</span>}
    </span>
  );
}
