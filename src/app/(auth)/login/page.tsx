import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { LoginForm } from "@/components/auth/LoginForm";
import { APP_NAME } from "@/lib/constants";

export const metadata: Metadata = {
  title: `Sign In | ${APP_NAME}`,
  description:
    "Sign in to CivicPulse to manage your civic reports and track neighborhood maintenance progress.",
};

export default function LoginPage() {
  return (
    <AuthLayout
      heading="Welcome Back"
      subheading="Sign in to CivicPulse to manage your reports and track community progress."
    >
      <Suspense fallback={<div className="h-64 animate-pulse rounded-lg bg-muted/40" />}>
        <LoginForm />
      </Suspense>
    </AuthLayout>
  );
}
