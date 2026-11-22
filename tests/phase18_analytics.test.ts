import test from "node:test";
import assert from "node:assert/strict";

import { ANALYTICS_CONFIG } from "../src/config/analytics.ts";
import {
  isValidIsoDate,
  formatUtcIsoDate,
  resolveDateRange,
  generateZeroFilledBuckets,
  calculateCohortResolutionRate,
  calculatePercentage,
  calculateAverage,
  calculateMedian,
} from "../src/utils/date-range.ts";
import {
  analyticsDateRangeSchema,
  analyticsTrendsQuerySchema,
  analyticsPrioritiesQuerySchema,
} from "../src/validators/analytics.schema.ts";
import {
  getOverviewAnalytics,
  getComplaintTrends,
  getCategoryAnalytics,
  getDepartmentAnalytics,
  getResolutionPerformance,
  getPriorityInsights,
} from "../src/services/analytics.service.ts";
import { GET as getOverviewRoute } from "../src/app/api/admin/analytics/overview/route.ts";
import { GET as getTrendsRoute } from "../src/app/api/admin/analytics/trends/route.ts";
import { GET as getCategoriesRoute } from "../src/app/api/admin/analytics/categories/route.ts";
import { GET as getDepartmentsRoute } from "../src/app/api/admin/analytics/departments/route.ts";
import { GET as getPerformanceRoute } from "../src/app/api/admin/analytics/performance/route.ts";
import { GET as getPrioritiesRoute } from "../src/app/api/admin/analytics/priorities/route.ts";
import { successResponse, errorResponse } from "../src/utils/api-response.ts";
import { AppError } from "../src/utils/app-error.ts";
import { NextRequest } from "next/server";
import type { AuthenticatedUser } from "../src/types/auth.ts";
import type { SupabaseClient } from "@supabase/supabase-js";

// Test Identities
const ADMIN_USER: AuthenticatedUser = {
  id: "22222222-2222-4222-8222-222222222222",
  email: "admin@civicpulse.org",
  role: "admin",
};

const CITIZEN_USER: AuthenticatedUser = {
  id: "11111111-1111-4111-8111-111111111111",
  email: "citizen@example.com",
  role: "citizen",
};

const DEPT_ROADS = { id: "d1111111-1111-4111-8111-111111111111", name: "Road Maintenance" };
const DEPT_SANITATION = { id: "d2222222-2222-4222-8222-222222222222", name: "Sanitation" };

// ============================================================================
// Group 1: Date Range & Boundary Resolution Math
// ============================================================================

test("Analytics Date 01: isValidIsoDate accepts valid ISO dates and handles leap years", () => {
  assert.equal(isValidIsoDate("2026-11-21"), true);
  assert.equal(isValidIsoDate("2024-02-29"), true); // Leap year 2024
  assert.equal(isValidIsoDate("2025-02-29"), false); // Not a leap year
  assert.equal(isValidIsoDate("2026-02-31"), false); // Feb 31 does not exist
  assert.equal(isValidIsoDate("2026-04-31"), false); // Apr 31 does not exist
  assert.equal(isValidIsoDate("2026-13-01"), false); // Month 13
  assert.equal(isValidIsoDate("invalid-date"), false);
  assert.equal(isValidIsoDate("2026/11/21"), false);
});

test("Analytics Date 02: formatUtcIsoDate outputs exact YYYY-MM-DD in UTC", () => {
  const d = new Date(Date.UTC(2026, 10, 21, 23, 59, 59));
  assert.equal(formatUtcIsoDate(d), "2026-11-21");
});

test("Analytics Date 03: resolveDateRange defaults to 30 calendar days ending today in UTC", () => {
  const refDate = new Date(Date.UTC(2026, 10, 21, 12, 0, 0));
  const range = resolveDateRange(undefined, undefined, 366, refDate);

  assert.equal(range.end, "2026-11-21");
  assert.equal(range.start, "2026-10-23"); // 30 days inclusive (Oct 23 to Nov 21)
  assert.equal(range.daySpan, 30);
  assert.equal(range.timezone, "UTC");
  assert.equal(range.startTimestamp, "2026-10-23T00:00:00.000Z");
  assert.equal(range.endExclusiveTimestamp, "2026-11-22T00:00:00.000Z"); // Exclusive next day
});

