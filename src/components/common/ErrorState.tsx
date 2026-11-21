import { CircleAlert, type LucideIcon } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

export function ErrorState({ message, guidance, onRetry, icon: Icon = CircleAlert }: {
  message: string; guidance?: string; onRetry?: () => void; icon?: LucideIcon;
}) {
  return (
    <Alert className="gap-y-2 rounded-xl p-4">
      <Icon aria-hidden="true" className="text-destructive" />
      <p className="font-semibold">{message}</p>
      {guidance && <AlertDescription>{guidance}</AlertDescription>}
      {onRetry && <div className="col-start-2"><Button variant="outline" onClick={onRetry}>Try again</Button></div>}
    </Alert>
  );
}
