import type { Metadata } from "next";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminWorkspaceWelcome } from "@/components/admin/AdminWorkspaceWelcome";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck } from "lucide-react";
import { getVerifiedUser } from "@/lib/auth/authorization";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import type { AdminUserSummary } from "@/types/domain";

export const metadata: Metadata = {
  title: "Admin Portal · Overview | CivicPulse",
  description:
    "Administrative workspace for municipal operations, system oversight, and civic problem resolution.",
};

export default async function AdminPage() {
  let adminUser: AdminUserSummary;

  if (isSupabaseConfigured()) {
    const auth = await getVerifiedUser();
    adminUser = {
      name: auth?.profile?.fullName || auth?.user.email?.split("@")[0] || "Administrator",
      email: auth?.user.email || "admin@civicpulse.gov",
      role: "admin",
    };
  } else {
    adminUser = {
      name: "Administrator",
      email: "admin@civicpulse.gov",
      role: "admin",
    };
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Admin Workspace"
        description="Official municipal management console. Monitor system health, review operational roadmaps, and manage infrastructure triage."
        badge={
          <Badge variant="outline" className="text-xs border-primary/30 text-primary bg-primary/5 gap-1">
            <ShieldCheck className="size-3" aria-hidden="true" />
            <span>Municipal Console</span>
          </Badge>
        }
      />

      <AdminWorkspaceWelcome user={adminUser} />
    </div>
  );
}
