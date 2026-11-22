import { BarChart3, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface AnalyticsEmptyStateProps {
  onRefresh: () => void;
}

export function AnalyticsEmptyState({ onRefresh }: AnalyticsEmptyStateProps) {
  return (
    <Card className="border-border bg-card shadow-xs">
      <CardContent className="flex flex-col items-center justify-center p-12 text-center space-y-3">
        <div className="flex size-12 items-center justify-center rounded-xl bg-muted text-muted-foreground">
          <BarChart3 className="size-6" aria-hidden="true" />
        </div>
        <div className="space-y-1">
          <h2 className="text-base font-semibold text-foreground">
            Not Enough Data Yet
          </h2>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            Analytical charts and distributions will become active as civic complaints are logged and managed by municipal departments.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onRefresh}
          className="text-xs gap-1.5"
        >
          <RefreshCw className="size-3.5" aria-hidden="true" />
          <span>Refresh Analytics</span>
        </Button>
      </CardContent>
    </Card>
  );
}
