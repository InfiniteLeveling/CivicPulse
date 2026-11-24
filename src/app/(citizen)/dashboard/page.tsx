import type { Metadata } from "next";
import { getCitizenDashboardServerData } from "@/lib/reports/server-queries";
import { getVerifiedUser } from "@/lib/auth/authorization";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { DashboardWelcome } from "@/components/dashboard/DashboardWelcome";
import { DashboardStats } from "@/components/dashboard/DashboardStats";
import { DashboardQuickActions } from "@/components/dashboard/DashboardQuickActions";
import { RecentReports } from "@/components/dashboard/RecentReports";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Citizen Dashboard | CivicPulse",
  description:
    "Track civic complaints, monitor municipal resolution, and report neighborhood problems.",
};

interface DashboardPageProps {
  searchParams: Promise<{ empty?: string }>;
}

export default async function CitizenDashboardPage(props: DashboardPageProps) {
  const searchParams = await props.searchParams;
  const isEmptyView = searchParams?.empty === "true";

  let userName = "Citizen";
  if (isSupabaseConfigured()) {
    const auth = await getVerifiedUser();
    if (auth?.profile?.fullName) {
      userName = auth.profile.fullName;
    } else if (auth?.user?.user_metadata?.full_name) {
      userName = auth.user.user_metadata.full_name;
    } else if (auth?.user?.email) {
      userName = auth.user.email.split("@")[0];
    }
  }

  const { stats, reports } = isEmptyView
    ? {
        stats: { total: 0, pending: 0, inProgress: 0, resolved: 0, resolutionRate: null },
        reports: [],
      }
    : await getCitizenDashboardServerData();

  return (
    <div className="space-y-8 animate-in fade-in-50 duration-200">
      {/* Welcome Hero Banner */}
      <DashboardWelcome
        userName={userName}
        isDemoData={false}
        isEmptyView={isEmptyView}
      />

      {/* 4 Stat Cards */}
      <DashboardStats stats={stats} />

      {/* Quick Action Cards */}
      <DashboardQuickActions />

      {/* Recent Complaints List or Empty State */}
      <RecentReports reports={reports} />
    </div>
  );
}
