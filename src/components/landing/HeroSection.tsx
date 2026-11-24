import { Building2 } from "lucide-react";
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
        <div>
          <p className="hero-label"><Building2 aria-hidden="true" size={16} /> Civic issue reporting</p>
          <h1 id="hero-title" className="hero-title">
            <span>Your City.</span>{" "}<span>Your Voice.</span>{" "}<span className="text-primary">Your Impact.</span>
          </h1>
          <p className="hero-description">Report civic problems, track their progress, and help build safer, cleaner and more accountable communities.</p>
          <LandingActions />
          <p className="mt-3 text-xs text-muted-foreground">Submit verified civic reports and track municipal resolution live.</p>
        </div>
        <NeighborhoodPreview reports={reports} />
      </div>
    </section>
  );
}
