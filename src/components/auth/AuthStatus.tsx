"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Route } from "next";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { LogoutButton } from "./LogoutButton";
import { UserCheck, ShieldCheck } from "lucide-react";
import type { UserRole } from "@/types/domain";

export function AuthStatus() {
  const [loading, setLoading] = useState(() => isSupabaseConfigured());
  const [userId, setUserId] = useState<string | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [name, setName] = useState<string>("");

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      return;
    }

    const supabase = createClient();

    async function loadUser() {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session?.user) {
          setUserId(session.user.id);
          setName(session.user.user_metadata?.full_name ?? session.user.email ?? "User");

          const { data: profile } = await supabase
            .from("profiles")
            .select("role, full_name")
            .eq("id", session.user.id)
            .maybeSingle();

          if (profile?.role) {
            setRole(profile.role);
          }
          if (profile?.full_name) {
            setName(profile.full_name);
          }
        } else {
          setUserId(null);
          setRole(null);
        }
      } catch {
        // Safe failover
      } finally {
        setLoading(false);
      }
    }

    loadUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        setUserId(session.user.id);
        setName(session.user.user_metadata?.full_name ?? session.user.email ?? "User");

        const { data: profile } = await supabase
          .from("profiles")
          .select("role, full_name")
          .eq("id", session.user.id)
          .maybeSingle();

        if (profile?.role) {
          setRole(profile.role);
        }
        if (profile?.full_name) {
          setName(profile.full_name);
        }
      } else {
        setUserId(null);
        setRole(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  if (loading) {
    return <div className="h-9 w-24 animate-pulse rounded-md bg-muted" />;
  }

  if (!userId) {
    return (
      <div className="flex items-center gap-2">
        <Link
          href="/login"
          className="rounded-md px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted"
        >
          Sign In
        </Link>
        <Link
          href="/register"
          className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary-hover"
        >
          Create Account
        </Link>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {role === "admin" ? (
          <ShieldCheck className="size-4 text-destructive" aria-hidden="true" />
        ) : (
          <UserCheck className="size-4 text-primary" aria-hidden="true" />
        )}
        <span className="font-medium text-foreground">{name}</span>
        {role && (
          <span className="rounded-sm bg-muted px-1.5 py-0.5 text-[10px] uppercase font-semibold text-muted-foreground">
            {role}
          </span>
        )}
      </div>
      <Link
        href={(role === "admin" ? "/admin" : "/dashboard") as Route}
        className="rounded-md border border-border px-2.5 py-1 text-xs font-medium hover:bg-muted"
      >
        {role === "admin" ? "Admin Portal" : "Dashboard"}
      </Link>
      <LogoutButton size="xs" variant="outline" />
    </div>
  );
}
