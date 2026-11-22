import { Clock3, CircleCheck, CircleDashed } from "lucide-react";
import type { ReportStatus } from "@/types/domain";
import { STATUS_COLORS, STATUS_LABELS } from "@/lib/constants";
import { CivicBadge } from "./CivicBadge";

const icons = { pending: Clock3, in_progress: CircleDashed, resolved: CircleCheck };

export function StatusBadge({ status }: { status: ReportStatus }) {
  return <CivicBadge tone={STATUS_COLORS[status]} icon={icons[status]}>{STATUS_LABELS[status]}</CivicBadge>;
}
