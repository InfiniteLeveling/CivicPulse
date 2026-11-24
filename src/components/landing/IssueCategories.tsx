import Link from "next/link";
import { Construction, Trash2, Droplets, Lightbulb, Waves, TriangleAlert, type LucideIcon } from "lucide-react";
import { CATEGORY_LABELS } from "@/lib/constants";
import type { IssueCategory } from "@/types/domain";

const details = {
  pothole: { icon: Construction, plural: "Potholes", description: "Damaged roads and uneven paving.", tone: "amber" },
  garbage: { icon: Trash2, description: "Overflowing bins and missed collections.", tone: "green" },
  water_leakage: { icon: Droplets, description: "Leaking pipes, taps and water mains.", tone: "blue" },
  streetlight: { icon: Lightbulb, plural: "Streetlights", description: "Broken lamps and unlit streets.", tone: "amber" },
  drainage: { icon: Waves, description: "Blocked drains and standing water.", tone: "teal" },
  other: { icon: TriangleAlert, plural: "Other issues", description: "Other repairs in shared public spaces.", tone: "slate" },
} satisfies Record<IssueCategory, { icon: LucideIcon; plural?: string; description: string; tone: string }>;

export function IssueCategories() {
  return (
    <section className="content-container section-space" aria-labelledby="categories-title">
      <h2 id="categories-title">What you can report</h2>
      <ul className="mt-6 grid grid-cols-1 gap-3 min-[380px]:grid-cols-2 md:grid-cols-3 xl:grid-cols-6">
        {(Object.keys(CATEGORY_LABELS) as IssueCategory[]).map((category) => {
          const detail = details[category];
          const Icon = detail.icon;
          return (
            <li key={category} className="category-card">
              <Link
                href={`/report?category=${category}`}
                className="flex flex-col h-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-lg"
              >
                <span className="category-icon" data-tone={detail.tone}>
                  <Icon aria-hidden="true" />
                </span>
                <h3>{("plural" in detail && detail.plural) || CATEGORY_LABELS[category]}</h3>
                <p>{detail.description}</p>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
