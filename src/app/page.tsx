import type { Metadata } from "next";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { HeroSection } from "@/components/landing/HeroSection";
import { ProductOverview } from "@/components/landing/ProductOverview";
import { IssueCategories } from "@/components/landing/IssueCategories";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { CoreFeatures } from "@/components/landing/CoreFeatures";
import { AudienceBenefits } from "@/components/landing/AudienceBenefits";
import { WorkflowSection } from "@/components/landing/WorkflowSection";
import { PlatformPreview } from "@/components/landing/PlatformPreview";
import { StatisticsSection, type PublicMetricsSummary } from "@/components/landing/StatisticsSection";
import { FAQSection } from "@/components/landing/FAQSection";
import { FinalCTA } from "@/components/landing/FinalCTA";
import { APP_NAME } from "@/lib/constants";
import { getPublicReportsServerData } from "@/lib/reports/server-queries";
import type { ComplaintSummary } from "@/types/domain";
import "./landing.css";

export const dynamic = "force-dynamic";

const title = `${APP_NAME} | Intelligent Civic Problem Resolution`;
const description = "Report civic issues, discover community problems and track resolution progress with CivicPulse, an intelligent civic reporting platform.";

export const metadata: Metadata = {
  title,
  description,
  openGraph: { title, description, type: "website", siteName: APP_NAME },
};

export default async function Home() {
  let publicReports: ComplaintSummary[] = [];
  let publicStats: PublicMetricsSummary | null = null;

  try {
    const res = await getPublicReportsServerData();
    publicReports = res.items;
    publicStats = {
      total: res.items.length,
      pending: res.items.filter((r) => r.status === "pending").length,
      inProgress: res.items.filter((r) => r.status === "in_progress").length,
      resolved: res.items.filter((r) => r.status === "resolved").length,
    };
  } catch {
    publicReports = [];
    publicStats = null;
  }

  return (
    <div className="public-page">
      <Navbar />
      <main id="home" tabIndex={-1}>
        <HeroSection reports={publicReports} />
        <ProductOverview />
        <IssueCategories />
        <HowItWorks />
        <CoreFeatures />
        <AudienceBenefits />
        <WorkflowSection />
        <PlatformPreview reports={publicReports} />
        <StatisticsSection stats={publicStats} />
        <FAQSection />
        <FinalCTA />
      </main>
      <Footer />
    </div>
  );
}
