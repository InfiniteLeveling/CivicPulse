import Link from "next/link";
import {
  Construction,
  Trash2,
  Droplets,
  Lightbulb,
  Waves,
  TriangleAlert,
  ArrowRight,
  type LucideIcon,
} from "lucide-react";
import { CATEGORY_LABELS } from "@/lib/constants";
import type { IssueCategory } from "@/types/domain";

const details = {
  pothole: {
    icon: Construction,
    plural: "Pothole",
    description: "Damaged roads, cracks, or uneven paving.",
    tone: "amber",
  },
  garbage: {
    icon: Trash2,
    plural: "Garbage",
    description: "Waste accumulation or overflowing public bins.",
    tone: "green",
  },
  water_leakage: {
    icon: Droplets,
    plural: "Water Leakage",
    description: "Leaking pipes, broken taps, or water supply problems.",
    tone: "blue",
  },
  streetlight: {
    icon: Lightbulb,
    plural: "Streetlight",
    description: "Broken, flickering, or nonworking streetlights.",
    tone: "amber",
  },
  drainage: {
    icon: Waves,
    plural: "Drainage",
    description: "Blocked drains, open gutters, or waterlogging.",
    tone: "teal",
  },
  other: {
    icon: TriangleAlert,
    plural: "Other Problem",
    description: "Other civic issues affecting shared public areas.",
    tone: "slate",
  },
} satisfies Record<
  IssueCategory,
  { icon: LucideIcon; plural: string; description: string; tone: string }
>;

export function IssueCategories() {
  return (
    <section
      className="content-container section-space"
      aria-labelledby="categories-title"
    >
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
        <div>
          <h2 id="categories-title" className="text-2xl font-bold sm:text-3xl">
            What would you like to report?
          </h2>
          <p className="mt-1 text-sm text-muted-foreground sm:text-base">
            Choose an issue category below to start your report immediately.
          </p>
        </div>
        <Link
          href="/report"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:text-primary-hover hover:underline"
        >
          <span>All categories</span>
          <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6">
        {(Object.keys(CATEGORY_LABELS) as IssueCategory[]).map((category) => {
          const detail = details[category];
          const Icon = detail.icon;
          return (
            <Link
              key={category}
              href={`/report?category=${category}`}
              className="group relative flex flex-col justify-between rounded-xl border border-border bg-card p-5 transition-all duration-200 hover:-translate-y-1 hover:border-primary/40 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              <div>
                <span
                  className="category-icon mb-4 transition-transform duration-200 group-hover:scale-110"
                  data-tone={detail.tone}
                >
                  <Icon aria-hidden="true" className="size-6" />
                </span>
                <h3 className="font-semibold text-foreground group-hover:text-primary">
                  {detail.plural}
                </h3>
                <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">
                  {detail.description}
                </p>
              </div>
              <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-primary opacity-80 group-hover:opacity-100">
                <span>Report this</span>
                <ArrowRight
                  className="size-3.5 transition-transform group-hover:translate-x-1"
                  aria-hidden="true"
                />
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
