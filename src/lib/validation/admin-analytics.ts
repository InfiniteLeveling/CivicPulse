import { z } from "zod";
import type {
  ComplaintSummary,
  IssueCategory,
  IssueSeverity,
  ReportStatus,
} from "@/types/domain";
export const CATEGORY_LABELS: Record<IssueCategory, string> = {
  pothole: "Pothole",
  garbage: "Garbage",
  water_leakage: "Water Leakage",
  streetlight: "Streetlight",
  drainage: "Drainage",
  other: "Other",
};
import type { AdminStatsResponse } from "./admin-stats";

export const STATUS_COLORS: Record<ReportStatus, string> = {
  pending: "#D97706", // amber-600
  in_progress: "#2563EB", // blue-600
  resolved: "#16A34A", // emerald-600
};

export const SEVERITY_COLORS: Record<IssueSeverity, string> = {
  low: "#64748B", // slate-500
  medium: "#F59E0B", // amber-500
  high: "#EA580C", // orange-600
  critical: "#DC2626", // red-600
};

export interface StatusChartItem {
  status: ReportStatus;
  label: string;
  count: number;
  percentage: number;
  color: string;
}

export interface CategoryChartItem {
  category: IssueCategory;
  label: string;
  count: number;
  percentage: number;
}

export interface SeverityChartItem {
  severity: IssueSeverity;
  label: string;
  count: number;
  percentage: number;
  color: string;
}

export interface DepartmentWorkloadItem {
  departmentId: string;
  departmentName: string;
  total: number;
  pending: number;
  inProgress: number;
  resolved: number;
}

export interface TrendChartItem {
  date: string;
  label: string;
  count: number;
}

export interface ResolutionPerformanceMetrics {
  resolvedCount: number;
  resolutionRate: number | null;
  avgDurationDays: number | null;
}

export interface AdminAnalyticsData {
  total: number;
  pending: number;
  inProgress: number;
  resolved: number;
  criticalActive: number;
  resolutionRate: number | null;
  statusBreakdown: StatusChartItem[];
  categoryBreakdown: CategoryChartItem[];
  severityBreakdown: SeverityChartItem[];
  departmentWorkload: DepartmentWorkloadItem[];
  trends: TrendChartItem[];
  resolutionPerformance: ResolutionPerformanceMetrics;
  isDemoData: boolean;
  lastRefreshedAt: string;
}

export const adminAnalyticsSchema = z.object({
  total: z.number().int().nonnegative(),
  pending: z.number().int().nonnegative(),
  inProgress: z.number().int().nonnegative(),
  resolved: z.number().int().nonnegative(),
  criticalActive: z.number().int().nonnegative(),
  resolutionRate: z.number().min(0).max(100).nullable(),
  statusBreakdown: z.array(
    z.object({
      status: z.enum(["pending", "in_progress", "resolved"]),
      label: z.string(),
      count: z.number().int().nonnegative(),
      percentage: z.number().min(0).max(100),
      color: z.string(),
    })
  ),
  categoryBreakdown: z.array(
    z.object({
      category: z.enum(["pothole", "garbage", "water_leakage", "streetlight", "drainage", "other"]),
      label: z.string(),
      count: z.number().int().nonnegative(),
      percentage: z.number().min(0).max(100),
    })
  ),
  severityBreakdown: z.array(
    z.object({
      severity: z.enum(["low", "medium", "high", "critical"]),
      label: z.string(),
      count: z.number().int().nonnegative(),
      percentage: z.number().min(0).max(100),
      color: z.string(),
    })
  ),
  departmentWorkload: z.array(
    z.object({
      departmentId: z.string(),
      departmentName: z.string(),
      total: z.number().int().nonnegative(),
      pending: z.number().int().nonnegative(),
      inProgress: z.number().int().nonnegative(),
      resolved: z.number().int().nonnegative(),
    })
  ),
  trends: z.array(
    z.object({
      date: z.string(),
      label: z.string(),
      count: z.number().int().nonnegative(),
    })
  ),
  resolutionPerformance: z.object({
    resolvedCount: z.number().int().nonnegative(),
    resolutionRate: z.number().min(0).max(100).nullable(),
    avgDurationDays: z.number().min(0).nullable(),
  }),
  isDemoData: z.boolean(),
  lastRefreshedAt: z.string(),
});

/**
 * Calculates percentage safely guarding against division by zero.
 */
export function calculatePercentage(count: number, total: number): number {
  if (total <= 0 || !Number.isFinite(total) || !Number.isFinite(count) || count <= 0) {
    return 0;
  }
  const pct = (count / total) * 100;
  return Math.min(100, Math.max(0, Math.round(pct * 10) / 10));
}

/**
 * Aggregates complete analytics datasets from authorized reports and base stats.
 */
