import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { HelpCircle } from "lucide-react";

const faqs = [
  {
    q: "How do I report a problem?",
    a: "Click 'Report an Issue' anywhere on the platform. Select an issue category, describe what you observed, attach a photograph, and confirm the location on the map. You can review your details and submit in less than two minutes.",
  },
  {
    q: "Do I need an account to report an issue?",
    a: "Yes. An authenticated citizen account ensures that your report has a verified owner, prevents fraudulent spam, and allows you to track real-time resolution progress and community updates on your dashboard.",
  },
  {
    q: "What types of problems can I report on CivicPulse?",
    a: "CivicPulse supports 6 major infrastructure categories: Potholes and damaged roads, Garbage accumulation and overflowing bins, Water supply leaks and broken pipes, Non-functioning streetlights, Blocked drainage and waterlogging, and Other shared public hazards.",
  },
  {
    q: "What if someone has already reported the same issue?",
    a: "During the reporting flow, CivicPulse automatically scans for nearby reports in the same category. If a matching complaint already exists, you can click 'I face this problem too' to back it. Supporting an existing report increases its priority without creating duplicate work orders.",
  },
  {
    q: "How do I track my complaint after submitting?",
    a: "Every submission receives a unique tracking reference (e.g., REP-2026-001). You can view your reports anytime under 'My Reports' or by visiting the complaint's direct link to view status transitions and photographic resolution proof.",
  },
  {
    q: "What if my current GPS location is slightly off?",
    a: "You can drag the map pin or click anywhere on the interactive map to adjust the position before submitting. We recommend placing the pin directly where the hazard is located, even if you are submitting from across the street.",
  },
  {
    q: "What is a private report vs a public report?",
    a: "Public reports appear on the Live Civic Map and allow neighborhood residents to support them. If you prefer your complaint not to be displayed on the public map, you can select 'Private' during step 1.",
  },
  {
    q: "Can I use CivicPulse in an emergency?",
    a: "No. CivicPulse is designed for non-emergency public infrastructure maintenance. In cases of immediate danger to life, criminal activity, gas leaks, or medical emergencies, please call local emergency services immediately.",
  },
  {
    q: "Does CivicPulse guarantee immediate resolution?",
    a: "CivicPulse streamlines civic intake, triage, and transparent departmental tracking. Actual resolution time depends on municipal resource allocation, severity, and field crew scheduling. CivicPulse holds municipal operations accountable through public tracking and photographic resolution evidence.",
  },
];

export function FAQSection() {
  return (
    <section className="border-t border-border bg-muted/20 py-16 sm:py-24" aria-labelledby="faq-title">
      <div className="content-container grid items-start gap-8 lg:grid-cols-[1fr_1.8fr] lg:gap-14">
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary">
            <HelpCircle className="size-4" aria-hidden="true" />
            <span>Common Questions</span>
          </div>
          <h2 id="faq-title" className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Frequently asked questions
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
            Everything you need to know about reporting civic issues, tracking repairs, and community support on CivicPulse.
          </p>
        </div>

        <Accordion className="rounded-xl border border-border bg-card px-4 sm:px-6 divide-y divide-border/60 shadow-2xs">
          {faqs.map(({ q, a }) => (
            <AccordionItem key={q} value={q} className="border-none py-1">
              <AccordionTrigger className="text-left py-4 text-sm sm:text-base font-semibold text-foreground hover:text-primary transition-colors">
                {q}
              </AccordionTrigger>
              <AccordionContent className="text-xs sm:text-sm text-muted-foreground leading-relaxed pb-4">
                {a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
