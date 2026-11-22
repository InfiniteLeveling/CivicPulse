import type { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  description?: string;
  badge?: ReactNode;
  action?: ReactNode;
  breadcrumb?: ReactNode;
}

export function PageHeader({ title, description, badge, action, breadcrumb }: PageHeaderProps) {
  return (
    <header className="space-y-4">
      {breadcrumb}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3"><h1>{title}</h1>{badge}</div>
          {description && <p className="mt-3 max-w-prose text-muted-foreground">{description}</p>}
        </div>
        {action && <div className="flex flex-wrap gap-2">{action}</div>}
      </div>
    </header>
  );
}
