import { PublicLink } from "@/components/layout/PublicLink";
import { ArrowRight, Map } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { publicDestinations } from "@/lib/constants/public-navigation";
import { cn } from "@/lib/utils";

export function LandingActions({ inverse = false }: { inverse?: boolean }) {
  return (
    <div className="landing-actions">
      <PublicLink href={publicDestinations.report} className={cn(buttonVariants({ size: "lg" }),
        inverse && "bg-white text-primary-hover hover:bg-primary-light")}>
        Report an Issue <ArrowRight aria-hidden="true" />
      </PublicLink>
      <PublicLink href={publicDestinations.map} className={cn(buttonVariants({ variant: "outline", size: "lg" }),
        inverse ? "border-white/70 bg-transparent text-white hover:bg-white/10 hover:text-white" : "bg-card")}>
        <Map aria-hidden="true" /> Explore Civic Map
      </PublicLink>
    </div>
  );
}
