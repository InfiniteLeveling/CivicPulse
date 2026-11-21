import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

const questions = [
  ["Who can use CivicPulse?", "CivicPulse is designed for residents, students and local communities, alongside the teams responsible for shared infrastructure. Anyone can explore the public prototype."],
  ["How will I report and track an issue?", "The planned reporting flow lets a signed-in resident add a description, photo and confirmed location. A case reference will link to status updates and repair evidence."],
  ["What if the AI gets the category wrong?", "AI suggestions are optional. The planned form lets you correct the category and description or enter them yourself. Staff can review the suggested severity."],
  ["How will duplicate detection work?", "Nearby, unresolved reports in a similar category are candidates for review. A resident can support an existing report or explain why the new issue is separate."],
  ["Is CivicPulse connected to government authorities?", "This prototype uses a simulated authority. A live connection to a municipality or maintenance department would require an agreement with that organization."],
  ["What happens to my photos?", "This preview accepts no uploads. For future reporting, choose photos of the issue itself and keep faces, license plates and private details out of the frame. The planned AI analysis requires your consent."],
  ["Can I use CivicPulse in an emergency?", "CivicPulse is for routine maintenance. For an immediate threat to life or safety, contact local emergency services directly."],
];

export function FAQSection() {
  return (
    <section className="border-t bg-background" aria-labelledby="faq-title">
      <div className="content-container section-space grid items-start gap-5 lg:grid-cols-[1fr_1.7fr] lg:gap-12">
        <h2 id="faq-title">Frequently asked questions</h2>
        <Accordion className="rounded-xl border bg-card px-4 sm:px-6">
          {questions.map(([question, answer]) => <AccordionItem key={question} value={question}>
            <AccordionTrigger className="min-h-12 items-center py-4 text-base">{question}</AccordionTrigger>
            <AccordionContent className="max-w-prose text-muted-foreground">{answer}</AccordionContent>
          </AccordionItem>)}
        </Accordion>
      </div>
    </section>
  );
}
