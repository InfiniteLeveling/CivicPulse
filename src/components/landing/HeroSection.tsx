import { Sparkles, CheckCircle2 } from "lucide-react";
import { LandingActions } from "./LandingActions";
import { NeighborhoodPreview } from "./NeighborhoodPreview";
import type { ComplaintSummary } from "@/types/domain";

interface HeroSectionProps {
  reports?: ComplaintSummary[];
}

export function HeroSection({ reports = [] }: HeroSectionProps) {
  return (
    <section aria-labelledby="hero-title" className="hero-section">
      <div className="content-container hero-grid">
        <div className="animate-fade-in">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-semibold text-primary">
            <Sparkles aria-hidden="true" size={14} />
            <span>AI-Assisted Civic Resolution</span>
          </div>
          <h1 id="hero-title" className="hero-title">
            <span>See a Problem?</span>{" "}
            <span className="text-primary">Report It.</span>{" "}
            <span>Make a Difference.</span>
          </h1>
          <p className="hero-description">
            Report potholes, garbage, water leaks and other civic issues in a few simple steps. Track their progress and help build a better community.
          </p>
          <LandingActions />
          <div className="mt-5 flex flex-wrap items-center gap-4 text-xs font-medium text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <CheckCircle2 size={15} className="text-resolved" aria-hidden="true" />
              Simple reporting
            </span>
            <span className="inline-flex items-center gap-1.5">
              <CheckCircle2 size={15} className="text-resolved" aria-hidden="true" />
              Clear updates
            </span>
            <span className="inline-flex items-center gap-1.5">
              <CheckCircle2 size={15} className="text-resolved" aria-hidden="true" />
              Community-powered action
            </span>
          </div>
        </div>
        <div className="animate-scale-in">
          <NeighborhoodPreview reports={reports} />
        </div>
      </div>
    </section>
  );
}
