import type { ReactNode } from "react";
import type { Route } from "next";
import { redirect } from "next/navigation";
import { getVerifiedUser } from "@/lib/auth/authorization";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { BrandLogo } from "@/components/common/BrandLogo";
import { LogoutButton } from "@/components/auth/LogoutButton";
import Link from "next/link";
import { ShieldAlert, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  if (isSupabaseConfigured()) {
    const auth = await getVerifiedUser();

    if (!auth) {
      redirect("/login?next=/admin");
    }

    if (auth.role !== "admin") {
      // Authenticated citizen attempting to access admin route: render forbidden state
      return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-12 text-center">
          <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <ShieldAlert className="size-8" aria-hidden="true" />
          </div>
          <h1 className="mt-4 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Access Restricted
          </h1>
          <p className="mt-2 max-w-md text-sm text-muted-foreground">
            Your account is authorized as a Citizen. Administrative functions require official
            department provisioning.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Link href="/">
              <Button variant="outline">
                <ArrowLeft className="size-4" aria-hidden="true" /> Back to Home
              </Button>
            </Link>
            <LogoutButton />
          </div>
        </div>
      );
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="content-container flex h-16 items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href={"/admin" as Route}>
              <BrandLogo />
            </Link>
            <span className="rounded-md bg-destructive/10 px-2 py-0.5 text-xs font-semibold text-destructive">
              Admin Portal
            </span>
          </div>
          <div className="flex items-center gap-3">
            <LogoutButton variant="outline" size="sm" />
          </div>
        </div>
      </header>
      <main className="content-container py-8">{children}</main>
    </div>
  );
}
