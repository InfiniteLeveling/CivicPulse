import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

const questions = [
  ["Who can use CivicPulse?", "CivicPulse is built for residents, campus communities, and municipal teams responsible for shared public infrastructure. Anyone can view the public civic map, while signed-in citizens can submit and track complaints."],
  ["How do I report and track an issue?", "Sign in to submit an issue with a title, description, photo, visibility setting, and map pin. Each submission receives a trackable case reference and full status timeline under My Complaints."],
  ["What if the AI gets the category wrong?", "AI image suggestions are always optional. You can review and adjust the suggested category, severity, and description before submitting your report."],
  ["How does duplicate detection work?", "Nearby unresolved reports in a similar category within 100 meters are flagged for review so you can support an existing report or confirm yours is a separate issue."],
  ["How are complaints routed to authorities?", "CivicPulse routes submitted issues to the responsible municipal department queue, prioritizing complaints by severity, community support, and age."],
  ["What happens to my uploaded photos?", "Uploaded photographs are stored privately in secure cloud storage. If you consent to AI analysis, the image is analyzed only to assist with issue categorization; please avoid capturing faces or license plates."],
  ["Can I use CivicPulse in an emergency?", "CivicPulse is for civic infrastructure maintenance and tracking. For an immediate threat to life or safety, contact local emergency services directly."],
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
