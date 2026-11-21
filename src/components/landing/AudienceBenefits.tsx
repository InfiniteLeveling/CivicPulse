import { Building2, UsersRound } from "lucide-react";

export function AudienceBenefits() {
  return (
    <section className="content-container pb-10 sm:pb-14" aria-labelledby="benefits-title">
      <h2 id="benefits-title" className="mb-5">Who it’s designed for</h2>
      <div className="grid gap-4 md:grid-cols-2">
        <article className="rounded-xl border bg-primary-light p-6">
          <UsersRound aria-hidden="true" className="mb-3 text-primary" />
          <h3>For citizens</h3>
          <p className="mt-2 text-muted-foreground">Capture a problem with a photo and location. Find nearby reports, support a shared concern and return to the same case for progress and repair evidence.</p>
        </article>
        <article className="rounded-xl border bg-muted p-6">
          <Building2 aria-hidden="true" className="mb-3 text-muted-foreground" />
          <h3>For authorities</h3>
          <p className="mt-2 text-muted-foreground">Review complaints in one queue. Check AI suggestions and duplicates, prioritize cases, assign departments and track resolution performance. The prototype uses a simulated authority.</p>
        </article>
      </div>
    </section>
  );
}
