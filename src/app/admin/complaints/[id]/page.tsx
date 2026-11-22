import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getAdminReportDetails } from "@/lib/api/admin-reports";
import { ApiError } from "@/lib/api/client";
import { AdminComplaintDetails } from "@/components/admin/complaints/AdminComplaintDetails";

interface AdminComplaintDetailPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({
  params,
}: AdminComplaintDetailPageProps): Promise<Metadata> {
  const { id } = await params;

  try {
    const details = await getAdminReportDetails(id);
    return {
      title: `Triage: ${details.report.reference} - ${details.report.title} | Admin Portal`,
      description: `Administrative review, department triage, and status lifecycle for complaint ${details.report.reference}.`,
    };
  } catch {
    return {
      title: "Complaint Review | CivicPulse Admin",
      description: "Review and triage municipal infrastructure complaints.",
    };
  }
}

export default async function AdminComplaintDetailPage({
  params,
}: AdminComplaintDetailPageProps) {
  const { id } = await params;

  let details;
  try {
    details = await getAdminReportDetails(id);
  } catch (err: unknown) {
    if (err instanceof ApiError && err.status === 404) {
      notFound();
    }
    throw err;
  }

  if (!details || !details.report) {
    notFound();
  }

  return <AdminComplaintDetails initialDetails={details} />;
}
