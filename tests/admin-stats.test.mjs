import assert from "node:assert/strict";
import test from "node:test";
import {
  adminStatsSchema,
  validateAdminStats,
  calculateResolutionRate,
  calculateStatusDistribution,
  mockAdminStats,
  mockEmptyAdminStats,
} from "../src/lib/validation/admin-stats.ts";

test("adminStatsSchema accepts valid stats payloads according to backend contract", () => {
  assert.ok(adminStatsSchema);
  const valid = {
    total: 10,
    pending: 3,
    inProgress: 4,
    resolved: 3,
    criticalActive: 2,
    resolutionRate: 30,
  };

  const parsed = validateAdminStats(valid);
  assert.equal(parsed.total, 10);
  assert.equal(parsed.pending, 3);
  assert.equal(parsed.inProgress, 4);
  assert.equal(parsed.resolved, 3);
  assert.equal(parsed.criticalActive, 2);
  assert.equal(parsed.resolutionRate, 30);
});

test("adminStatsSchema allows optional criticalActive and null resolutionRate for zero total", () => {
  const validZero = {
    total: 0,
    pending: 0,
    inProgress: 0,
    resolved: 0,
    resolutionRate: null,
  };

  const parsed = validateAdminStats(validZero);
  assert.equal(parsed.total, 0);
  assert.equal(parsed.criticalActive, undefined);
  assert.equal(parsed.resolutionRate, null);
});

test("adminStatsSchema rejects negative counts, NaN, and malformed types", () => {
  assert.throws(
    () => validateAdminStats({ total: -1, pending: 0, inProgress: 0, resolved: 0, resolutionRate: 0 }),
    /Too small|nonnegative/i
  );

  assert.throws(
    () => validateAdminStats({ total: 10, pending: -2, inProgress: 0, resolved: 0, resolutionRate: 0 }),
    /Too small|nonnegative/i
  );

  assert.throws(
    () => validateAdminStats({ total: Number.NaN, pending: 0, inProgress: 0, resolved: 0, resolutionRate: 0 }),
    /Expected number/i
  );

  assert.throws(
    () => validateAdminStats({ total: 10, pending: 2, inProgress: 2, resolved: 6, resolutionRate: 150 }),
    /Too big/i
  );
});

test("calculateResolutionRate calculates accurate percentage and guards against division by zero", () => {
  assert.equal(calculateResolutionRate(1, 3), 33.3);
  assert.equal(calculateResolutionRate(2, 4), 50);
  assert.equal(calculateResolutionRate(5, 5), 100);
  assert.equal(calculateResolutionRate(0, 10), 0);

  // Division by zero guard: returns null rather than NaN or Infinity
  assert.equal(calculateResolutionRate(0, 0), null);
  assert.equal(calculateResolutionRate(5, 0), null);

  // Invalid and negative numbers guard
  assert.equal(calculateResolutionRate(Number.NaN, 10), null);
  assert.equal(calculateResolutionRate(5, Number.NaN), null);
  assert.equal(calculateResolutionRate(-2, 10), null);
});

test("calculateStatusDistribution calculates accurate status percentages and handles zero reports", () => {
  const distribution = calculateStatusDistribution({
    total: 4,
    pending: 1,
    inProgress: 1,
    resolved: 2,
  });

  assert.equal(distribution.pending.count, 1);
  assert.equal(distribution.pending.percentage, 25);

  assert.equal(distribution.inProgress.count, 1);
  assert.equal(distribution.inProgress.percentage, 25);

  assert.equal(distribution.resolved.count, 2);
  assert.equal(distribution.resolved.percentage, 50);

  // Zero complaints guard: returns 0% for all without error
  const emptyDist = calculateStatusDistribution({
    total: 0,
    pending: 0,
    inProgress: 0,
    resolved: 0,
  });

  assert.equal(emptyDist.pending.count, 0);
  assert.equal(emptyDist.pending.percentage, 0);
  assert.equal(emptyDist.inProgress.count, 0);
  assert.equal(emptyDist.inProgress.percentage, 0);
  assert.equal(emptyDist.resolved.count, 0);
  assert.equal(emptyDist.resolved.percentage, 0);
});

test("mockAdminStats fixture data strictly adheres to canonical admin stats contract", () => {
  const validated = validateAdminStats(mockAdminStats);
  assert.equal(validated.total, 3);
  assert.equal(validated.pending, 1);
  assert.equal(validated.inProgress, 1);
  assert.equal(validated.resolved, 1);
  assert.equal(validated.criticalActive, 1);
  assert.equal(validated.resolutionRate, 33.3);

  // Consistency check: pending + inProgress + resolved === total
  assert.equal(
    mockAdminStats.total,
    mockAdminStats.pending + mockAdminStats.inProgress + mockAdminStats.resolved
  );

  const emptyValidated = validateAdminStats(mockEmptyAdminStats);
  assert.equal(emptyValidated.total, 0);
  assert.equal(emptyValidated.resolutionRate, null);
});
