import type { Metadata } from "next";
import { AdminDashboard } from "@/components/admin/AdminDashboard";
import { getAdminOverviewServerData } from "@/lib/reports/server-queries";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Admin Operations Dashboard · Overview | CivicPulse",
  description:
    "Administrative dashboard for civic operations, complaint status distribution, and municipal issue tracking.",
};

export default async function AdminPage({
  searchParams,
}: {
  searchParams?: Promise<{ empty?: string }>;
}) {
  const resolvedParams = searchParams ? await searchParams : undefined;
  const empty = resolvedParams?.empty === "true";

  const initialData = empty
    ? {
        stats: {
          total: 0,
          pending: 0,
          inProgress: 0,
          resolved: 0,
          criticalActive: 0,
          resolutionRate: null,
        },
        recentReports: [],
        isDemoData: false,
        lastRefreshedAt: new Date().toISOString(),
      }
    : await getAdminOverviewServerData();

  return <AdminDashboard initialData={initialData} />;
}
