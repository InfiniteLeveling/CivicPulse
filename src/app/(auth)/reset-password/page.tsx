import type { Metadata } from "next";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";
import { APP_NAME } from "@/lib/constants";

export const metadata: Metadata = {
  title: `Reset Password | ${APP_NAME}`,
  description: "Set a new password for your CivicPulse account.",
};

export default function ResetPasswordPage() {
  return (
    <AuthLayout
      heading="Reset Password"
      subheading="Choose a new secure password for your CivicPulse account."
    >
      <ResetPasswordForm />
    </AuthLayout>
  );
}
