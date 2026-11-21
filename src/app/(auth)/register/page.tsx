import type { Metadata } from "next";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { RegisterForm } from "@/components/auth/RegisterForm";
import { APP_NAME } from "@/lib/constants";

export const metadata: Metadata = {
  title: `Create Account | ${APP_NAME}`,
  description:
    "Join CivicPulse to report infrastructure problems and help build cleaner, safer communities.",
};

export default function RegisterPage() {
  return (
    <AuthLayout
      heading="Join CivicPulse"
      subheading="Create your account and help make your community cleaner, safer and better."
    >
      <RegisterForm />
    </AuthLayout>
  );
}
