"use client";

import { PublicLink } from "@/components/layout/PublicLink";
import { MobileMenu } from "@/components/layout/MobileMenu";
import { useEffect, useRef, useState } from "react";
import type { Route } from "next";
import { ArrowUpRight, Menu, X } from "lucide-react";
import { BrandLogo } from "@/components/common/BrandLogo";
import { Button, buttonVariants } from "@/components/ui/button";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { EasyReadingToggle } from "@/components/common/EasyReadingToggle";
import { publicDestinations, publicLinks } from "@/lib/constants/public-navigation";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/types/domain";

export function Navbar() {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState("#home");
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [displayName, setDisplayName] = useState<string>("");
  const trigger = useRef<HTMLButtonElement>(null);
  const header = useRef<HTMLElement>(null);

  useEffect(() => {
    const targets = publicLinks.map(({ href }) => document.getElementById(href.slice(2)));
    function readSection() {
      const line = (header.current?.offsetHeight ?? 72) + 24;
      const current = targets.slice(1).find((target) => {
        if (!target) return false;
        const bounds = target.getBoundingClientRect();
        return bounds.top <= line && bounds.bottom > line;
      });
      setActive(current ? "#" + current.id : window.scrollY < 100 ? "#home" : "");
    }
    const desktop = window.matchMedia("(min-width: 64rem)");
    const closeOnDesktop = () => { if (desktop.matches) setOpen(false); };
    readSection();
    window.addEventListener("scroll", readSection, { passive: true });
    desktop.addEventListener("change", closeOnDesktop);
    return () => {
      window.removeEventListener("scroll", readSection);
      desktop.removeEventListener("change", closeOnDesktop);
    };
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    try {
      const supabase = createClient();
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user) {
          setUser(session.user);
          setDisplayName(
            session.user.user_metadata?.full_name ?? session.user.email?.split("@")[0] ?? "Citizen"
          );
          supabase
            .from("profiles")
            .select("role, full_name")
            .eq("id", session.user.id)
            .maybeSingle()
            .then(({ data: profile }) => {
              if (profile?.role) setUserRole(profile.role);
              if (profile?.full_name) setDisplayName(profile.full_name);
            });
        }
      });

      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        async (_event, session) => {
          if (session?.user) {
            setUser(session.user);
            setDisplayName(
              session.user.user_metadata?.full_name ?? session.user.email?.split("@")[0] ?? "Citizen"
            );
            const { data: profile } = await supabase
              .from("profiles")
              .select("role, full_name")
              .eq("id", session.user.id)
              .maybeSingle();
            if (profile?.role) setUserRole(profile.role);
            if (profile?.full_name) setDisplayName(profile.full_name);
          } else {
            setUser(null);
            setUserRole(null);
            setDisplayName("");
          }
        }
      );

      return () => {
        subscription.unsubscribe();
      };
    } catch {
      // Supabase unconfigured or connection error
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    function dismiss(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        trigger.current?.focus();
      }
    }
    function outside(event: PointerEvent) {
      if (event.target instanceof Node && !header.current?.contains(event.target)) setOpen(false);
    }
    document.addEventListener("keydown", dismiss);
    document.addEventListener("pointerdown", outside);
    return () => {
      document.removeEventListener("keydown", dismiss);
      document.removeEventListener("pointerdown", outside);
    };
  }, [open]);

  function navigate(href: string) {
    const hash = href.includes("#") ? href.slice(href.indexOf("#")) : "";
    setActive(hash);
    setOpen(false);
    if (open) {
      requestAnimationFrame(() => document.getElementById(hash.slice(1) || "home")?.focus({ preventScroll: true }));
    }
  }

  function navigationLinks() {
    return publicLinks.map(({ label, href }) => {
      const current = href === "/" + active;
      return (
        <PublicLink
          key={label}
          href={href}
          onClick={() => navigate(href)}
          aria-current={current ? "location" : undefined}
          className="public-nav-link text-sm font-medium transition-colors hover:text-primary"
        >
          {label}
        </PublicLink>
      );
    });
  }

  const actions = user ? (
    <>
      <EasyReadingToggle variant="ghost" size="sm" className="hidden sm:inline-flex" />
      <span className="text-xs font-semibold text-muted-foreground hidden xl:inline max-w-[120px] truncate">
        {displayName}
      </span>
      <PublicLink
        href={(userRole === "admin" ? "/admin" : "/dashboard") as Route}
        className={cn(buttonVariants({ variant: "outline", size: "sm" }), "text-xs font-medium")}
      >
        {userRole === "admin" ? "Admin Portal" : "Dashboard"}
      </PublicLink>
      <LogoutButton variant="ghost" size="sm" />
      <PublicLink
        href={publicDestinations.report}
        onClick={() => navigate(publicDestinations.report)}
        className={cn(
          buttonVariants({ variant: "primary", size: "sm" }),
          "gap-1.5 font-semibold shadow-xs hover:shadow-sm"
        )}
      >
        <span>Report an Issue</span>
        <ArrowUpRight className="size-3.5" aria-hidden="true" />
      </PublicLink>
    </>
  ) : (
    <>
      <EasyReadingToggle variant="ghost" size="sm" className="hidden sm:inline-flex" />
      <PublicLink
        href={publicDestinations.signIn}
        onClick={() => navigate(publicDestinations.signIn)}
        className={cn(buttonVariants({ variant: "ghost" }), "text-sm font-medium text-foreground")}
      >
        Sign In
      </PublicLink>
      <PublicLink
        href={publicDestinations.report}
        onClick={() => navigate(publicDestinations.report)}
        className={cn(
          buttonVariants({ variant: "primary" }),
          "gap-1.5 font-semibold shadow-xs hover:shadow-sm"
        )}
      >
        <span>Report an Issue</span>
        <ArrowUpRight className="size-4" aria-hidden="true" />
      </PublicLink>
    </>
  );

  return (
    <header
      ref={header}
      className="public-header sticky top-0 z-40 backdrop-blur-md bg-card/95 border-b border-border shadow-2xs transition-all duration-200"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
    >
      <div className="content-container flex min-h-18 items-center justify-between gap-3">
        <PublicLink
          href={publicDestinations.home}
          onClick={() => navigate(publicDestinations.home)}
          aria-label="CivicPulse home"
          className="focus-visible:ring-2 focus-visible:ring-primary rounded-md"
        >
          <BrandLogo />
        </PublicLink>

        <nav aria-label="Main navigation" className="hidden items-center gap-4 lg:flex xl:gap-7">
          {navigationLinks()}
        </nav>

        <div className="hidden items-center gap-2 lg:flex">{actions}</div>

        <div className="flex items-center gap-2 lg:hidden">
          <EasyReadingToggle variant="ghost" size="sm" />
          <Button
            ref={trigger}
            size="icon"
            variant="outline"
            aria-controls="mobile-navigation"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            onClick={() => setOpen(!open)}
          >
            {open ? <X className="size-5" aria-hidden="true" /> : <Menu className="size-5" aria-hidden="true" />}
          </Button>
        </div>
      </div>

      <MobileMenu open={open} actions={actions}>
        {navigationLinks()}
      </MobileMenu>
    </header>
  );
}
