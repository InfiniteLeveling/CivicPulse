import { Camera, ScanLine, ListOrdered, ClipboardCheck } from "lucide-react";

const steps = [
  { title: "Report", icon: Camera, text: "Describe the problem, add a photo and confirm its location." },
  { title: "Analyze", icon: ScanLine, text: "Optional AI suggests a category and severity. Correct the details before submitting." },
  { title: "Prioritize", icon: ListOrdered, text: "Review nearby matches. Maintenance teams use severity, support and waiting time to plan work." },
  { title: "Resolve", icon: ClipboardCheck, text: "Teams record progress and repair evidence. Residents can follow the outcome." },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" tabIndex={-1} aria-labelledby="how-title" className="bg-foreground text-white">
      <div className="content-container section-space">
        <h2 id="how-title">How CivicPulse works</h2>
        <p className="mt-2 text-slate-300">The planned journey from a resident’s photo to a documented repair.</p>
        <ol className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map(({ title, icon: Icon, text }, index) => (
            <li key={title} className="border-t border-white/25 pt-4">
              <div className="mb-4 flex items-center justify-between">
                <span className="text-sm font-semibold text-blue-200">Step {index + 1}</span><Icon aria-hidden="true" size={23} />
              </div>
              <h3 className="text-xl">{title}</h3><p className="mt-2 text-sm leading-relaxed text-slate-300">{text}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
