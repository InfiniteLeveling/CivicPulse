import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getVerifiedUser } from "@/lib/auth/authorization";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { ReportFormHeader } from "@/components/reports/ReportFormHeader";
import { ReportForm } from "@/components/reports/ReportForm";

export const metadata: Metadata = {
  title: "Report an Issue | CivicPulse",
  description:
    "Report community infrastructure problems such as potholes, garbage accumulation, or broken streetlights for municipal resolution.",
};

export default async function ReportIssuePage() {
  if (isSupabaseConfigured()) {
    const auth = await getVerifiedUser();
    if (!auth) {
      redirect("/login?next=/report");
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in-50 duration-200">
      <ReportFormHeader />
      <ReportForm />
    </div>
  );
}