test("Analytics Date 04: resolveDateRange parses custom date range with half-open UTC bounds", () => {
  const range = resolveDateRange("2026-01-01", "2026-01-10");
  assert.equal(range.start, "2026-01-01");
  assert.equal(range.end, "2026-01-10");
  assert.equal(range.daySpan, 10);
  assert.equal(range.startTimestamp, "2026-01-01T00:00:00.000Z");
  assert.equal(range.endExclusiveTimestamp, "2026-01-11T00:00:00.000Z");
});

test("Analytics Date 05: resolveDateRange rejects start > end with VALIDATION_ERROR", () => {
  assert.throws(
    () => resolveDateRange("2026-01-15", "2026-01-10"),
    (err: unknown) => {
      assert.ok(err instanceof AppError);
      assert.equal(err.code, "VALIDATION_ERROR");
      assert.match(err.message, /must not be chronologically after/);
      return true;
    }
  );
});

test("Analytics Date 06: resolveDateRange rejects date span exceeding maxDays limit (366 days)", () => {
  assert.throws(
    () => resolveDateRange("2025-01-01", "2026-01-10", 366), // 375 days
    (err: unknown) => {
      assert.ok(err instanceof AppError);
      assert.equal(err.code, "VALIDATION_ERROR");
      assert.match(err.message, /exceeds maximum allowable range/);
      return true;
    }
  );
});

// ============================================================================
// Group 2: Mathematical Aggregations & Division-by-Zero Safety
// ============================================================================

test("Analytics Math 01: calculateCohortResolutionRate returns null for 0 denominator", () => {
  assert.equal(calculateCohortResolutionRate(0, 0), null);
  assert.equal(calculateCohortResolutionRate(0, 5), null);
  assert.equal(calculateCohortResolutionRate(-1, 0), null);
});

test("Analytics Math 02: calculateCohortResolutionRate computes rounded percentage", () => {
  assert.equal(calculateCohortResolutionRate(10, 5), 50);
  assert.equal(calculateCohortResolutionRate(3, 1), 33.33);
  assert.equal(calculateCohortResolutionRate(7, 2), 28.57);
  assert.equal(calculateCohortResolutionRate(100, 100), 100);
});

test("Analytics Math 03: calculatePercentage handles zero totals and normal rounding", () => {
  assert.equal(calculatePercentage(0, 0), 0);
  assert.equal(calculatePercentage(5, 0), 0);
  assert.equal(calculatePercentage(25, 100), 25);
  assert.equal(calculatePercentage(1, 3), 33.33);
  assert.equal(calculatePercentage(2, 3), 66.67);
});

test("Analytics Math 04: calculateAverage handles empty sets and normal arithmetic mean", () => {
  assert.equal(calculateAverage([]), null);
  assert.equal(calculateAverage([10, 20, 30]), 20);
  assert.equal(calculateAverage([10, 15]), 12.5);
  assert.equal(calculateAverage([1, 2, 4]), 2.33);
});

test("Analytics Math 05: calculateMedian handles odd and even count arrays", () => {
  assert.equal(calculateMedian([]), null);
  // Odd length
  assert.equal(calculateMedian([5]), 5);
  assert.equal(calculateMedian([10, 30, 20]), 20);
  assert.equal(calculateMedian([1, 100, 50, 20, 10]), 20);
  // Even length: average of two middle elements
  assert.equal(calculateMedian([10, 20, 30, 40]), 25);
  assert.equal(calculateMedian([10, 20]), 15);
  assert.equal(calculateMedian([5, 15, 25, 30]), 20);
});

