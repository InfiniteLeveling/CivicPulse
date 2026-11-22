import type { Metadata } from "next";
import { AdminDashboard } from "@/components/admin/AdminDashboard";
import { getAdminOverviewData } from "@/lib/api/stats";

export const metadata: Metadata = {
  title: "Admin Operations Dashboard · Overview | CivicPulse",
  description:
    "Administrative dashboard for civic operations, complaint status distribution, and municipal issue tracking.",
};

export default async function AdminPage({
  searchParams,
}: {
  searchParams?: Promise<{ empty?: string; forceError?: string }>;
}) {
  const resolvedParams = searchParams ? await searchParams : undefined;
  const empty = resolvedParams?.empty === "true";
  const forceError = resolvedParams?.forceError === "true";

  const initialData = await getAdminOverviewData({
    empty,
    forceError,
  });

  return <AdminDashboard initialData={initialData} />;
}
