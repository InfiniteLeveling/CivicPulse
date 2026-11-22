import { Flag, CircleAlert, Zap } from "lucide-react";
import type { PriorityBreakdown } from "@/types/domain";
import { CivicBadge } from "./CivicBadge";

export function PriorityBadge({ score, urgent }: Pick<PriorityBreakdown, "score" | "urgent">) {
  const valid = Number.isInteger(score) && score >= 0 && score <= 100;
  const band = score < 40 ? "Low" : score < 70 ? "Medium" : "High";
  const tone = { Low: "var(--muted-foreground)", Medium: "var(--pending)", High: "var(--high)" }[band];

  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      {valid ? (
        <CivicBadge tone={tone} icon={Flag}>{band} priority · {score}</CivicBadge>
      ) : (
        <CivicBadge tone="var(--warning)" icon={CircleAlert}>Invalid priority score</CivicBadge>
      )}
      {urgent && <CivicBadge tone="var(--critical)" icon={Zap}>Urgent</CivicBadge>}
    </span>
  );
}