// ============================================================================
// Group 3: Continuous Zero-Filled Time Buckets
// ============================================================================

test("Analytics Buckets 01: generateZeroFilledBuckets creates continuous daily buckets", () => {
  const buckets = generateZeroFilledBuckets("2026-05-01", "2026-05-05", "day");
  assert.equal(buckets.length, 5);
  assert.equal(buckets[0].period_start, "2026-05-01");
  assert.equal(buckets[1].period_start, "2026-05-02");
  assert.equal(buckets[2].period_start, "2026-05-03");
  assert.equal(buckets[3].period_start, "2026-05-04");
  assert.equal(buckets[4].period_start, "2026-05-05");
  assert.equal(buckets[0].created_count, 0);
  assert.equal(buckets[0].resolved_count, 0);
});

test("Analytics Buckets 02: generateZeroFilledBuckets creates weekly and monthly buckets", () => {
  const weekly = generateZeroFilledBuckets("2026-01-01", "2026-01-22", "week");
  assert.ok(weekly.length >= 3);
  assert.equal(weekly[0].period_start, "2026-01-01");

  const monthly = generateZeroFilledBuckets("2026-01-01", "2026-03-15", "month");
  assert.equal(monthly.length, 3);
  assert.equal(monthly[0].period_start, "2026-01-01");
  assert.equal(monthly[1].period_start, "2026-02-01");
  assert.equal(monthly[2].period_start, "2026-03-01");
});

// ============================================================================
// Group 4: Zod Validation & Schema Defense
// ============================================================================

test("Analytics Schema 01: analyticsDateRangeSchema accepts valid date strings", () => {
  const res = analyticsDateRangeSchema.safeParse({
    start: "2026-01-01",
    end: "2026-01-31",
  });
  assert.equal(res.success, true);
});

test("Analytics Schema 02: analyticsDateRangeSchema rejects invalid dates and injected fields", () => {
  const badDate = analyticsDateRangeSchema.safeParse({ start: "invalid-date" });
  assert.equal(badDate.success, false);

  const injected = analyticsDateRangeSchema.safeParse({
    start: "2026-01-01",
    role: "admin", // forbidden injected field
  });
  assert.equal(injected.success, false);
});

test("Analytics Schema 03: analyticsTrendsQuerySchema validates granularity", () => {
  const valid = analyticsTrendsQuerySchema.safeParse({
    start: "2026-01-01",
    end: "2026-01-10",
    granularity: "week",
  });
  assert.equal(valid.success, true);
  if (valid.success) {
    assert.equal(valid.data.granularity, "week");
  }

  const defaultGran = analyticsTrendsQuerySchema.safeParse({
    start: "2026-01-01",
  });
  assert.equal(defaultGran.success, true);
  if (defaultGran.success) {
    assert.equal(defaultGran.data.granularity, "day");
  }

  const badGran = analyticsTrendsQuerySchema.safeParse({
    granularity: "hourly",
  });
  assert.equal(badGran.success, false);
});

test("Analytics Schema 04: analyticsPrioritiesQuerySchema bounds limit parameter (1 to 20)", () => {
  const valid = analyticsPrioritiesQuerySchema.safeParse({ limit: "10" });
  assert.equal(valid.success, true);
  if (valid.success) {
    assert.equal(valid.data.limit, 10);
  }

  const defaultLimit = analyticsPrioritiesQuerySchema.safeParse({});
  assert.equal(defaultLimit.success, true);
  if (defaultLimit.success) {
    assert.equal(defaultLimit.data.limit, ANALYTICS_CONFIG.DEFAULT_PRIORITIES_LIMIT);
  }

  const tooLow = analyticsPrioritiesQuerySchema.safeParse({ limit: "0" });
  assert.equal(tooLow.success, false);

  const tooHigh = analyticsPrioritiesQuerySchema.safeParse({ limit: "21" });
  assert.equal(tooHigh.success, false);
});

