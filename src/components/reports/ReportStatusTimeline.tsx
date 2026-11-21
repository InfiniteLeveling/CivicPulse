import { History, Info } from "lucide-react";
import type { StatusHistory } from "@/types/domain";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ReportTimelineEvent } from "./ReportTimelineEvent";

interface ReportStatusTimelineProps {
  history: StatusHistory[];
}

export function ReportStatusTimeline({ history }: ReportStatusTimelineProps) {
  // Ensure chronological ordering by timestamp
  const sortedHistory = [...history].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  return (
    <Card className="border-border shadow-xs">
      <CardHeader className="pb-3">
        <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
          <History className="size-4 text-primary" aria-hidden="true" />
          <span>Status Timeline</span>
        </h2>
      </CardHeader>

      <CardContent>
        {sortedHistory.length === 0 ? (
          <div className="flex items-center gap-2 text-xs text-muted-foreground p-4 rounded-lg bg-muted/30 border border-border/50">
            <Info className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            <span>Detailed status history is unavailable for this complaint.</span>
          </div>
        ) : (
          <div className="space-y-6 pt-1">
            {sortedHistory.map((event, index) => (
              <ReportTimelineEvent
                key={event.id || `${event.eventType}-${index}`}
                event={event}
                isLast={index === sortedHistory.length - 1}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
