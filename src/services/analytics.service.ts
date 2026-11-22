import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { AuthenticatedUser } from "@/types/auth";
import type { ReportCategory, ReportStatus } from "@/types/report";
import type {
  AnalyticsCategoriesData,
  AnalyticsCategoryItem,
  AnalyticsDepartmentsData,
  AnalyticsDepartmentItem,
  AnalyticsOverviewData,
  AnalyticsPerformanceData,
  AnalyticsPrioritiesData,
  AnalyticsPriorityItem,
  AnalyticsTrendsData,
  AnalyticsTrendItem,
} from "@/types/analytics";
import { ANALYTICS_CONFIG } from "@/config/analytics";
import {
  calculateAverage,
  calculateCohortResolutionRate,
  calculateMedian,
  calculatePercentage,
  generateZeroFilledBuckets,
  resolveDateRange,
} from "@/utils/date-range";
import { assertAdmin } from "@/utils/permissions";
import { AppError } from "@/utils/app-error";
import { logger } from "@/utils/logger";
import type {
  AnalyticsDateRangeQuery,
  AnalyticsPrioritiesQuery,
  AnalyticsTrendsQuery,
} from "@/validators/analytics.schema";

interface RawOverviewRpcResult {
  all_time_total_reports: number;
  created_in_period: number;
  resolved_in_period: number;
  current_pending: number;
  current_in_progress: number;
  current_resolved: number;
  current_active_backlog: number;
  current_unassigned_active: number;
  creation_cohort_resolution_rate_percent: number | null;
}

interface RawPerformanceRpcResult {
  resolved_in_period: number;
  resolution_duration_sample_size: number;
  average_resolution_hours: number | null;
  median_resolution_hours: number | null;
  current_active_backlog: number;
  active_reports_older_than_7_days: number;
}

interface RawDepartmentRpcItem {
  department_id: string;
  department_name: string;
  pending_count: number;
  in_progress_count: number;
  active_count: number;
}

interface RawDepartmentRpcResult {
  workload_basis: "current_assignment";
  total_active_backlog: number;
  unassigned_active_count: number;
  departments: RawDepartmentRpcItem[];
}

/**
 * Retrieves high-level administrative KPI overview metrics.
 */