// ============================================================================
// Group 5: Access Control & RBAC Enforcement
// ============================================================================

test("Analytics RBAC 01: Citizen caller is rejected with HTTP 403 FORBIDDEN on all endpoints", async () => {
  await assert.rejects(
    () => getOverviewAnalytics({}, CITIZEN_USER),
    (err: unknown) => {
      assert.ok(err instanceof AppError);
      assert.equal(err.code, "FORBIDDEN");
      assert.match(err.message, /Administrative privileges required/);
      return true;
    }
  );

  await assert.rejects(
    () => getComplaintTrends({ granularity: "day" }, CITIZEN_USER),
    (err: unknown) => {
      assert.ok(err instanceof AppError);
      assert.equal(err.code, "FORBIDDEN");
      return true;
    }
  );

  await assert.rejects(
    () => getCategoryAnalytics({}, CITIZEN_USER),
    (err: unknown) => {
      assert.ok(err instanceof AppError);
      assert.equal(err.code, "FORBIDDEN");
      return true;
    }
  );

  await assert.rejects(
    () => getDepartmentAnalytics(CITIZEN_USER),
    (err: unknown) => {
      assert.ok(err instanceof AppError);
      assert.equal(err.code, "FORBIDDEN");
      return true;
    }
  );

  await assert.rejects(
    () => getResolutionPerformance({}, CITIZEN_USER),
    (err: unknown) => {
      assert.ok(err instanceof AppError);
      assert.equal(err.code, "FORBIDDEN");
      return true;
    }
  );

  await assert.rejects(
    () => getPriorityInsights({ limit: 5 }, CITIZEN_USER),
    (err: unknown) => {
      assert.ok(err instanceof AppError);
      assert.equal(err.code, "FORBIDDEN");
      return true;
    }
  );
});

// ============================================================================
// Group 6: Service Integration: Overview Analytics
// ============================================================================

test("Analytics Overview 01: getOverviewAnalytics via RPC returns structured data", async () => {
  const mockRpcClient = {
    rpc: async (func: string) => {
      if (func === "civicpulse_get_analytics_overview") {
        return {
          data: {
            all_time_total_reports: 120,
            created_in_period: 45,
            resolved_in_period: 30,
            current_pending: 15,
            current_in_progress: 25,
            current_resolved: 80,
            current_active_backlog: 40,
            current_unassigned_active: 8,
            creation_cohort_resolution_rate_percent: 66.67,
          },
          error: null,
        };
      }
      return { data: null, error: new Error("Unknown function") };
    },
  } as unknown as SupabaseClient;

  const result = await getOverviewAnalytics(
    { start: "2026-11-01", end: "2026-11-10" },
    ADMIN_USER,
    mockRpcClient
  );

  assert.equal(result.all_time_total_reports, 120);
  assert.equal(result.created_in_period, 45);
  assert.equal(result.resolved_in_period, 30);
  assert.equal(result.current_pending, 15);
  assert.equal(result.current_in_progress, 25);
  assert.equal(result.current_resolved, 80);
  assert.equal(result.current_active_backlog, 40);
  assert.equal(result.current_unassigned_active, 8);
  assert.equal(result.creation_cohort_resolution_rate_percent, 66.67);
  assert.equal(result.period.start, "2026-11-01");
  assert.equal(result.period.end, "2026-11-10");
});

test("Analytics Overview 02: getOverviewAnalytics fallback calculation on query builder", async () => {
  const stubClient = {
    rpc: async () => ({ data: null, error: new Error("RPC not found") }),
    from: (table: string) => {
      assert.equal(table, "reports");
      const builder: Record<string, unknown> = {
        select: (_cols: string, opts?: { count?: string }) => {
          if (opts?.count === "exact") {
            // return builder to chain
            return builder;
          }
          return builder;
        },
        gte: () => builder,
        lt: () => builder,
        eq: () => Promise.resolve({ count: 12, error: null }),
        in: () => builder,
        is: () => Promise.resolve({ count: 3, error: null }),
      };
      // For plain calls like allTimeResult
      builder.then = (resolve: (v: unknown) => void) => resolve({ count: 50, error: null });
      return builder;
    },
  } as unknown as SupabaseClient;

  const result = await getOverviewAnalytics(
    { start: "2026-11-01", end: "2026-11-05" },
    ADMIN_USER,
    stubClient
  );

  assert.ok(result.all_time_total_reports >= 0);
  assert.equal(result.period.start, "2026-11-01");
  assert.equal(result.period.end, "2026-11-05");
});

