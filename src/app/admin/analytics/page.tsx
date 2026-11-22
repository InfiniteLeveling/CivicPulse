import type { Metadata } from "next";
import { getAdminAnalytics } from "@/lib/api/analytics";
import { AdminAnalyticsDashboard } from "@/components/admin/analytics/AdminAnalyticsDashboard";

export const metadata: Metadata = {
  title: "City Analytics & Civic Performance | CivicPulse Admin",
  description:
    "Explore municipal complaint trends, issue category distribution, and resolution performance across municipal infrastructure operations.",
};

export const dynamic = "force-dynamic";

export default async function AdminAnalyticsPage({
  searchParams,
}: {
  searchParams?: Promise<{
    empty?: string;
    forceError?: string;
    timeRange?: "all" | "30d" | "7d";
    category?: string;
    status?: string;
  }>;
}) {
  const resolved = searchParams ? await searchParams : undefined;
  const data = await getAdminAnalytics({
    empty: resolved?.empty === "true",
    forceError: resolved?.forceError === "true",
    timeRange: resolved?.timeRange,
    category: resolved?.category,
    status: resolved?.status,
  });

  return <AdminAnalyticsDashboard initialData={data} />;
}
