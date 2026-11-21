import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";

export function LoadingState({ label = "Loading…", variant = "inline" }: {
  label?: string; variant?: "inline" | "page" | "card" | "list";
}) {
  const status = <span role="status" className="inline-flex items-center gap-2 text-sm text-muted-foreground"><Spinner aria-hidden="true" />{label}</span>;
  if (variant === "inline") return status;
  if (variant === "page") return <div className="content-container grid min-h-[45vh] place-items-center">{status}</div>;
  return (
    <Card>
      <CardContent className="grid gap-4">
        {status}
        <div className="grid gap-3" aria-hidden="true">
          {variant === "list" ? Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-10 w-full" />) : (
            <><Skeleton className="h-4 w-2/3" /><Skeleton className="h-4 w-4/5" /></>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