// ============================================================================
// Group 7: Service Integration: Complaint Trends
// ============================================================================

test("Analytics Trends 01: getComplaintTrends populates zero-filled buckets with created & resolved counts", async () => {
  const mockCreated = [
    { created_at: "2026-11-01T10:00:00Z" },
    { created_at: "2026-11-01T14:00:00Z" },
    { created_at: "2026-11-03T09:00:00Z" },
  ];

  const mockResolved = [
    { resolved_at: "2026-11-02T16:00:00Z" },
    { resolved_at: "2026-11-03T11:00:00Z" },
  ];

  const stubClient = {
    from: () => {
      let isResolvedQuery = false;
      const builder: Record<string, unknown> = {
        select: (cols: string) => {
          if (cols.includes("resolved_at")) isResolvedQuery = true;
          return builder;
        },
        gte: () => builder,
        lt: () => builder,
        eq: () => Promise.resolve({ data: mockResolved, error: null }),
      };
      builder.then = (resolve: (v: unknown) => void) => {
        if (isResolvedQuery) {
          resolve({ data: mockResolved, error: null });
        } else {
          resolve({ data: mockCreated, error: null });
        }
      };
      return builder;
    },
  } as unknown as SupabaseClient;

  const trends = await getComplaintTrends(
    { start: "2026-11-01", end: "2026-11-03", granularity: "day" },
    ADMIN_USER,
    stubClient
  );

  assert.equal(trends.total_buckets, 3);
  assert.equal(trends.granularity, "day");
  // Day 1 (Nov 1): 2 created, 0 resolved
  assert.equal(trends.buckets[0].period_start, "2026-11-01");
  assert.equal(trends.buckets[0].created_count, 2);
  assert.equal(trends.buckets[0].resolved_count, 0);

  // Day 2 (Nov 2): 0 created (zero-filled), 1 resolved
  assert.equal(trends.buckets[1].period_start, "2026-11-02");
  assert.equal(trends.buckets[1].created_count, 0);
  assert.equal(trends.buckets[1].resolved_count, 1);

  // Day 3 (Nov 3): 1 created, 1 resolved
  assert.equal(trends.buckets[2].period_start, "2026-11-03");
  assert.equal(trends.buckets[2].created_count, 1);
  assert.equal(trends.buckets[2].resolved_count, 1);
});

// ============================================================================
// Group 8: Service Integration: Category Distribution
// ============================================================================

test("Analytics Categories 01: getCategoryAnalytics accurately groups counts and percentages", async () => {
  const mockCategories = [
    { category: "pothole" },
    { category: "pothole" },
    { category: "pothole" },
    { category: "garbage" },
  ];

  const stubClient = {
    from: () => {
      const builder: Record<string, unknown> = {
        select: () => builder,
        gte: () => builder,
        lt: () => Promise.resolve({ data: mockCategories, error: null }),
      };
      return builder;
    },
  } as unknown as SupabaseClient;

  const result = await getCategoryAnalytics(
    { start: "2026-11-01", end: "2026-11-05" },
    ADMIN_USER,
    stubClient
  );

  assert.equal(result.total_created_in_period, 4);
  assert.equal(result.categories.length, 7); // all 7 canonical categories

  const potholeItem = result.categories.find((c) => c.category === "pothole");
  assert.ok(potholeItem);
  assert.equal(potholeItem.count, 3);
  assert.equal(potholeItem.percentage, 75); // 3 / 4 = 75%

  const garbageItem = result.categories.find((c) => c.category === "garbage");
  assert.ok(garbageItem);
  assert.equal(garbageItem.count, 1);
  assert.equal(garbageItem.percentage, 25); // 1 / 4 = 25%

  const streetlightItem = result.categories.find((c) => c.category === "streetlight");
  assert.ok(streetlightItem);
  assert.equal(streetlightItem.count, 0);
  assert.equal(streetlightItem.percentage, 0);
});

