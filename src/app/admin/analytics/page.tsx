import type { Metadata } from "next";
import { getAdminAnalyticsServerData } from "@/lib/reports/server-queries";
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
    timeRange?: "all" | "30d" | "7d";
    category?: string;
    status?: string;
  }>;
}) {
  const resolved = searchParams ? await searchParams : undefined;
  const data = await getAdminAnalyticsServerData({
    timeRange: resolved?.timeRange,
    category: resolved?.category,
    status: resolved?.status,
  });

  return <AdminAnalyticsDashboard initialData={data} />;
}
