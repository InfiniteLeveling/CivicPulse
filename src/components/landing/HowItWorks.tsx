import { FileText, Camera, CheckCircle, TrendingUp } from "lucide-react";

const steps = [
  {
    step: "01",
    title: "Describe the Problem",
    icon: FileText,
    text: "Enter a quick title and description. You can also let our smart AI assistant help draft the details directly from your photo.",
  },
  {
    step: "02",
    title: "Add Photo & Location",
    icon: Camera,
    text: "Upload a clear photograph of the issue and pinpoint the exact location on our map or use your device's current GPS position.",
  },
  {
    step: "03",
    title: "Review & Submit",
    icon: CheckCircle,
    text: "We automatically check for nearby duplicate complaints. If it's a new issue, review your summary and submit with one click.",
  },
  {
    step: "04",
    title: "Track Its Progress",
    icon: TrendingUp,
    text: "Receive an official tracking reference. Monitor departmental triage, status updates, and verified photo evidence upon repair.",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" tabIndex={-1} aria-labelledby="how-title" className="bg-slate-900 text-white py-16 sm:py-24">
      <div className="content-container">
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <span className="text-xs font-bold tracking-widest uppercase text-blue-400">
            Transparent Municipal Process
          </span>
          <h2 id="how-title" className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            How CivicPulse works
          </h2>
          <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
            A simple 4-step workflow that takes your complaint from an on-site photo to a documented, verified civic repair.
          </p>
        </div>

        <ol className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
          {steps.map(({ step, title, icon: Icon, text }) => (
            <li
              key={step}
              className="relative rounded-xl border border-slate-800 bg-slate-950/60 p-6 flex flex-col justify-between hover:border-slate-700 transition-colors"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-black text-blue-400 font-mono">{step}</span>
                  <div className="size-10 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center">
                    <Icon className="size-5" aria-hidden="true" />
                  </div>
                </div>
                <h3 className="text-lg font-semibold text-white">{title}</h3>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">{text}</p>
              </div>

              <div className="mt-6 pt-3 border-t border-slate-800/80 text-[11px] font-medium text-slate-400">
                Step {step} of 04
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
