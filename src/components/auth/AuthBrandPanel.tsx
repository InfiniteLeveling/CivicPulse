import { BrandLogo } from "@/components/common/BrandLogo";
import { CheckCircle2, ShieldCheck, Sparkles, Users } from "lucide-react";

const benefits = [
  {
    icon: Sparkles,
    title: "AI-Assisted Issue Intake",
    description: "Upload a photo and get automated category and severity suggestions you can verify.",
  },
  {
    icon: Users,
    title: "Community-Driven Accountability",
    description: "Upvote shared concerns and avoid duplicate complaints in your neighborhood.",
  },
  {
    icon: ShieldCheck,
    title: "Verified Resolution Evidence",
    description: "Track maintenance team updates with photos and transparent status histories.",
  },
];

export function AuthBrandPanel() {
  return (
    <div className="relative hidden h-full flex-col justify-between overflow-hidden rounded-2xl bg-slate-900 p-8 text-white lg:flex xl:p-12">
      {/* Decorative gradient overlay */}
      <div
        className="pointer-events-none absolute -top-24 -left-24 size-96 rounded-full bg-blue-600/20 blur-3xl"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -bottom-24 -right-24 size-96 rounded-full bg-primary/20 blur-3xl"
        aria-hidden="true"
      />

      <div className="relative z-10">
        <BrandLogo inverse showTagline />
        <p className="mt-4 max-w-md text-sm leading-relaxed text-slate-300">
          CivicPulse empowers citizens and local maintenance authorities to resolve infrastructure
          problems together with speed and transparency.
        </p>

        <div className="mt-10 space-y-6">
          {benefits.map(({ icon: Icon, title, description }) => (
            <div key={title} className="flex items-start gap-3.5">
              <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-blue-500/10 text-blue-400">
                <Icon className="size-4" aria-hidden="true" />
              </span>
              <div>
                <h3 className="text-sm font-semibold text-white">{title}</h3>
                <p className="mt-0.5 text-xs text-slate-300 leading-normal">{description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="relative z-10 border-t border-slate-800 pt-6">
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <CheckCircle2 className="size-4 text-emerald-400" aria-hidden="true" />
          <span>Open Innovation Civic Technology Prototype</span>
        </div>
      </div>
    </div>
  );
}
