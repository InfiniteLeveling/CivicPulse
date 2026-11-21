import { LandingActions } from "./LandingActions";

export function FinalCTA() {
  return (
    <section aria-labelledby="cta-title" className="bg-primary-hover text-white">
      <div className="content-container section-space flex flex-col items-start gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="max-w-xl">
          <h2 id="cta-title">A better community starts with a single report.</h2>
          <p className="mt-3 text-blue-50">Help make public spaces cleaner, safer and more responsive by reporting problems and following their resolution.</p>
        </div>
        <LandingActions inverse />
      </div>
    </section>
  );
}
