import type { PriorityBreakdown } from "@/types/priority";

export const REPORT_CATEGORIES = [
  "pothole",
  "garbage",
  "water_leakage",
  "streetlight",
  "drainage",
  "damaged_infrastructure",
  "other",
] as const;

export type ReportCategory = (typeof REPORT_CATEGORIES)[number];

export const REPORT_SEVERITIES = ["low", "medium", "high", "critical"] as const;

export type ReportSeverity = (typeof REPORT_SEVERITIES)[number];

export const REPORT_STATUSES = ["pending", "in_progress", "resolved"] as const;

export type ReportStatus = (typeof REPORT_STATUSES)[number];

export const REPORT_PUBLICATIONS = ["public", "private"] as const;

export type ReportPublication = (typeof REPORT_PUBLICATIONS)[number];

export const REPORT_VISIBILITIES = ["listed", "hidden"] as const;

export type ReportVisibility = (typeof REPORT_VISIBILITIES)[number];

export const REPORT_IMAGE_TYPES = ["before", "after"] as const;

export type ReportImageType = (typeof REPORT_IMAGE_TYPES)[number];

export const REPORT_SORT_OPTIONS = [
  "newest",
  "oldest",
  "priority_high",
  "priority_low",
] as const;

export type ReportSort = (typeof REPORT_SORT_OPTIONS)[number];

/**
 * Validated citizen input for creating a new civic complaint.
 */
export interface CreateReportInput {
  title: string;
  description: string;
  category: ReportCategory;
  latitude: number;
  longitude: number;
  image_path: string;
  severity?: ReportSeverity;
  publication?: ReportPublication;
  submission_key?: string;
}

/**
 * Standardized response payload returned upon successful complaint creation.
 */
export interface CreateReportResponseData {
  id: string;
  reference: string;
  title: string;
  description: string;
  category: ReportCategory;
  severity: ReportSeverity;
  status: ReportStatus;
  priority_score: number;
  latitude: number;
  longitude: number;
  image_count: number;
  image_path: string;
  department_id?: string | null;
  department?: {
    id: string;
    name: string;
  } | null;
  assignment_source?: "unassigned" | "automatic" | "manual";
  created_at: string;
}

/**
 * Pagination metadata included with list responses.
 */
export interface ReportPagination {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
  has_next_page: boolean;
  has_previous_page: boolean;
}

/**
 * Safe public complaint summary item for the public feed, discovery cards, and map markers.
 * Excludes user IDs, email, personal identifiers, and private notes.
 */
export interface PublicReportItem {
  id: string;
  reference: string;
  title: string;
  description?: string;
  category: ReportCategory;
  severity: ReportSeverity;
  status: ReportStatus;
  priority_score: number;
  latitude: number;
  longitude: number;
  department_name: string | null;
  image_count: number;
  image_path?: string;
  support_count?: number;
  created_at: string;
  updated_at: string;
}

/**
 * Report image metadata attached to a complaint.
 */
export interface ReportImageMetadata {
  id: string;
  storage_path: string;
  type: ReportImageType;
  created_at: string;
  signed_url?: string;
}

/**
 * Owner-visible personal complaint item for /my-reports.
 * Includes publication status, visibility, and attached draft/evidence metadata.
 */
export interface OwnerReportItem {
  id: string;
  reference: string;
  title: string;
  description: string;
  category: ReportCategory;
  severity: ReportSeverity;
  status: ReportStatus;
  priority_score: number;
  latitude: number;
  longitude: number;
  publication: ReportPublication;
  visibility: ReportVisibility;
  department_name: string | null;
  image_count: number;
  images: ReportImageMetadata[];
  created_at: string;
  updated_at: string;
}

/**
 * Detailed complaint object for /reports/[id].
 */
export interface ReportDetailItem {
  id: string;
  reference: string;
  title: string;
  description: string;
  category: ReportCategory;
  severity: ReportSeverity;
  status: ReportStatus;
  priority_score: number;
  latitude: number;
  longitude: number;
  publication?: ReportPublication;
  visibility?: ReportVisibility;
  is_owner: boolean;
  department: {
    id?: string;
    name: string;
    description?: string | null;
  } | null;
  images: ReportImageMetadata[];
  created_at: string;
  updated_at: string;
  resolved_at?: string | null;
  support_count?: number;
  current_user_supported?: boolean;
  can_support?: boolean;
  priority_breakdown?: PriorityBreakdown;
}

/**
 * Standardized pagination wrapper for report lists.
 */
export interface ReportListResponse<T = PublicReportItem | OwnerReportItem> {
  items: T[];
  pagination: ReportPagination;
}

/**
 * Structured query filter parameters parsed from URLSearchParams.
 */
export interface ReportQueryFilter {
  page?: number;
  limit?: number;
  category?: ReportCategory;
  status?: ReportStatus;
  severity?: ReportSeverity;
  sort?: ReportSort;
  search?: string;
  mine?: boolean;
  scope?: "admin";
}
