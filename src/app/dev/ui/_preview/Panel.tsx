import type { ReactNode } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card>
      <CardHeader className="border-b"><h2 className="text-xl">{title}</h2></CardHeader>
      <CardContent className="grid gap-4">{children}</CardContent>
    </Card>
  );
}
