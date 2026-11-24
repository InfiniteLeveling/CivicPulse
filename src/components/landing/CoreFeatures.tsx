import { ScanLine, CopyCheck, SlidersHorizontal, Map, ListChecks, Camera } from "lucide-react";

const features = [
  { title: "AI-assisted reporting", icon: ScanLine, text: "Turn a photo into a suggested category and description that the reporter can edit." },
  { title: "Smart duplicate detection", icon: CopyCheck, text: "Compare nearby unresolved reports before deciding whether to support an existing case." },
  { title: "Explainable priority scoring", icon: SlidersHorizontal, text: "See how severity, community support and time waiting contribute to queue position." },
  { title: "Interactive civic map", icon: Map, text: "Find public issues by location and open a report for its latest recorded update." },
  { title: "Transparent status tracking", icon: ListChecks, text: "Follow a dated history through Pending, In Progress and Resolved." },
  { title: "Resolution verification", icon: Camera, text: "Review repair evidence with verified before/after proof upon completion." },
];

export function CoreFeatures() {
  return (
    <section id="features" tabIndex={-1} aria-labelledby="features-title" className="content-container section-space">
      <h2 id="features-title">Tools for a clearer picture</h2>
      <p className="section-description">Six core capabilities designed for fast reporting and transparent civic operations.</p>
      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {features.map(({ title, icon: Icon, text }) => (
          <article className="feature-card group" key={title}>
            <Icon aria-hidden="true" size={22} className="text-primary transition-transform group-hover:scale-110 duration-200" />
            <h3 className="mt-4 text-lg font-semibold text-foreground">{title}</h3>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{text}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
