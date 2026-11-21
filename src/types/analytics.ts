import type { ReportCategory, ReportStatus } from "@/types/report";
import type { AnalyticsGranularity } from "@/config/analytics";

/**
 * UTC Date range representation for analytics responses.
 */
export interface AnalyticsPeriod {
  start: string; // YYYY-MM-DD
  end: string; // YYYY-MM-DD
  timezone: "UTC";
}

/**
 * Response contract for GET /api/admin/analytics/overview
 */
export interface AnalyticsOverviewData {
  period: AnalyticsPeriod;
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

/**
 * Item in time-series trend aggregation.
 */
export interface AnalyticsTrendItem {
  period_start: string;
  created_count: number;
  resolved_count: number;
}

/**
 * Response contract for GET /api/admin/analytics/trends
 */
export interface AnalyticsTrendsData {
  period: AnalyticsPeriod;
  granularity: AnalyticsGranularity;
  total_buckets: number;
  buckets: AnalyticsTrendItem[];
}

/**
 * Distribution item by canonical complaint category.
 */
export interface AnalyticsCategoryItem {
  category: ReportCategory;
  count: number;
  percentage: number;
}

/**
 * Response contract for GET /api/admin/analytics/categories
 */
export interface AnalyticsCategoriesData {
  period: AnalyticsPeriod;
  total_created_in_period: number;
  categories: AnalyticsCategoryItem[];
}

/**
 * Workload distribution item by registered department.
 */
export interface AnalyticsDepartmentItem {
  department_id: string;
  department_name: string;
  pending_count: number;
  in_progress_count: number;
  active_count: number;
}

/**
 * Response contract for GET /api/admin/analytics/departments
 */
export interface AnalyticsDepartmentsData {
  workload_basis: "current_assignment";
  total_active_backlog: number;
  unassigned_active_count: number;
  departments: AnalyticsDepartmentItem[];
}

/**
 * Response contract for GET /api/admin/analytics/performance
 */
export interface AnalyticsPerformanceData {
  period: AnalyticsPeriod;
  resolved_in_period: number;
  resolution_duration_sample_size: number;
  average_resolution_hours: number | null;
  median_resolution_hours: number | null;
  current_active_backlog: number;
  active_reports_older_than_7_days: number;
}

/**
 * Item in operational priority rankings.
 */
export interface AnalyticsPriorityItem {
  id: string;
  title: string;
  category: ReportCategory;
  status: ReportStatus;
  priority_score: number;
  created_at: string;
  department_name: string | null;
}

/**
 * Response contract for GET /api/admin/analytics/priorities
 */
export interface AnalyticsPrioritiesData {
  active_count: number;
  average_active_priority: number | null;
  max_active_priority: number | null;
  top_priority_reports: AnalyticsPriorityItem[];
}