export async function getOverviewAnalytics(
  query: AnalyticsDateRangeQuery,
  caller: AuthenticatedUser,
  client?: SupabaseClient
): Promise<AnalyticsOverviewData> {
  assertAdmin(caller);

  const range = resolveDateRange(query.start, query.end);
  const supabase = client ?? (await createSupabaseServerClient());

  // Attempt optimized PostgreSQL Stored Procedure
  try {
    const { data: rpcData, error: rpcError } = await supabase.rpc(
      "civicpulse_get_analytics_overview",
      {
        p_start: range.startTimestamp,
        p_end: range.endExclusiveTimestamp,
      }
    );

    if (!rpcError && rpcData) {
      const parsed = rpcData as RawOverviewRpcResult;
      logger.info("analytics.retrieved", { status: 200 });
      return {
        period: {
          start: range.start,
          end: range.end,
          timezone: "UTC",
        },
        all_time_total_reports: Number(parsed.all_time_total_reports ?? 0),
        created_in_period: Number(parsed.created_in_period ?? 0),
        resolved_in_period: Number(parsed.resolved_in_period ?? 0),
        current_pending: Number(parsed.current_pending ?? 0),
        current_in_progress: Number(parsed.current_in_progress ?? 0),
        current_resolved: Number(parsed.current_resolved ?? 0),
        current_active_backlog: Number(parsed.current_active_backlog ?? 0),
        current_unassigned_active: Number(parsed.current_unassigned_active ?? 0),
        creation_cohort_resolution_rate_percent:
          parsed.creation_cohort_resolution_rate_percent !== null &&
          parsed.creation_cohort_resolution_rate_percent !== undefined
            ? Number(parsed.creation_cohort_resolution_rate_percent)
            : null,
      };
    }
  } catch {
    // Fall back to query builder for environments without RPC or mock clients
  }

  // Fallback: Supabase Query Builder
  const [
    allTimeResult,
    createdResult,
    resolvedResult,
    pendingResult,
    inProgressResult,
    currentResolvedResult,
    unassignedResult,
    cohortResolvedResult,
  ] = await Promise.all([
    supabase.from("reports").select("id", { count: "exact", head: true }),
    supabase
      .from("reports")
      .select("id", { count: "exact", head: true })
      .gte("created_at", range.startTimestamp)
      .lt("created_at", range.endExclusiveTimestamp),
    supabase
      .from("reports")
      .select("id", { count: "exact", head: true })
      .gte("resolved_at", range.startTimestamp)
      .lt("resolved_at", range.endExclusiveTimestamp)
      .eq("status", "resolved"),
    supabase.from("reports").select("id", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("reports").select("id", { count: "exact", head: true }).eq("status", "in_progress"),
    supabase.from("reports").select("id", { count: "exact", head: true }).eq("status", "resolved"),
    supabase
      .from("reports")
      .select("id", { count: "exact", head: true })
      .in("status", ["pending", "in_progress"])
      .is("department_id", null),
    supabase
      .from("reports")
      .select("id", { count: "exact", head: true })
      .gte("created_at", range.startTimestamp)
      .lt("created_at", range.endExclusiveTimestamp)
      .eq("status", "resolved"),
  ]);

  const allTimeTotal = allTimeResult.count ?? 0;
  const createdInPeriod = createdResult.count ?? 0;
  const resolvedInPeriod = resolvedResult.count ?? 0;
  const currentPending = pendingResult.count ?? 0;
  const currentInProgress = inProgressResult.count ?? 0;
  const currentResolved = currentResolvedResult.count ?? 0;
  const currentActiveBacklog = currentPending + currentInProgress;
  const currentUnassignedActive = unassignedResult.count ?? 0;
  const cohortResolved = cohortResolvedResult.count ?? 0;

  const cohortRate = calculateCohortResolutionRate(createdInPeriod, cohortResolved);

  logger.info("analytics.retrieved", { status: 200 });

  return {
    period: {
      start: range.start,
      end: range.end,
      timezone: "UTC",
    },
    all_time_total_reports: allTimeTotal,
    created_in_period: createdInPeriod,
    resolved_in_period: resolvedInPeriod,
    current_pending: currentPending,
    current_in_progress: currentInProgress,
    current_resolved: currentResolved,
    current_active_backlog: currentActiveBacklog,
    current_unassigned_active: currentUnassignedActive,
    creation_cohort_resolution_rate_percent: cohortRate,
  };
}

/**
 * Retrieves continuous time-series trend aggregation for created vs. resolved complaints.
 */
export async function getComplaintTrends(
  query: AnalyticsTrendsQuery,
  caller: AuthenticatedUser,
  client?: SupabaseClient
): Promise<AnalyticsTrendsData> {
  assertAdmin(caller);

  const range = resolveDateRange(query.start, query.end);
  const granularity = query.granularity;
  const supabase = client ?? (await createSupabaseServerClient());

  const buckets = generateZeroFilledBuckets(range.start, range.end, granularity);

  // Fetch created events in range
  const { data: createdData, error: createdError } = await supabase
    .from("reports")
    .select("created_at")
    .gte("created_at", range.startTimestamp)
    .lt("created_at", range.endExclusiveTimestamp);

  if (createdError) {
    logger.error("request.failed", { status: 500 });
    throw new AppError("INTERNAL_SERVER_ERROR", "Failed to retrieve complaint trend events", {
      cause: createdError,
    });
  }

  // Fetch resolved events in range
  const { data: resolvedData, error: resolvedError } = await supabase
    .from("reports")
    .select("resolved_at")
    .gte("resolved_at", range.startTimestamp)
    .lt("resolved_at", range.endExclusiveTimestamp)
    .eq("status", "resolved");

  if (resolvedError) {
    logger.error("request.failed", { status: 500 });
    throw new AppError("INTERNAL_SERVER_ERROR", "Failed to retrieve complaint trend resolution events", {
      cause: resolvedError,
    });
  }

  // Bucket matching helper
  function findBucketIndex(dateIsoStr: string): number {
    const dStr = dateIsoStr.slice(0, 10);
    if (granularity === "day") {
      return buckets.findIndex((b) => b.period_start === dStr);
    }
    // For week/month: locate corresponding bucket interval
    for (let i = buckets.length - 1; i >= 0; i--) {
      if (dStr >= buckets[i].period_start) {
        return i;
      }
    }
    return 0;
  }

  for (const row of createdData ?? []) {
    if (row.created_at) {
      const idx = findBucketIndex(row.created_at);
      if (idx >= 0 && idx < buckets.length) {
        buckets[idx].created_count += 1;
      }
    }
  }

  for (const row of resolvedData ?? []) {
    if (row.resolved_at) {
      const idx = findBucketIndex(row.resolved_at);
      if (idx >= 0 && idx < buckets.length) {
        buckets[idx].resolved_count += 1;
      }
    }
  }

  logger.info("analytics.retrieved", { status: 200 });

  return {
    period: {
      start: range.start,
      end: range.end,
      timezone: "UTC",
    },
    granularity,
    total_buckets: buckets.length,
    buckets: buckets as AnalyticsTrendItem[],
  };
}

/**
 * Retrieves distribution of complaints created in period grouped by canonical category.
 */
export async function getCategoryAnalytics(
  query: AnalyticsDateRangeQuery,
  caller: AuthenticatedUser,
  client?: SupabaseClient
): Promise<AnalyticsCategoriesData> {
  assertAdmin(caller);

  const range = resolveDateRange(query.start, query.end);
  const supabase = client ?? (await createSupabaseServerClient());

  const { data, error } = await supabase
    .from("reports")
    .select("category")
    .gte("created_at", range.startTimestamp)
    .lt("created_at", range.endExclusiveTimestamp);

  if (error) {
    logger.error("request.failed", { status: 500 });
    throw new AppError("INTERNAL_SERVER_ERROR", "Failed to retrieve category analytics", {
      cause: error,
    });
  }

  const categoryCounts: Record<ReportCategory, number> = {
    pothole: 0,
    garbage: 0,
    water_leakage: 0,
    streetlight: 0,
    drainage: 0,
    damaged_infrastructure: 0,
    other: 0,
  };

  let totalCount = 0;
  for (const row of data ?? []) {
    const cat = row.category as ReportCategory;
    if (cat && categoryCounts[cat] !== undefined) {
      categoryCounts[cat] += 1;
      totalCount += 1;
    }
  }

  const categories: AnalyticsCategoryItem[] = ANALYTICS_CONFIG.CANONICAL_CATEGORIES.map(
    (category) => {
      const count = categoryCounts[category];
      const percentage = calculatePercentage(count, totalCount);
      return {
        category,
        count,
        percentage,
      };
    }
  );

  // Sort categories descending by count, then canonical order
  categories.sort((a, b) => b.count - a.count);

  logger.info("analytics.retrieved", { status: 200 });

  return {
    period: {
      start: range.start,
      end: range.end,
      timezone: "UTC",
    },
    total_created_in_period: totalCount,
    categories,
  };
}

/**
 * Retrieves active department workload distribution plus unassigned complaint backlog.
 */
export async function getDepartmentAnalytics(
  caller: AuthenticatedUser,
  client?: SupabaseClient
): Promise<AnalyticsDepartmentsData> {
  assertAdmin(caller);

  const supabase = client ?? (await createSupabaseServerClient());

  // Attempt optimized PostgreSQL Stored Procedure
  try {
    const { data: rpcData, error: rpcError } = await supabase.rpc(
      "civicpulse_get_department_workload"
    );

    if (!rpcError && rpcData) {
      const parsed = rpcData as RawDepartmentRpcResult;
      logger.info("analytics.retrieved", { status: 200 });
      return {
        workload_basis: "current_assignment",
        total_active_backlog: Number(parsed.total_active_backlog ?? 0),
        unassigned_active_count: Number(parsed.unassigned_active_count ?? 0),
        departments: (parsed.departments ?? []).map((d) => ({
          department_id: d.department_id,
          department_name: d.department_name,
          pending_count: Number(d.pending_count ?? 0),
          in_progress_count: Number(d.in_progress_count ?? 0),
          active_count: Number(d.active_count ?? 0),
        })),
      };
    }
  } catch {
    // Fall back to query builder
  }

  // Fallback: Query Builder
  const [departmentsResult, activeReportsResult] = await Promise.all([
    supabase.from("departments").select("id, name").order("name", { ascending: true }),
    supabase
      .from("reports")
      .select("department_id, status")
      .in("status", ["pending", "in_progress"]),
  ]);

  if (departmentsResult.error) {
    logger.error("request.failed", { status: 500 });
    throw new AppError("INTERNAL_SERVER_ERROR", "Failed to retrieve department directory", {
      cause: departmentsResult.error,
    });
  }

  if (activeReportsResult.error) {
    logger.error("request.failed", { status: 500 });
    throw new AppError("INTERNAL_SERVER_ERROR", "Failed to retrieve active reports for workload analysis", {
      cause: activeReportsResult.error,
    });
  }

  const deptMap = new Map<
    string,
    { pending_count: number; in_progress_count: number }
  >();

  for (const dept of departmentsResult.data ?? []) {
    deptMap.set(dept.id, { pending_count: 0, in_progress_count: 0 });
  }

  let unassignedCount = 0;
  for (const report of activeReportsResult.data ?? []) {
    if (!report.department_id) {
      unassignedCount += 1;
      continue;
    }
    const entry = deptMap.get(report.department_id);
    if (entry) {
      if (report.status === "pending") entry.pending_count += 1;
      else if (report.status === "in_progress") entry.in_progress_count += 1;
    }
  }

  const departments: AnalyticsDepartmentItem[] = (departmentsResult.data ?? []).map((dept) => {
    const entry = deptMap.get(dept.id) ?? { pending_count: 0, in_progress_count: 0 };
    return {
      department_id: dept.id,
      department_name: dept.name,
      pending_count: entry.pending_count,
      in_progress_count: entry.in_progress_count,
      active_count: entry.pending_count + entry.in_progress_count,
    };
  });

  const totalActiveBacklog = (activeReportsResult.data ?? []).length;

  logger.info("analytics.retrieved", { status: 200 });

  return {
    workload_basis: "current_assignment",
    total_active_backlog: totalActiveBacklog,
    unassigned_active_count: unassignedCount,
    departments,
  };
}

/**
 * Retrieves resolution duration performance metrics (average, median, backlog aging).
 */
export async function getResolutionPerformance(
  query: AnalyticsDateRangeQuery,
  caller: AuthenticatedUser,
  client?: SupabaseClient
): Promise<AnalyticsPerformanceData> {
  assertAdmin(caller);

  const range = resolveDateRange(query.start, query.end);
  const supabase = client ?? (await createSupabaseServerClient());

  // Attempt optimized PostgreSQL Stored Procedure
  try {
    const { data: rpcData, error: rpcError } = await supabase.rpc(
      "civicpulse_get_analytics_performance",
      {
        p_start: range.startTimestamp,
        p_end: range.endExclusiveTimestamp,
      }
    );

    if (!rpcError && rpcData) {
      const parsed = rpcData as RawPerformanceRpcResult;
      logger.info("analytics.retrieved", { status: 200 });
      return {
        period: {
          start: range.start,
          end: range.end,
          timezone: "UTC",
        },
        resolved_in_period: Number(parsed.resolved_in_period ?? 0),
        resolution_duration_sample_size: Number(parsed.resolution_duration_sample_size ?? 0),
        average_resolution_hours:
          parsed.average_resolution_hours !== null && parsed.average_resolution_hours !== undefined
            ? Number(parsed.average_resolution_hours)
            : null,
        median_resolution_hours:
          parsed.median_resolution_hours !== null && parsed.median_resolution_hours !== undefined
            ? Number(parsed.median_resolution_hours)
            : null,
        current_active_backlog: Number(parsed.current_active_backlog ?? 0),
        active_reports_older_than_7_days: Number(parsed.active_reports_older_than_7_days ?? 0),
      };
    }
  } catch {
    // Fall back to query builder
  }

  // Fallback: Query Builder
  const [resolvedReportsResult, activeReportsResult] = await Promise.all([
    supabase
      .from("reports")
      .select("created_at, resolved_at")
      .gte("resolved_at", range.startTimestamp)
      .lt("resolved_at", range.endExclusiveTimestamp)
      .eq("status", "resolved"),
    supabase
      .from("reports")
      .select("created_at")
      .in("status", ["pending", "in_progress"]),
  ]);

  if (resolvedReportsResult.error) {
    logger.error("request.failed", { status: 500 });
    throw new AppError("INTERNAL_SERVER_ERROR", "Failed to retrieve resolution performance data", {
      cause: resolvedReportsResult.error,
    });
  }

  if (activeReportsResult.error) {
    logger.error("request.failed", { status: 500 });
    throw new AppError("INTERNAL_SERVER_ERROR", "Failed to retrieve active backlog aging data", {
      cause: activeReportsResult.error,
    });
  }

  const validDurationsHours: number[] = [];
  for (const report of resolvedReportsResult.data ?? []) {
    if (report.created_at && report.resolved_at) {
      const createdMs = new Date(report.created_at).getTime();
      const resolvedMs = new Date(report.resolved_at).getTime();
      if (resolvedMs >= createdMs) {
        const diffHours = (resolvedMs - createdMs) / 3_600_000;
        validDurationsHours.push(diffHours);
      }
    }
  }

  const avgHours = calculateAverage(validDurationsHours);
  const medianHours = calculateMedian(validDurationsHours);

  const sevenDaysAgoMs = Date.now() - ANALYTICS_CONFIG.AGING_BACKLOG_THRESHOLD_DAYS * 86_400_000;
  let agingCount = 0;
  for (const report of activeReportsResult.data ?? []) {
    if (report.created_at) {
      const createdMs = new Date(report.created_at).getTime();
      if (createdMs <= sevenDaysAgoMs) {
        agingCount += 1;
      }
    }
  }

  logger.info("analytics.retrieved", { status: 200 });

  return {
    period: {
      start: range.start,
      end: range.end,
      timezone: "UTC",
    },
    resolved_in_period: (resolvedReportsResult.data ?? []).length,
    resolution_duration_sample_size: validDurationsHours.length,
    average_resolution_hours: avgHours,
    median_resolution_hours: medianHours,
    current_active_backlog: (activeReportsResult.data ?? []).length,
    active_reports_older_than_7_days: agingCount,
  };
}

/**
 * Retrieves top active complaints ranked by priority score.
 */
export async function getPriorityInsights(
  query: AnalyticsPrioritiesQuery,
  caller: AuthenticatedUser,
  client?: SupabaseClient
): Promise<AnalyticsPrioritiesData> {
  assertAdmin(caller);

  const limit = query.limit ?? ANALYTICS_CONFIG.DEFAULT_PRIORITIES_LIMIT;
  const supabase = client ?? (await createSupabaseServerClient());

  const [topReportsResult, allActiveScoresResult] = await Promise.all([
    supabase
      .from("reports")
      .select("id, title, category, status, priority_score, created_at, departments(name)")
      .in("status", ["pending", "in_progress"])
      .order("priority_score", { ascending: false })
      .order("created_at", { ascending: true })
      .limit(limit),
    supabase
      .from("reports")
      .select("priority_score")
      .in("status", ["pending", "in_progress"]),
  ]);

  if (topReportsResult.error) {
    logger.error("request.failed", { status: 500 });
    throw new AppError("INTERNAL_SERVER_ERROR", "Failed to retrieve priority rankings", {
      cause: topReportsResult.error,
    });
  }

  if (allActiveScoresResult.error) {
    logger.error("request.failed", { status: 500 });
    throw new AppError("INTERNAL_SERVER_ERROR", "Failed to retrieve active priority scores", {
      cause: allActiveScoresResult.error,
    });
  }

  const scores: number[] = (allActiveScoresResult.data ?? []).map((r) =>
    Number(r.priority_score ?? 0)
  );

  const averageActivePriority = calculateAverage(scores);
  const maxActivePriority = scores.length > 0 ? Math.max(...scores) : null;

  interface ReportWithDeptName {
    id: string;
    title: string;
    category: string;
    status: string;
    priority_score: number;
    created_at: string;
    departments?: { name?: string | null } | null;
  }

  const topPriorityReports: AnalyticsPriorityItem[] = (
    (topReportsResult.data as unknown as ReportWithDeptName[]) ?? []
  ).map((row) => ({
    id: row.id,
    title: row.title,
    category: row.category as ReportCategory,
    status: row.status as ReportStatus,
    priority_score: Number(row.priority_score ?? 0),
    created_at: row.created_at,
    department_name: row.departments?.name ?? null,
  }));

  logger.info("analytics.retrieved", { status: 200 });

  return {
    active_count: scores.length,
    average_active_priority: averageActivePriority,
    max_active_priority: maxActivePriority,
    top_priority_reports: topPriorityReports,
  };
}
