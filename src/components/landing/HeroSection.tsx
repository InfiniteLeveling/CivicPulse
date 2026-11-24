import { Sparkles, CheckCircle2 } from "lucide-react";
import { LandingActions } from "./LandingActions";
import { NeighborhoodPreview } from "./NeighborhoodPreview";

export function HeroSection() {
  return (
    <section aria-labelledby="hero-title" className="hero-section relative overflow-hidden bg-background py-8 sm:py-14">
      <div className="content-container hero-grid relative z-10">
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-semibold text-primary">
            <Sparkles aria-hidden="true" className="size-3.5 text-primary" />
            <span>Intelligent Civic Problem Resolution</span>
          </div>

          <h1 id="hero-title" className="hero-title">
            <span>Your City.</span>{" "}<span>Your Voice.</span>{" "}<span className="text-primary">Your Impact.</span>
          </h1>

          <p className="hero-description text-base text-muted-foreground leading-relaxed max-w-xl">
            See a problem? Report it and make a difference. Report potholes, garbage, water leaks, and broken streetlights in minutes. Track resolution progress and help build a better community.
          </p>

          <LandingActions />

          {/* Trust points */}
          <div className="pt-2 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-medium text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="size-4 text-emerald-600 shrink-0" aria-hidden="true" />
              <span>Simple, fast reporting</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="size-4 text-emerald-600 shrink-0" aria-hidden="true" />
              <span>Transparent status updates</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="size-4 text-emerald-600 shrink-0" aria-hidden="true" />
              <span>Community-powered</span>
            </div>
          </div>
        </div>

        <div className="relative">
          <NeighborhoodPreview />
        </div>
      </div>
    </section>
  );
}
