import { Activity } from "lucide-react";
import { cn } from "@/lib/utils";
import { APP_NAME, APP_TAGLINE } from "@/lib/constants";

export function BrandLogo({ compact = false, inverse = false, showTagline = false }: { compact?: boolean; inverse?: boolean; showTagline?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5 align-middle", inverse ? "text-white" : "text-foreground")}>
      <span className="grid size-9 shrink-0 place-items-center rounded-md bg-primary text-white">
        <Activity aria-hidden="true" className="size-6" strokeWidth={2.4} />
      </span>
      <span className={compact ? "sr-only" : "min-w-0"}>
        <span className="block text-xl font-semibold tracking-tight sm:text-2xl">{APP_NAME}</span>
        {showTagline && !compact && <span className="caption block font-normal">{APP_TAGLINE}</span>}
      </span>
    </span>
  );
}
