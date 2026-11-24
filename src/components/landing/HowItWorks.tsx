import { FileText, Camera, CheckSquare, Clock } from "lucide-react";

const steps = [
  {
    step: 1,
    title: "Describe the Problem",
    icon: FileText,
    text: "Tell us what you noticed in simple words. You can optionally let AI help suggest the details.",
  },
  {
    step: 2,
    title: "Add Photo & Location",
    icon: Camera,
    text: "Add a picture of the problem and confirm where it is on the map or with your device GPS.",
  },
  {
    step: 3,
    title: "Review & Submit",
    icon: CheckSquare,
    text: "Check if someone nearby already reported it to avoid duplicate efforts, then submit with one click.",
  },
  {
    step: 4,
    title: "Track Its Progress",
    icon: Clock,
    text: "Follow the issue from intake to completion with clear status updates and resolution evidence.",
  },
];

export function HowItWorks() {
  return (
    <section
      id="how-it-works"
      tabIndex={-1}
      aria-labelledby="how-title"
      className="bg-slate-900 text-white"
    >
      <div className="content-container section-space">
        <div className="max-w-2xl">
          <span className="text-xs font-semibold uppercase tracking-wider text-blue-400">
            Simple 4-Step Process
          </span>
          <h2 id="how-title" className="mt-1 text-2xl font-bold sm:text-3xl text-white">
            How CivicPulse works
          </h2>
          <p className="mt-2 text-sm text-slate-300 sm:text-base">
            Designed for quick, effortless reporting so anyone can make a difference in minutes.
          </p>
        </div>

        <ol className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map(({ step, title, icon: Icon, text }) => (
            <li
              key={title}
              className="relative flex flex-col justify-between rounded-xl border border-white/15 bg-white/5 p-6 transition-colors hover:border-white/30 hover:bg-white/10"
            >
              <div>
                <div className="mb-4 flex items-center justify-between">
                  <span className="flex size-9 items-center justify-center rounded-lg bg-primary font-bold text-white shadow-sm">
                    {step}
                  </span>
                  <Icon aria-hidden="true" className="size-6 text-blue-300" />
                </div>
                <h3 className="text-lg font-semibold text-white">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-300">{text}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
