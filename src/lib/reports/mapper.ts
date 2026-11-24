import type {
  ComplaintSummary,
  IssueCategory,
  IssueSeverity,
  ReportStatus,
  ReportVisibility,
  StatusHistory,
} from "@/types/domain";
import {
  calculateAgePoints,
  calculateDaysPending,
  calculateVotePoints,
  resolveSeverityPoints,
} from "@/utils/priority";

const UI_CATEGORIES = new Set<IssueCategory>([
  "pothole",
  "garbage",
  "water_leakage",
  "streetlight",
  "drainage",
  "other",
]);

export function normalizeUiCategory(category: string | undefined | null): IssueCategory {
  if (category && UI_CATEGORIES.has(category as IssueCategory)) {
    return category as IssueCategory;
  }
  return "other";
}

export function normalizeUiSeverity(severity: string | undefined | null): IssueSeverity {
  if (severity === "low" || severity === "medium" || severity === "high" || severity === "critical") {
    return severity;
  }
  return "medium";
}

export function normalizeUiStatus(status: string | undefined | null): ReportStatus {
  if (status === "pending" || status === "in_progress" || status === "resolved") {
    return status;
  }
  return "pending";
}

export interface RawMappableReport {
  id: string;
  reference?: string;
  title: string;
  description?: string | null;
  category: string;
  severity?: string;
  status?: string;
  publication?: string;
  visibility?: string;
  latitude: number;
  longitude: number;
  priority_score?: number;
  department_id?: string | null;
  department_name?: string | null;
  department?: { id?: string; name?: string } | null;
  departments?: { id?: string; name?: string } | Array<{ id?: string; name?: string }> | null;
  supportCount?: number;
  support_count?: number;
  viewerHasSupported?: boolean;
  imageUrl?: string | null;
  createdAt?: string;
  created_at?: string;
  updatedAt?: string;
  updated_at?: string;
  resolvedAt?: string | null;
  resolved_at?: string | null;
}

export function toComplaintSummary(
  raw: RawMappableReport,
  overrides?: {
    supportCount?: number;
    viewerHasSupported?: boolean;
    imageUrl?: string | null;
    visibility?: ReportVisibility;
    department?: { id: string; name: string } | null;
  }
): ComplaintSummary {
  const severity = normalizeUiSeverity(raw.severity);
  const status = normalizeUiStatus(raw.status);
  const createdAt = raw.createdAt ?? raw.created_at ?? new Date().toISOString();
  const updatedAt = raw.updatedAt ?? raw.updated_at ?? createdAt;
  const resolvedAt = raw.resolvedAt ?? raw.resolved_at ?? null;
  const supportCount =
    overrides?.supportCount ?? raw.supportCount ?? raw.support_count ?? 1;

  const severityPoints = resolveSeverityPoints(severity).points;
  const supportPoints = calculateVotePoints(supportCount);
  const agePoints = calculateAgePoints(calculateDaysPending(createdAt, resolvedAt));
  const computedScore = Math.min(100, severityPoints + supportPoints + agePoints);
  const score =
    typeof raw.priority_score === "number" && raw.priority_score > 0
      ? raw.priority_score
      : computedScore;

  // Map DB `publication` ('public' | 'private') to frontend `visibility` ('public' | 'private')
  let visibility: ReportVisibility = overrides?.visibility ?? "public";
  if (!overrides?.visibility) {
    if (raw.publication === "private" || raw.visibility === "private") {
      visibility = "private";
    } else if (raw.publication === "public" || raw.visibility === "public") {
      visibility = "public";
    }
  }

  let department: { id: string; name: string } | null = overrides?.department ?? null;
  if (!department) {
    if (raw.department?.name) {
      department = {
        id: raw.department.id ?? raw.department_id ?? "",
        name: raw.department.name,
      };
    } else {
      const joinedDept = Array.isArray(raw.departments)
        ? raw.departments[0]
        : raw.departments;
      if (joinedDept?.name) {
        department = {
          id: joinedDept.id ?? raw.department_id ?? "",
          name: joinedDept.name,
        };
      } else if (raw.department_name) {
        department = {
          id: raw.department_id ?? "",
          name: raw.department_name,
        };
      }
    }
  }

  return {
    id: raw.id,
    reference: raw.reference ?? `CP-${raw.id}`,
    title: raw.title,
    description: raw.description ?? "",
    category: normalizeUiCategory(raw.category),
    severity,
    severityReviewed: severity !== "medium" || status !== "pending",
    status,
    visibility,
    latitude: Number(raw.latitude),
    longitude: Number(raw.longitude),
    department,
    supportCount,
    priority: {
      score,
      severityPoints,
      supportPoints,
      agePoints,
      urgent: severity === "critical" || score >= 70,
    },
    createdAt,
    updatedAt,
    resolvedAt,
    imageUrl: overrides?.imageUrl ?? raw.imageUrl ?? null,
    viewerHasSupported: overrides?.viewerHasSupported ?? raw.viewerHasSupported ?? false,
  };
}

export interface RawStatusHistoryItem {
  id: string;
  version?: number;
  previous_status?: string | null;
  status: string;
  notes?: string | null;
  created_at?: string;
  changed_at?: string;
}

export function toStatusHistoryList(items: RawStatusHistoryItem[]): StatusHistory[] {
  return items.map((item) => {
    const newStatus = normalizeUiStatus(item.status);
    const oldStatus = item.previous_status
      ? normalizeUiStatus(item.previous_status)
      : null;

    let eventType: StatusHistory["eventType"] = "status_changed";
    if (!oldStatus && (item.version === 1 || newStatus === "pending")) {
      eventType = "submitted";
    } else if (oldStatus === newStatus) {
      eventType = "triaged";
    }

    return {
      id: item.id,
      eventType,
      oldStatus,
      newStatus,
      remark: item.notes ?? null,
      createdAt: item.changed_at ?? item.created_at ?? new Date().toISOString(),
    };
  });
}
