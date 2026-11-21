import { Inbox, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";

export function EmptyState({ title, description, icon: Icon = Inbox, action }: {
  title: string; description: string; icon?: LucideIcon; action?: ReactNode;
}) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-3 py-4 text-center">
        <Icon aria-hidden="true" className="size-8 text-muted-foreground" />
        <h3>{title}</h3><p className="max-w-prose text-muted-foreground">{description}</p>
        {action}
      </CardContent>
    </Card>
  );
}
