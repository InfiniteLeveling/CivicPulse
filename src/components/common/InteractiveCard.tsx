import Link, { type LinkProps } from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export function InteractiveCard<T extends string>({ href, title, description }: {
  href: LinkProps<T>["href"]; title: string; description?: string;
}) {
  return (
    <Card className="relative transition-colors hover:bg-primary-light focus-within:ring-2 focus-within:ring-primary">
      <CardContent>
        <h3 className="text-base">
          <Link href={href} className="inline-flex items-center gap-2 after:absolute after:inset-0">
            {title}<ArrowUpRight aria-hidden="true" className="size-4 text-primary" />
          </Link>
        </h3>
        {description && <p className="mt-2 text-muted-foreground">{description}</p>}
      </CardContent>
    </Card>
  );
}