test("Analytics Categories 02: getCategoryAnalytics handles 0 complaints without division errors", async () => {
  const stubClient = {
    from: () => {
      const builder: Record<string, unknown> = {
        select: () => builder,
        gte: () => builder,
        lt: () => Promise.resolve({ data: [], error: null }),
      };
      return builder;
    },
  } as unknown as SupabaseClient;

  const result = await getCategoryAnalytics(
    { start: "2026-11-01", end: "2026-11-05" },
    ADMIN_USER,
    stubClient
  );

  assert.equal(result.total_created_in_period, 0);
  for (const cat of result.categories) {
    assert.equal(cat.count, 0);
    assert.equal(cat.percentage, 0);
  }
});

// ============================================================================
// Group 9: Service Integration: Department Workload
// ============================================================================

test("Analytics Departments 01: getDepartmentAnalytics via RPC returns workload breakdown", async () => {
  const mockRpcClient = {
    rpc: async (func: string) => {
      if (func === "civicpulse_get_department_workload") {
        return {
          data: {
            workload_basis: "current_assignment",
            total_active_backlog: 15,
            unassigned_active_count: 5,
            departments: [
              {
                department_id: DEPT_ROADS.id,
                department_name: DEPT_ROADS.name,
                pending_count: 4,
                in_progress_count: 6,
                active_count: 10,
              },
            ],
          },
          error: null,
        };
      }
      return { data: null, error: new Error("Unknown function") };
    },
  } as unknown as SupabaseClient;

  const result = await getDepartmentAnalytics(ADMIN_USER, mockRpcClient);

  assert.equal(result.workload_basis, "current_assignment");
  assert.equal(result.total_active_backlog, 15);
  assert.equal(result.unassigned_active_count, 5);
  assert.equal(result.departments.length, 1);
  assert.equal(result.departments[0].department_name, "Road Maintenance");
  assert.equal(result.departments[0].active_count, 10);
});

test("Analytics Departments 02: getDepartmentAnalytics fallback query builder combines departments and unassigned", async () => {
  const stubClient = {
    rpc: async () => ({ data: null, error: new Error("RPC not found") }),
    from: (table: string) => {
      assert.ok(table);
      const builder: Record<string, unknown> = {
        select: () => builder,
        order: () => Promise.resolve({ data: [DEPT_ROADS, DEPT_SANITATION], error: null }),
        in: () =>
          Promise.resolve({
            data: [
              { department_id: DEPT_ROADS.id, status: "pending" },
              { department_id: DEPT_ROADS.id, status: "in_progress" },
              { department_id: null, status: "pending" }, // unassigned
            ],
            error: null,
          }),
      };
      return builder;
    },
  } as unknown as SupabaseClient;

  const result = await getDepartmentAnalytics(ADMIN_USER, stubClient);

  assert.equal(result.total_active_backlog, 3);
  assert.equal(result.unassigned_active_count, 1);
  assert.equal(result.departments.length, 2);

  const roadDept = result.departments.find((d) => d.department_id === DEPT_ROADS.id);
  assert.ok(roadDept);
  assert.equal(roadDept.pending_count, 1);
  assert.equal(roadDept.in_progress_count, 1);
  assert.equal(roadDept.active_count, 2);

  const sanDept = result.departments.find((d) => d.department_id === DEPT_SANITATION.id);
  assert.ok(sanDept);
  assert.equal(sanDept.active_count, 0);
});

