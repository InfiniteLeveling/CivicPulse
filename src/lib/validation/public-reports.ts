import { z } from "zod";
import type {
  ComplaintSummary,
  GetPublicReportsParams,
  GetPublicReportsResult,
  IssueCategory,
} from "@/types/domain";

export const issueCategoryEnum = z.enum([
  "pothole",
  "garbage",
  "water_leakage",
  "streetlight",
  "drainage",
  "other",
]);

export const reportStatusEnum = z.enum(["pending", "in_progress", "resolved"]);

const CATEGORY_NAMES: Record<IssueCategory, string> = {
  pothole: "Pothole",
  garbage: "Garbage",
  water_leakage: "Water Leakage",
  streetlight: "Streetlight",
  drainage: "Drainage",
  other: "Other",
};

/**
 * Strict schema for public civic issue report summaries.
 * Defense-in-depth: strictly rejects private reports.
 */
export const publicReportSummarySchema = z.object({
  id: z.string().min(1, "Report ID is required"),
  reference: z.string().min(1, "Report reference is required"),
  title: z.string().min(1, "Title is required"),
  description: z.string(),
  category: issueCategoryEnum,
  severity: z.enum(["low", "medium", "high", "critical"]),
  severityReviewed: z.boolean(),
  status: reportStatusEnum,
  visibility: z.literal("public"), // Private reports are strictly rejected
  latitude: z
    .number()
    .finite("Latitude must be a finite number")
    .min(-90, "Latitude must be >= -90")
    .max(90, "Latitude must be <= 90"),
  longitude: z
    .number()
    .finite("Longitude must be a finite number")
    .min(-180, "Longitude must be >= -180")
    .max(180, "Longitude must be <= 180"),
  department: z
    .object({
      id: z.string(),
      name: z.string(),
    })
    .nullable()
    .optional(),
  supportCount: z.number().int().nonnegative().default(0),
  priority: z
    .object({
      score: z.number(),
      severityPoints: z.number(),
      supportPoints: z.number(),
      agePoints: z.number(),
      urgent: z.boolean(),
    })
    .optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  resolvedAt: z.string().nullable().optional(),
  imageUrl: z.string().nullable().optional(),
  viewerHasSupported: z.boolean().default(false),
});

export const publicReportsListSchema = z.array(publicReportSummarySchema);

/**
 * Validates whether a report has finite, valid geographical coordinates within world bounds.
 */
export function hasValidCoordinates(
  report: Pick<ComplaintSummary, "latitude" | "longitude">
): boolean {
  if (
    typeof report.latitude !== "number" ||
    typeof report.longitude !== "number"
  ) {
    return false;
  }
  if (!Number.isFinite(report.latitude) || !Number.isFinite(report.longitude)) {
    return false;
  }
  return (
    report.latitude >= -90 &&
    report.latitude <= 90 &&
    report.longitude >= -180 &&
    report.longitude <= 180
  );
}

/**
 * Filters a collection of civic reports for public display.
 * Strictly guarantees that private reports are NEVER returned.
 */
export function filterPublicReports(
  reports: ComplaintSummary[],
  params?: GetPublicReportsParams
): GetPublicReportsResult {
  // Defense-in-depth: Exclude all private or unverified reports
  let filtered = reports.filter((r) => r.visibility === "public");

  const statusFilter = params?.status ?? "all";
  const categoryFilter = params?.category ?? "all";
  const searchTerm = (params?.q ?? "").trim().toLowerCase();

  // Status filter
  if (statusFilter !== "all") {
    filtered = filtered.filter((r) => r.status === statusFilter);
  }

  // Category filter
  if (categoryFilter !== "all") {
    filtered = filtered.filter((r) => r.category === categoryFilter);
  }

  // Search filter (across title, reference, category, and description)
  if (searchTerm) {
    filtered = filtered.filter((r) => {
      const matchTitle = r.title.toLowerCase().includes(searchTerm);
      const matchRef = r.reference.toLowerCase().includes(searchTerm);
      const matchDesc = r.description.toLowerCase().includes(searchTerm);
      const categoryLabel = CATEGORY_NAMES[r.category]?.toLowerCase() ?? "";
      const matchCat = categoryLabel.includes(searchTerm);
      return matchTitle || matchRef || matchDesc || matchCat;
    });
  }

  return {
    items: filtered,
    total: filtered.length,
  };
}
