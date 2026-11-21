import { Route } from "lucide-react";

export function ProductOverview() {
  return (
    <section id="about" tabIndex={-1} aria-labelledby="about-title" className="border-y bg-primary-light/60">
      <div className="content-container grid items-center gap-4 py-7 md:grid-cols-[1fr_1.35fr] md:gap-10">
        <div className="flex items-center gap-4">
          <Route aria-hidden="true" className="size-8 shrink-0 text-primary" />
          <h2 id="about-title" className="text-xl sm:text-2xl">A shared record of local issues</h2>
        </div>
        <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">From reporting an issue to verifying its resolution, CivicPulse makes civic problem management more transparent and organized. Residents can follow a case, and maintenance teams can see who owns the next step.</p>
      </div>
    </section>
  );
}
