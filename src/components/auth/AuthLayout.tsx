import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { BrandLogo } from "@/components/common/BrandLogo";
import { AuthBrandPanel } from "./AuthBrandPanel";

interface AuthLayoutProps {
  children: ReactNode;
  heading: string;
  subheading: string;
}

export function AuthLayout({ children, heading, subheading }: AuthLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      {/* Mobile / Tablet Header */}
      <header className="border-b bg-card lg:hidden">
        <div className="content-container flex h-16 items-center justify-between">
          <Link href="/" aria-label="CivicPulse home">
            <BrandLogo />
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-3.5" aria-hidden="true" />
            Home
          </Link>
        </div>
      </header>

      <main className="content-container py-8 sm:py-12 lg:py-16">
        <div className="grid min-h-[calc(100vh-8rem)] items-stretch gap-8 lg:grid-cols-[1.1fr_1fr] lg:gap-12">
          {/* Left Decorative Branding Column (Desktop) */}
          <AuthBrandPanel />

          {/* Right Form Column */}
          <div className="flex flex-col justify-center">
            <div className="mx-auto w-full max-w-md">
              <div className="mb-6 hidden items-center justify-between lg:flex">
                <Link
                  href="/"
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                >
                  <ArrowLeft className="size-4" aria-hidden="true" />
                  Back to Home
                </Link>
              </div>

              <div className="mb-6">
                <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                  {heading}
                </h1>
                <p className="mt-2 text-sm text-muted-foreground">{subheading}</p>
              </div>

              {children}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
