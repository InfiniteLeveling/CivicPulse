import type { Metadata } from "next";
import { AdminComplaintsView } from "@/components/admin/complaints/AdminComplaintsView";
import { getAdminReports } from "@/lib/api/reports";
import type {
  GetAdminReportsParams,
  IssueCategory,
  IssueSeverity,
  ReportStatus,
} from "@/types/domain";

export const metadata: Metadata = {
  title: "Complaints Queue · Admin | CivicPulse",
  description:
    "Administrative complaints management queue, urgent triage, and multi-attribute operational filtering.",
};

export default async function AdminComplaintsPage({
  searchParams,
}: {
  searchParams?: Promise<{
    status?: string;
    category?: string;
    severity?: string;
    urgent?: string;
    q?: string;
    sort?: string;
    page?: string;
    empty?: string;
    forceError?: string;
  }>;
}) {
  const resolved = searchParams ? await searchParams : undefined;

  const params: GetAdminReportsParams = {
    status: (resolved?.status as ReportStatus | "all") || "all",
    category: (resolved?.category as IssueCategory | "all") || "all",
    severity: (resolved?.severity as IssueSeverity | "all") || "all",
    urgent: resolved?.urgent === "true",
    q: resolved?.q || "",
    sort:
      (resolved?.sort as
        | "priority"
        | "priority_asc"
        | "recent"
        | "oldest"
        | "most_supported") || "priority",
    page: resolved?.page ? parseInt(resolved.page, 10) : 1,
    pageSize: 10,
    empty: resolved?.empty === "true",
    forceError: resolved?.forceError === "true",
  };

  const initialData = await getAdminReports(params);

  return <AdminComplaintsView initialData={initialData} initialParams={params} />;
}
