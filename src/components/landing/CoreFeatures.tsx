import {
  Sparkles,
  CopyCheck,
  HeartHandshake,
  Map,
  ListChecks,
  Camera,
} from "lucide-react";

const features = [
  {
    title: "Smart AI Assistance",
    icon: Sparkles,
    text: "Get help describing your issue from a photo. You can review and edit all suggestions before submitting.",
  },
  {
    title: "Nearby Duplicate Detection",
    icon: CopyCheck,
    text: "Checks nearby reports so the same problem doesn't need to be reported repeatedly, saving time for everyone.",
  },
  {
    title: "Community Support",
    icon: HeartHandshake,
    text: "Support existing complaints if the same problem affects you, giving maintenance teams a clearer sense of community urgency.",
  },
  {
    title: "Interactive Civic Map",
    icon: Map,
    text: "Explore verified public complaints across your neighborhood with clear category markers and progress filters.",
  },
  {
    title: "Transparent Status Tracking",
    icon: ListChecks,
    text: "Follow every update through Pending, In Progress and Resolved with clear, human-readable timestamps.",
  },
  {
    title: "Resolution Evidence",
    icon: Camera,
    text: "Inspect photographic proof and staff completion notes once a reported problem has been resolved.",
  },
];

export function CoreFeatures() {
  return (
    <section
      id="features"
      tabIndex={-1}
      aria-labelledby="features-title"
      className="content-container section-space"
    >
      <div>
        <span className="text-xs font-semibold uppercase tracking-wider text-primary">
          Intelligent Capabilities
        </span>
        <h2 id="features-title" className="mt-1 text-2xl font-bold sm:text-3xl">
          Designed for Clarity and Trust
        </h2>
        <p className="section-description mt-2 text-sm text-muted-foreground sm:text-base">
          Every tool is crafted to remove friction for citizens while keeping resolution transparent.
        </p>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {features.map(({ title, icon: Icon, text }) => (
          <article
            className="feature-card group rounded-xl border border-border bg-card p-6 transition-all duration-200 hover:-translate-y-1 hover:border-primary/40 hover:shadow-md"
            key={title}
          >
            <div className="flex size-11 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-white">
              <Icon aria-hidden="true" className="size-5" />
            </div>
            <h3 className="mt-4 text-lg font-semibold text-foreground">{title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{text}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