export function aggregateAnalyticsFromReports(
  reports: ComplaintSummary[],
  baseStats?: AdminStatsResponse
): AdminAnalyticsData {
  const total = baseStats ? baseStats.total : reports.length;
  let pending = 0;
  let inProgress = 0;
  let resolved = 0;
  let criticalActive = 0;

  // Category counts
  const categoryCounts: Record<IssueCategory, number> = {
    pothole: 0,
    garbage: 0,
    water_leakage: 0,
    streetlight: 0,
    drainage: 0,
    other: 0,
  };

  // Severity counts
  const severityCounts: Record<IssueSeverity, number> = {
    low: 0,
    medium: 0,
    high: 0,
    critical: 0,
  };

  // Department counts
  const departmentMap: Record<
    string,
    { id: string; name: string; total: number; pending: number; inProgress: number; resolved: number }
  > = {};

  // Date counts for trends
  const dateCounts: Record<string, number> = {};

  // Duration calculations
  let totalDurationMs = 0;
  let resolvedWithDurationCount = 0;

  for (const r of reports) {
    if (r.status === "pending") pending++;
    else if (r.status === "in_progress") inProgress++;
    else if (r.status === "resolved") resolved++;

    const isUrgent = r.priority?.urgent || r.severity === "critical" || (r.priority?.score ?? 0) >= 70;
    if (isUrgent && r.status !== "resolved") {
      criticalActive++;
    }

    if (r.category in categoryCounts) {
      categoryCounts[r.category]++;
    }

    if (r.severity in severityCounts) {
      severityCounts[r.severity]++;
    }

    // Department aggregation
    const deptId = r.department?.id || "unassigned";
    const deptName = r.department?.name || "Unassigned (Field Services)";
    if (!departmentMap[deptId]) {
      departmentMap[deptId] = {
        id: deptId,
        name: deptName,
        total: 0,
        pending: 0,
        inProgress: 0,
        resolved: 0,
      };
    }
    departmentMap[deptId].total++;
    if (r.status === "pending") departmentMap[deptId].pending++;
    else if (r.status === "in_progress") departmentMap[deptId].inProgress++;
    else if (r.status === "resolved") departmentMap[deptId].resolved++;

    // Time-series trend aggregation (YYYY-MM-DD)
    try {
      const d = new Date(r.createdAt);
      if (!isNaN(d.getTime())) {
        const dateKey = d.toISOString().split("T")[0];
        dateCounts[dateKey] = (dateCounts[dateKey] || 0) + 1;
      }
    } catch {
      // Ignore malformed dates
    }

    // Resolution duration calculation
    if (r.status === "resolved" && r.resolvedAt) {
      try {
        const start = new Date(r.createdAt).getTime();
        const end = new Date(r.resolvedAt).getTime();
        if (end >= start) {
          totalDurationMs += end - start;
          resolvedWithDurationCount++;
        }
      } catch {
        // Ignore invalid dates
      }
    }
  }

  // Use authoritative stats counts if provided and higher than local subset
  if (baseStats) {
    pending = baseStats.pending;
    inProgress = baseStats.inProgress;
    resolved = baseStats.resolved;
    if (typeof baseStats.criticalActive === "number") {
      criticalActive = baseStats.criticalActive;
    }
  }

  const resolutionRate =
    total > 0 ? Math.min(100, Math.max(0, Math.round((resolved / total) * 1000) / 10)) : null;

  const avgDurationDays =
    resolvedWithDurationCount > 0
      ? Math.round((totalDurationMs / resolvedWithDurationCount / (1000 * 60 * 60 * 24)) * 10) / 10
      : null;

  // Status breakdown array
  const statusBreakdown: StatusChartItem[] = [
    {
      status: "pending",
      label: "Pending Intake",
      count: pending,
      percentage: calculatePercentage(pending, total),
      color: STATUS_COLORS.pending,
    },
    {
      status: "in_progress",
      label: "In Progress",
      count: inProgress,
      percentage: calculatePercentage(inProgress, total),
      color: STATUS_COLORS.in_progress,
    },
    {
      status: "resolved",
      label: "Resolved",
      count: resolved,
      percentage: calculatePercentage(resolved, total),
      color: STATUS_COLORS.resolved,
    },
  ];

  // Category breakdown array (sorted by count desc)
  const categoryBreakdown: CategoryChartItem[] = (
    Object.keys(categoryCounts) as IssueCategory[]
  )
    .map((cat) => ({
      category: cat,
      label: CATEGORY_LABELS[cat] ?? cat,
      count: categoryCounts[cat],
      percentage: calculatePercentage(categoryCounts[cat], reports.length || total),
    }))
    .sort((a, b) => b.count - a.count);

  // Severity breakdown array
  const severityBreakdown: SeverityChartItem[] = (
    ["low", "medium", "high", "critical"] as IssueSeverity[]
  ).map((sev) => ({
    severity: sev,
    label: sev.charAt(0).toUpperCase() + sev.slice(1),
    count: severityCounts[sev],
    percentage: calculatePercentage(severityCounts[sev], reports.length || total),
    color: SEVERITY_COLORS[sev],
  }));

  // Department workload array (sorted by total desc)
  const departmentWorkload: DepartmentWorkloadItem[] = Object.values(departmentMap)
    .map((dept) => ({
      departmentId: dept.id,
      departmentName: dept.name,
      total: dept.total,
      pending: dept.pending,
      inProgress: dept.inProgress,
      resolved: dept.resolved,
    }))
    .sort((a, b) => b.total - a.total);

  // Trends array sorted chronologically
  const trends: TrendChartItem[] = Object.keys(dateCounts)
    .sort()
    .map((dateStr) => {
      let label = dateStr;
      try {
        const d = new Date(dateStr);
        label = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      } catch {
        // Fallback to raw string
      }
      return {
        date: dateStr,
        label,
        count: dateCounts[dateStr],
      };
    });

  return {
    total,
    pending,
    inProgress,
    resolved,
    criticalActive,
    resolutionRate,
    statusBreakdown,
    categoryBreakdown,
    severityBreakdown,
    departmentWorkload,
    trends,
    resolutionPerformance: {
      resolvedCount: resolved,
      resolutionRate,
      avgDurationDays,
    },
    isDemoData: true,
    lastRefreshedAt: new Date().toISOString(),
  };
}
