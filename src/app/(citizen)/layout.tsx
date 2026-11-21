import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getVerifiedUser } from "@/lib/auth/authorization";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { CitizenSidebar } from "@/components/layout/CitizenSidebar";
import { CitizenTopbar } from "@/components/layout/CitizenTopbar";
import { CitizenMobileNav } from "@/components/layout/CitizenMobileNav";
import type { CitizenUserSummary } from "@/components/layout/CitizenProfileMenu";

export default async function CitizenLayout({ children }: { children: ReactNode }) {
  let userSummary: CitizenUserSummary = {
    name: "Jane Citizen",
    email: "citizen@example.org",
    role: "citizen",
  };

  if (isSupabaseConfigured()) {
    const auth = await getVerifiedUser();
    if (!auth) {
      redirect("/login?next=/dashboard");
    }

    userSummary = {
      name:
        auth.profile?.fullName ||
        auth.user.user_metadata?.full_name ||
        auth.user.email?.split("@")[0] ||
        "Citizen",
      email: auth.user.email ?? "citizen@example.org",
      role: auth.role === "admin" ? "admin" : "citizen",
    };
  }

  return (
    <div className="flex min-h-screen bg-muted/20 text-foreground">
      {/* Desktop Sidebar */}
      <CitizenSidebar user={userSummary} />

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col min-w-0 pb-20 md:pb-8">
        <CitizenTopbar user={userSummary} isDemoData={true} />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <CitizenMobileNav />
    </div>
  );
}
