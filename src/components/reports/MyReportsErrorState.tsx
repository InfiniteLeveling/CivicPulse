import { AlertTriangle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface MyReportsErrorStateProps {
  message?: string;
  onRetry: () => void;
}

export function MyReportsErrorState({
  message = "There was a problem communicating with the server. Please try again.",
  onRetry,
}: MyReportsErrorStateProps) {
  return (
    <Card className="border-destructive/30 bg-destructive/5 shadow-xs">
      <CardContent className="flex flex-col items-center justify-center py-10 px-4 text-center space-y-3">
        <div className="flex size-12 items-center justify-center rounded-xl bg-destructive/10 text-destructive border border-destructive/20">
          <AlertTriangle className="size-6" aria-hidden="true" />
        </div>

        <div className="space-y-1 max-w-md">
          <h3 className="text-base font-semibold tracking-tight text-foreground">
            Unable to Load Complaints
          </h3>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            {message}
          </p>
        </div>

        <div className="pt-1">
          <Button
            type="button"
            variant="default"
            size="sm"
            onClick={onRetry}
            className="gap-1.5 text-xs h-8 shadow-xs"
          >
            <RotateCcw className="size-3.5" aria-hidden="true" />
            <span>Retry</span>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
