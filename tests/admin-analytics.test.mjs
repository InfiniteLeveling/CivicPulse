import test from "node:test";
import assert from "node:assert/strict";
import {
  adminAnalyticsSchema,
  calculatePercentage,
  aggregateAnalyticsFromReports,
} from "../src/lib/validation/admin-analytics.ts";
import { mockMyReports } from "../src/lib/api/reports-mock.ts";

test("calculatePercentage computes accurate percentage and guards against division by zero", () => {
  assert.equal(calculatePercentage(2, 4), 50);
  assert.equal(calculatePercentage(1, 3), 33.3);
  assert.equal(calculatePercentage(0, 10), 0);
  assert.equal(calculatePercentage(5, 0), 0);
  assert.equal(calculatePercentage(-2, 10), 0);
  assert.equal(calculatePercentage(5, -10), 0);
});

test("adminAnalyticsSchema validates legitimate analytics payloads", () => {
  const payload = {
    total: 8,
    pending: 3,
    inProgress: 3,
    resolved: 2,
    criticalActive: 2,
    resolutionRate: 25.0,
    statusBreakdown: [
      { status: "pending", label: "Pending", count: 3, percentage: 37.5, color: "#D97706" },
      { status: "in_progress", label: "In Progress", count: 3, percentage: 37.5, color: "#2563EB" },
      { status: "resolved", label: "Resolved", count: 2, percentage: 25.0, color: "#16A34A" },
    ],
    categoryBreakdown: [
      { category: "pothole", label: "Pothole", count: 2, percentage: 25.0 },
      { category: "garbage", label: "Garbage", count: 2, percentage: 25.0 },
      { category: "streetlight", label: "Streetlight", count: 2, percentage: 25.0 },
      { category: "water_leakage", label: "Water leakage", count: 1, percentage: 12.5 },
      { category: "drainage", label: "Drainage", count: 1, percentage: 12.5 },
      { category: "other", label: "Other", count: 0, percentage: 0 },
    ],
    severityBreakdown: [
      { severity: "low", label: "Low", count: 1, percentage: 12.5, color: "#64748B" },
      { severity: "medium", label: "Medium", count: 3, percentage: 37.5, color: "#F59E0B" },
      { severity: "high", label: "High", count: 3, percentage: 37.5, color: "#EA580C" },
      { severity: "critical", label: "Critical", count: 1, percentage: 12.5, color: "#DC2626" },
    ],
    departmentWorkload: [
      { departmentId: "dept-1", departmentName: "Road Maintenance", total: 2, pending: 0, inProgress: 2, resolved: 0 },
      { departmentId: "dept-2", departmentName: "Electrical Services", total: 2, pending: 1, inProgress: 0, resolved: 1 },
    ],
    trends: [
      { date: "2026-11-15", label: "Nov 15", count: 1 },
      { date: "2026-11-16", label: "Nov 16", count: 1 },
    ],
    resolutionPerformance: {
      resolvedCount: 2,
      resolutionRate: 25.0,
      avgDurationDays: 2.1,
    },
    isDemoData: true,
    lastRefreshedAt: new Date().toISOString(),
  };

  const parsed = adminAnalyticsSchema.parse(payload);
  assert.equal(parsed.total, 8);
  assert.equal(parsed.resolutionRate, 25.0);
  assert.equal(parsed.categoryBreakdown.length, 6);
  assert.equal(parsed.statusBreakdown.length, 3);
});

test("adminAnalyticsSchema rejects negative counts, NaN, and invalid structures", () => {
  assert.throws(() => adminAnalyticsSchema.parse({ total: -1 }));
  assert.throws(() => adminAnalyticsSchema.parse({ total: NaN }));
  assert.throws(() => adminAnalyticsSchema.parse({ total: 10, resolutionRate: 150 }));
});

test("aggregateAnalyticsFromReports computes correct distributions from mock complaints", () => {
  const analytics = aggregateAnalyticsFromReports(mockMyReports);

  assert.equal(analytics.total, mockMyReports.length);
  assert.equal(analytics.statusBreakdown.length, 3);
  assert.equal(analytics.categoryBreakdown.length, 6);
  assert.equal(analytics.severityBreakdown.length, 4);

  // Status sum equals total
  const statusSum = analytics.statusBreakdown.reduce((sum, s) => sum + s.count, 0);
  assert.equal(statusSum, mockMyReports.length);

  // Category sum equals total
  const categorySum = analytics.categoryBreakdown.reduce((sum, c) => sum + c.count, 0);
  assert.equal(categorySum, mockMyReports.length);

  // Severity sum equals total
  const severitySum = analytics.severityBreakdown.reduce((sum, s) => sum + s.count, 0);
  assert.equal(severitySum, mockMyReports.length);

  // Resolution rate
  assert.ok(analytics.resolutionRate !== null);
  assert.ok(analytics.resolutionRate > 0 && analytics.resolutionRate <= 100);

  // Resolution performance metrics
  assert.ok(analytics.resolutionPerformance.resolvedCount >= 2);
  assert.ok(analytics.resolutionPerformance.avgDurationDays !== null);

  // Trends are chronologically sorted
  for (let i = 1; i < analytics.trends.length; i++) {
    assert.ok(analytics.trends[i].date >= analytics.trends[i - 1].date);
  }
});

test("aggregateAnalyticsFromReports cleanly handles zero reports without NaN or crashing", () => {
  const emptyAnalytics = aggregateAnalyticsFromReports([]);

  assert.equal(emptyAnalytics.total, 0);
  assert.equal(emptyAnalytics.pending, 0);
  assert.equal(emptyAnalytics.inProgress, 0);
  assert.equal(emptyAnalytics.resolved, 0);
  assert.equal(emptyAnalytics.resolutionRate, null);
  assert.equal(emptyAnalytics.resolutionPerformance.avgDurationDays, null);

  for (const s of emptyAnalytics.statusBreakdown) {
    assert.equal(s.count, 0);
    assert.equal(s.percentage, 0);
  }

  for (const c of emptyAnalytics.categoryBreakdown) {
    assert.equal(c.count, 0);
    assert.equal(c.percentage, 0);
  }
});
