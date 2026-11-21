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
import { StatisticsSection } from "@/components/landing/StatisticsSection";
import { FAQSection } from "@/components/landing/FAQSection";
import { FinalCTA } from "@/components/landing/FinalCTA";
import { APP_NAME } from "@/lib/constants";
import "./landing.css";

const title = `${APP_NAME} | Intelligent Civic Problem Resolution`;
const description = "Report civic issues, discover community problems and track resolution progress with CivicPulse, an intelligent civic reporting platform.";

export const metadata: Metadata = {
  title,
  description,
  openGraph: { title, description, type: "website", siteName: APP_NAME },
};

export default function Home() {
  return (
    <div className="public-page">
      <Navbar />
      <main id="home" tabIndex={-1}>
        <HeroSection />
        <ProductOverview />
        <IssueCategories />
        <HowItWorks />
        <CoreFeatures />
        <AudienceBenefits />
        <WorkflowSection />
        <PlatformPreview />
        <StatisticsSection />
        <FAQSection />
        <FinalCTA />
      </main>
      <Footer />
    </div>
  );
}
