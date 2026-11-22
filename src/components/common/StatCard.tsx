import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export function StatCard({ label, value, icon: Icon, description }: {
  label: string; value: string | number; icon?: LucideIcon; description?: string;
}) {
  return (
    <Card><CardContent>
      <dl>
        <dt className="flex items-center gap-2 font-medium text-muted-foreground">{Icon && <Icon aria-hidden="true" className="size-4" />}{label}</dt>
        <dd className="mt-3 break-words text-3xl font-semibold tabular-nums">{value}</dd>
      </dl>
      {description && <p className="mt-2 text-muted-foreground">{description}</p>}
    </CardContent></Card>
  );
}