// ============================================================================
// Group 10: Service Integration: Resolution Performance
// ============================================================================

test("Analytics Performance 01: getResolutionPerformance calculates average and median hours", async () => {
  // 3 resolved reports:
  // Report 1: 10 hours (created 2026-11-01T00:00:00Z, resolved 2026-11-01T10:00:00Z)
  // Report 2: 20 hours (created 2026-11-01T00:00:00Z, resolved 2026-11-01T20:00:00Z)
  // Report 3: 30 hours (created 2026-11-01T00:00:00Z, resolved 2026-11-02T06:00:00Z)
  const mockResolved = [
    { created_at: "2026-11-01T00:00:00Z", resolved_at: "2026-11-01T10:00:00Z" },
    { created_at: "2026-11-01T00:00:00Z", resolved_at: "2026-11-01T20:00:00Z" },
    { created_at: "2026-11-01T00:00:00Z", resolved_at: "2026-11-02T06:00:00Z" },
  ];

  // Active reports: 1 recent, 1 older than 7 days
  const mockActive = [
    { created_at: new Date(Date.now() - 2 * 86_400_000).toISOString() }, // 2 days old
    { created_at: new Date(Date.now() - 10 * 86_400_000).toISOString() }, // 10 days old (>7)
  ];

  const stubClient = {
    rpc: async () => ({ data: null, error: new Error("RPC not found") }),
    from: () => {
      let isResolvedQuery = false;
      const builder: Record<string, unknown> = {
        select: (cols: string) => {
          if (cols.includes("resolved_at")) isResolvedQuery = true;
          return builder;
        },
        gte: () => builder,
        lt: () => builder,
        eq: () => Promise.resolve({ data: mockResolved, error: null }),
        in: () => Promise.resolve({ data: mockActive, error: null }),
      };
      builder.then = (resolve: (v: unknown) => void) => {
        if (isResolvedQuery) resolve({ data: mockResolved, error: null });
        else resolve({ data: mockActive, error: null });
      };
      return builder;
    },
  } as unknown as SupabaseClient;

  const result = await getResolutionPerformance(
    { start: "2026-11-01", end: "2026-11-05" },
    ADMIN_USER,
    stubClient
  );

  assert.equal(result.resolved_in_period, 3);
  assert.equal(result.resolution_duration_sample_size, 3);
  assert.equal(result.average_resolution_hours, 20); // (10 + 20 + 30) / 3 = 20
  assert.equal(result.median_resolution_hours, 20); // middle is 20
  assert.equal(result.current_active_backlog, 2);
  assert.equal(result.active_reports_older_than_7_days, 1);
});

test("Analytics Performance 02: getResolutionPerformance returns null average/median when 0 resolved", async () => {
  const stubClient = {
    rpc: async () => ({ data: null, error: new Error("RPC not found") }),
    from: () => {
      const builder: Record<string, unknown> = {
        select: () => builder,
        gte: () => builder,
        lt: () => builder,
        eq: () => Promise.resolve({ data: [], error: null }),
        in: () => Promise.resolve({ data: [], error: null }),
      };
      return builder;
    },
  } as unknown as SupabaseClient;

  const result = await getResolutionPerformance(
    { start: "2026-11-01", end: "2026-11-05" },
    ADMIN_USER,
    stubClient
  );

  assert.equal(result.resolved_in_period, 0);
  assert.equal(result.resolution_duration_sample_size, 0);
  assert.equal(result.average_resolution_hours, null);
  assert.equal(result.median_resolution_hours, null);
  assert.equal(result.current_active_backlog, 0);
  assert.equal(result.active_reports_older_than_7_days, 0);
});

// ============================================================================
// Group 11: Service Integration: Operational Priorities
// ============================================================================

