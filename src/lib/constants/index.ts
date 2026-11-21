import type { IssueCategory, IssueSeverity, ReportStatus, UserRole } from "@/types/domain";

export const APP_NAME = "CivicPulse";
export const APP_TAGLINE = "Report Smarter. Resolve Faster. Build Better Cities.";

export const ROUTES = {
  home: "/",
  login: "/login",
  register: "/register",
  dashboard: "/dashboard",
  report: "/report",
  map: "/map",
  myReports: "/my-reports",
  reportDetails: (id: string) => `/reports/${encodeURIComponent(id)}`,
  admin: "/admin",
  adminComplaints: "/admin/complaints",
} as const;

export const CATEGORY_LABELS = {
  pothole: "Pothole",
  garbage: "Garbage",
  water_leakage: "Water leakage",
  streetlight: "Streetlight",
  drainage: "Drainage",
  other: "Other",
} satisfies Record<IssueCategory, string>;

export const STATUS_LABELS = {
  pending: "Pending",
  in_progress: "In Progress",
  resolved: "Resolved",
} satisfies Record<ReportStatus, string>;

export const SEVERITY_LABELS = {
  low: "Low",
  medium: "Medium",
  high: "High",
  critical: "Critical",
} satisfies Record<IssueSeverity, string>;

export const ROLE_LABELS = {
  citizen: "Citizen",
  admin: "Admin",
} satisfies Record<UserRole, string>;

export const STATUS_COLORS = {
  pending: "var(--pending)",
  in_progress: "var(--in-progress)",
  resolved: "var(--resolved)",
} satisfies Record<ReportStatus, string>;

export const SEVERITY_COLORS = {
  low: "var(--muted-foreground)",
  medium: "var(--pending)",
  high: "var(--high)",
  critical: "var(--critical)",
} satisfies Record<IssueSeverity, string>;

export const IMAGE_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const MAX_IMAGE_BYTES = 2_000_000;
