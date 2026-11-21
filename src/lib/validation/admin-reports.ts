import { z } from "zod";
import type {
  ComplaintSummary,
  GetAdminReportsParams,
  GetAdminReportsResult,
} from "@/types/domain";

export const CATEGORY_NAMES: Record<string, string> = {
  pothole: "Pothole",
  garbage: "Garbage",
  water_leakage: "Water leakage",
  streetlight: "Streetlight",
  drainage: "Drainage",
  other: "Other",
};

export const adminReportSummarySchema = z.object({
  id: z.string().min(1),
  reference: z.string().min(1),
  title: z.string().min(1),
  description: z.string(),
  category: z.enum([
    "pothole",
    "garbage",
    "water_leakage",
    "streetlight",
    "drainage",
    "other",
  ]),
  severity: z.enum(["low", "medium", "high", "critical"]),
  severityReviewed: z.boolean(),
  status: z.enum(["pending", "in_progress", "resolved"]),
  visibility: z.enum(["public", "private"]),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  department: z
    .object({
      id: z.string(),
      name: z.string(),
    })
    .nullable(),
  supportCount: z.number().int().nonnegative(),
  priority: z.object({
    score: z.number().int().nonnegative(),
    severityPoints: z.number().int().nonnegative(),
    supportPoints: z.number().int().nonnegative(),
    agePoints: z.number().int().nonnegative(),
    urgent: z.boolean(),
  }),
  createdAt: z.string(),
  updatedAt: z.string(),
  resolvedAt: z.string().nullable(),
  imageUrl: z.string().nullable().optional(),
  viewerHasSupported: z.boolean().optional(),
});

export const adminReportListResponseSchema = z.object({
  items: z.array(adminReportSummarySchema),
  total: z.number().int().nonnegative().optional(),
  page: z.number().int().positive().optional(),
  pageSize: z.number().int().positive().optional(),
});

/**
 * Checks whether a report is considered urgent according to backend criteria.
 * Urgent rule: severity is critical OR priority score is 70 or higher.
 */
export function isReportUrgent(report: ComplaintSummary): boolean {
  return (
    report.priority?.urgent === true ||
    report.severity === "critical" ||
    (report.priority?.score ?? 0) >= 70
  );
}

/**
 * Filters, sorts (urgent-first queue by default), and paginates administrative complaints.
 * Strictly adheres to backend contracts and avoids fabricating scores or statuses.
 */
export function filterAdminReports(
  reports: ComplaintSummary[],
  params: GetAdminReportsParams = {}
): GetAdminReportsResult {
  const {
    status = "all",
    category = "all",
    severity = "all",
    urgent,
    q,
    sort = "priority",
    page = 1,
    pageSize = 10,
    empty = false,
  } = params;

  if (empty) {
    return {
      items: [],
      total: 0,
      page: 1,
      pageSize,
      totalPages: 1,
      urgentCount: 0,
      isDemoData: true,
    };
  }

  let filtered = [...reports];

  // 1. Status Filter
  if (status !== "all") {
    filtered = filtered.filter((r) => r.status === status);
  }

  // 2. Category Filter
  if (category !== "all") {
    filtered = filtered.filter((r) => r.category === category);
  }

  // 3. Severity Filter
  if (severity !== "all") {
    filtered = filtered.filter((r) => r.severity === severity);
  }

  // 4. Urgent Only Filter
  if (urgent === true) {
    filtered = filtered.filter((r) => isReportUrgent(r));
  }

  // 5. Search Filter (matches title, reference, or category label)
  if (q && q.trim()) {
    const term = q.trim().toLowerCase();
    filtered = filtered.filter((r) => {
      const matchTitle = r.title.toLowerCase().includes(term);
      const matchRef = r.reference.toLowerCase().includes(term);
      const catLabel = CATEGORY_NAMES[r.category]?.toLowerCase() ?? "";
      const matchCat = catLabel.includes(term);
      const matchDept = r.department?.name.toLowerCase().includes(term) ?? false;
      return matchTitle || matchRef || matchCat || matchDept;
    });
  }

  // Calculate total count of active urgent items in current filtered set
  const urgentCount = filtered.filter(
    (r) => isReportUrgent(r) && r.status !== "resolved"
  ).length;

  // 6. Sorting
  filtered.sort((a, b) => {
    switch (sort) {
      case "priority": {
        // Urgent unresolved complaints first
        const aUrgentActive = isReportUrgent(a) && a.status !== "resolved";
        const bUrgentActive = isReportUrgent(b) && b.status !== "resolved";
        if (aUrgentActive && !bUrgentActive) return -1;
        if (!aUrgentActive && bUrgentActive) return 1;

        // Unresolved complaints before resolved complaints
        const aUnresolved = a.status !== "resolved";
        const bUnresolved = b.status !== "resolved";
        if (aUnresolved && !bUnresolved) return -1;
        if (!aUnresolved && bUnresolved) return 1;

        // Highest priority score first
        const scoreDiff = (b.priority?.score ?? 0) - (a.priority?.score ?? 0);
        if (scoreDiff !== 0) return scoreDiff;

        // Stable tie-breaker: newest submission date first
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }

      case "priority_asc": {
        const scoreDiff = (a.priority?.score ?? 0) - (b.priority?.score ?? 0);
        if (scoreDiff !== 0) return scoreDiff;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }

      case "recent":
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();

      case "oldest":
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();

      case "most_supported": {
        const supportDiff = (b.supportCount ?? 0) - (a.supportCount ?? 0);
        if (supportDiff !== 0) return supportDiff;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }

      default:
        return 0;
    }
  });

  // 7. Pagination
  const total = filtered.length;
  const safePageSize = Math.max(1, pageSize);
  const totalPages = Math.max(1, Math.ceil(total / safePageSize));
  const currentPage = Math.min(Math.max(1, page), totalPages);

  const startIndex = (currentPage - 1) * safePageSize;
  const items = filtered.slice(startIndex, startIndex + safePageSize);

  return {
    items,
    total,
    page: currentPage,
    pageSize: safePageSize,
    totalPages,
    urgentCount,
    isDemoData: true,
  };
}