test("Analytics Priorities 01: getPriorityInsights returns top complaints ranked by score", async () => {
  const mockTopReports = [
    {
      id: "report-1",
      title: "Dangerous Sinkhole",
      category: "damaged_infrastructure",
      status: "pending",
      priority_score: 95,
      created_at: "2026-11-01T08:00:00Z",
      departments: { name: "Road Maintenance" },
    },
    {
      id: "report-2",
      title: "Broken Streetlight",
      category: "streetlight",
      status: "in_progress",
      priority_score: 80,
      created_at: "2026-11-02T10:00:00Z",
      departments: null,
    },
  ];

  const mockActiveScores = [{ priority_score: 95 }, { priority_score: 80 }, { priority_score: 50 }];

  const stubClient = {
    from: () => {
      let isTopQuery = false;
      const builder: Record<string, unknown> = {
        select: (cols: string) => {
          if (cols.includes("title")) isTopQuery = true;
          return builder;
        },
        in: () => builder,
        order: () => builder,
        limit: () => Promise.resolve({ data: mockTopReports, error: null }),
      };
      builder.then = (resolve: (v: unknown) => void) => {
        if (isTopQuery) resolve({ data: mockTopReports, error: null });
        else resolve({ data: mockActiveScores, error: null });
      };
      return builder;
    },
  } as unknown as SupabaseClient;

  const result = await getPriorityInsights({ limit: 5 }, ADMIN_USER, stubClient);

  assert.equal(result.active_count, 3);
  assert.equal(result.average_active_priority, 75); // (95 + 80 + 50) / 3 = 75
  assert.equal(result.max_active_priority, 95);
  assert.equal(result.top_priority_reports.length, 2);
  assert.equal(result.top_priority_reports[0].title, "Dangerous Sinkhole");
  assert.equal(result.top_priority_reports[0].department_name, "Road Maintenance");
  assert.equal(result.top_priority_reports[1].department_name, null);
});

// ============================================================================
// Group 12: Route Handlers, Forbidden Parameters & Caching Defense
// ============================================================================

test("Route Handlers 01: GET routes reject forbidden client parameters (role, is_admin, etc.) with HTTP 422", async () => {
  const badOverviewReq = new NextRequest("http://localhost/api/admin/analytics/overview?role=admin");
  const res1 = await getOverviewRoute(badOverviewReq);
  assert.equal(res1.status, 422);
  const json1 = await res1.json();
  assert.equal(json1.success, false);
  assert.equal(json1.error.code, "VALIDATION_ERROR");

  const badTrendsReq = new NextRequest("http://localhost/api/admin/analytics/trends?is_admin=true");
  const res2 = await getTrendsRoute(badTrendsReq);
  assert.equal(res2.status, 422);

  const badCategoriesReq = new NextRequest("http://localhost/api/admin/analytics/categories?bypass_rls=true");
  const res3 = await getCategoriesRoute(badCategoriesReq);
  assert.equal(res3.status, 422);

  const badDepartmentsReq = new NextRequest("http://localhost/api/admin/analytics/departments?user_id=123");
  const res4 = await getDepartmentsRoute(badDepartmentsReq);
  assert.equal(res4.status, 422);

  const badPerformanceReq = new NextRequest("http://localhost/api/admin/analytics/performance?raw_sql=true");
  const res5 = await getPerformanceRoute(badPerformanceReq);
  assert.equal(res5.status, 422);

  const badPrioritiesReq = new NextRequest("http://localhost/api/admin/analytics/priorities?include_private=true");
  const res6 = await getPrioritiesRoute(badPrioritiesReq);
  assert.equal(res6.status, 422);
});

test("Route Handlers 02: Success and error responses include Cache-Control: no-store", () => {
  const succ = successResponse({ test: true });
  assert.equal(succ.status, 200);
  assert.equal(succ.headers.get("Cache-Control"), "no-store");

  const err = errorResponse(new AppError("VALIDATION_ERROR", "Invalid input"));
  assert.equal(err.status, 422);
  assert.equal(err.headers.get("Cache-Control"), "no-store");
});

