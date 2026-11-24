import { PublicLink } from "@/components/layout/PublicLink";
import { ArrowRight, Map } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { publicDestinations } from "@/lib/constants/public-navigation";
import { cn } from "@/lib/utils";

export function LandingActions({ inverse = false }: { inverse?: boolean }) {
  return (
    <div className="landing-actions flex flex-wrap items-center gap-3 pt-2">
      <PublicLink
        href={publicDestinations.report}
        className={cn(
          buttonVariants({ size: "lg" }),
          "h-12 min-h-[48px] px-6 text-base font-semibold shadow-sm hover:shadow-md transition-all duration-200 gap-2",
          inverse && "bg-white text-primary-hover hover:bg-primary-light"
        )}
      >
        <span>Report an Issue</span>
        <ArrowRight className="size-4" aria-hidden="true" />
      </PublicLink>
      <PublicLink
        href={publicDestinations.map}
        className={cn(
          buttonVariants({ variant: "outline", size: "lg" }),
          "h-12 min-h-[48px] px-6 text-base font-semibold transition-all duration-200 gap-2 border-border/80 hover:bg-muted",
          inverse ? "border-white/70 bg-transparent text-white hover:bg-white/10 hover:text-white" : "bg-card text-foreground"
        )}
      >
        <Map className="size-4 text-primary" aria-hidden="true" />
        <span>Explore Civic Map</span>
      </PublicLink>
    </div>
  );
}
