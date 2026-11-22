import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ShieldAlert, ArrowLeft, LayoutDashboard } from "lucide-react";
import { getVerifiedUser } from "@/lib/auth/authorization";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { AdminShell } from "@/components/admin/AdminShell";
import { Button } from "@/components/ui/button";
import { LogoutButton } from "@/components/auth/LogoutButton";
import type { AdminUserSummary } from "@/types/domain";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  let adminUser: AdminUserSummary;

  if (isSupabaseConfigured()) {
    const auth = await getVerifiedUser();

    if (!auth) {
      redirect("/login?next=/admin");
    }

    if (auth.role !== "admin") {
      // Authenticated citizen attempting to access admin route: render forbidden state
      return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-12 text-center">
          <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-destructive/10 text-destructive mb-4">
            <ShieldAlert className="size-8" aria-hidden="true" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Access Restricted
          </h1>
          <p className="mt-2 max-w-md text-sm text-muted-foreground">
            Your account is authorized as a Citizen. Administrative functions require official
            municipal credentials.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Link href="/dashboard">
              <Button className="gap-2">
                <LayoutDashboard className="size-4" aria-hidden="true" />
                Go to Citizen Dashboard
              </Button>
            </Link>
            <Link href="/">
              <Button variant="outline" className="gap-2">
                <ArrowLeft className="size-4" aria-hidden="true" />
                Back to Home
              </Button>
            </Link>
            <LogoutButton variant="ghost" />
          </div>
        </div>
      );
    }

    adminUser = {
      name: auth.profile?.fullName || auth.user.email?.split("@")[0] || "Administrator",
      email: auth.user.email || "admin@civicpulse.gov",
      role: "admin",
    };
  } else {
    // Demo / offline developer mode fallback
    adminUser = {
      name: "Administrator",
      email: "admin@civicpulse.gov",
      role: "admin",
    };
  }

  return <AdminShell user={adminUser}>{children}</AdminShell>;
}
