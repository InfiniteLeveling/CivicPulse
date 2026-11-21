import assert from "node:assert/strict";
import test from "node:test";
import {
  mockCitizenReports,
  mockCitizenStats,
  mockEmptyStats,
} from "../src/lib/api/dashboard-mock.ts";

test("dashboard fixture data adheres strictly to domain types", () => {
  assert.equal(typeof mockCitizenStats.total, "number");
  assert.equal(typeof mockCitizenStats.pending, "number");
  assert.equal(typeof mockCitizenStats.inProgress, "number");
  assert.equal(typeof mockCitizenStats.resolved, "number");
  assert.equal(
    mockCitizenStats.total,
    mockCitizenStats.pending + mockCitizenStats.inProgress + mockCitizenStats.resolved
  );

  assert.equal(mockEmptyStats.total, 0);
  assert.equal(mockEmptyStats.pending, 0);
  assert.equal(mockEmptyStats.inProgress, 0);
  assert.equal(mockEmptyStats.resolved, 0);
  assert.equal(mockEmptyStats.resolutionRate, null);
});

test("mock complaints contain required civic categories and valid references", () => {
  assert.ok(mockCitizenReports.length > 0);
  for (const report of mockCitizenReports) {
    assert.ok(report.id.startsWith("rep-"));
    assert.ok(report.reference.startsWith("CP-"));
    assert.ok(report.title.length > 5);
    assert.ok(["pending", "in_progress", "resolved"].includes(report.status));
    assert.ok(["low", "medium", "high", "critical"].includes(report.severity));
    assert.ok(["pothole", "streetlight", "garbage", "water_leakage", "drainage", "other"].includes(report.category));
    assert.equal(typeof report.supportCount, "number");
    assert.equal(typeof report.latitude, "number");
    assert.equal(typeof report.longitude, "number");
  }
});
