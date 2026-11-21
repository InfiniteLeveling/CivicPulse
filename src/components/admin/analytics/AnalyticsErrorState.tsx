import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface AnalyticsErrorStateProps {
  error: string;
  onRetry: () => void;
}

export function AnalyticsErrorState({ error, onRetry }: AnalyticsErrorStateProps) {
  return (
    <Card className="border-destructive/30 bg-destructive/5 shadow-xs">
      <CardContent className="flex flex-col items-center justify-center p-8 text-center space-y-4">
        <div className="flex size-12 items-center justify-center rounded-xl bg-destructive/10 text-destructive border border-destructive/20">
          <AlertCircle className="size-6" aria-hidden="true" />
        </div>

        <div className="space-y-1.5">
          <h2 className="text-base font-bold tracking-tight text-foreground">
            Unable to Load Analytics Data
          </h2>
          <p className="text-xs text-muted-foreground max-w-md mx-auto leading-relaxed">
            {error || "An unexpected error occurred while communicating with the analytics service."}
          </p>
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onRetry}
          className="text-xs gap-1.5"
        >
          <RefreshCw className="size-3.5" aria-hidden="true" />
          <span>Retry Loading</span>
        </Button>
      </CardContent>
    </Card>
  );
}
