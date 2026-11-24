import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getReportDetailsServerData } from "@/lib/reports/server-queries";
import { AppError } from "@/utils/app-error";
import { AdminComplaintDetails } from "@/components/admin/complaints/AdminComplaintDetails";

export const dynamic = "force-dynamic";

interface AdminComplaintDetailPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({
  params,
}: AdminComplaintDetailPageProps): Promise<Metadata> {
  const { id } = await params;

  try {
    const details = await getReportDetailsServerData(id);
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
    details = await getReportDetailsServerData(id);
  } catch (err: unknown) {
    if (err instanceof AppError && (err.status === 404 || err.status === 422)) {
      notFound();
    }
    throw err;
  }

  if (!details || !details.report) {
    notFound();
  }

  return <AdminComplaintDetails initialDetails={details} />;
}
