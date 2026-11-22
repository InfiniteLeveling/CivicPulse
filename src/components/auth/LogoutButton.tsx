"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";

interface LogoutButtonProps {
  className?: string;
  variant?: "ghost" | "outline" | "default" | "secondary";
  size?: "default" | "sm" | "lg" | "xs";
}

export function LogoutButton({
  className,
  variant = "ghost",
  size = "sm",
}: LogoutButtonProps) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleLogout() {
    setLoading(true);
    try {
      if (isSupabaseConfigured()) {
        const supabase = createClient();
        const { error } = await supabase.auth.signOut();
        if (error) {
          toast.error("Logout failed", { description: error.message });
          setLoading(false);
          return;
        }
      }
      toast.success("Signed out successfully");
      router.push("/");
      router.refresh();
    } catch {
      toast.error("Logout failed", { description: "An unexpected error occurred." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      variant={variant}
      size={size}
      loading={loading}
      disabled={loading}
      onClick={handleLogout}
      className={className}
      aria-label="Sign out of CivicPulse"
    >
      <LogOut className="size-4" aria-hidden="true" />
      <span>Sign Out</span>
    </Button>
  );
}
