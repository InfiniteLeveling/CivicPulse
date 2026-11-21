import assert from "node:assert/strict";
import test from "node:test";
import {
  filterAdminReports,
  isReportUrgent,
  adminReportSummarySchema,
} from "../src/lib/validation/admin-reports.ts";
import { mockMyReports } from "../src/lib/api/reports-mock.ts";

test("adminReportSummarySchema validates canonical report summary structure", () => {
  const sample = mockMyReports[0];
  const validated = adminReportSummarySchema.parse(sample);
  assert.equal(validated.id, sample.id);
  assert.equal(validated.reference, sample.reference);
  assert.equal(validated.category, sample.category);
  assert.equal(validated.severity, sample.severity);
  assert.equal(validated.status, sample.status);
  assert.equal(typeof validated.priority.score, "number");
  assert.equal(typeof validated.priority.urgent, "boolean");
});

test("isReportUrgent correctly classifies reports based on critical severity, high score, or urgent flag", () => {
  const urgentByFlag = {
    ...mockMyReports[0],
    priority: { score: 50, severityPoints: 30, supportPoints: 10, agePoints: 10, urgent: true },
    severity: "medium",
  };
  assert.equal(isReportUrgent(urgentByFlag), true);

  const urgentBySeverity = {
    ...mockMyReports[0],
    priority: { score: 30, severityPoints: 15, supportPoints: 10, agePoints: 5, urgent: false },
    severity: "critical",
  };
  assert.equal(isReportUrgent(urgentBySeverity), true);

  const urgentByScore = {
    ...mockMyReports[0],
    priority: { score: 75, severityPoints: 50, supportPoints: 20, agePoints: 5, urgent: false },
    severity: "high",
  };
  assert.equal(isReportUrgent(urgentByScore), true);

  const nonUrgent = {
    ...mockMyReports[0],
    priority: { score: 35, severityPoints: 30, supportPoints: 5, agePoints: 0, urgent: false },
    severity: "medium",
  };
  assert.equal(isReportUrgent(nonUrgent), false);
});

test("filterAdminReports filters accurately by status", () => {
  const pending = filterAdminReports(mockMyReports, { status: "pending" });
  assert.ok(pending.items.length > 0);
  assert.ok(pending.items.every((r) => r.status === "pending"));

  const inProgress = filterAdminReports(mockMyReports, { status: "in_progress" });
  assert.ok(inProgress.items.length > 0);
  assert.ok(inProgress.items.every((r) => r.status === "in_progress"));

  const resolved = filterAdminReports(mockMyReports, { status: "resolved" });
  assert.ok(resolved.items.length > 0);
  assert.ok(resolved.items.every((r) => r.status === "resolved"));
});

test("filterAdminReports filters accurately by category", () => {
  const potholes = filterAdminReports(mockMyReports, { category: "pothole" });
  assert.ok(potholes.items.length > 0);
  assert.ok(potholes.items.every((r) => r.category === "pothole"));

  const streetlights = filterAdminReports(mockMyReports, { category: "streetlight" });
  assert.ok(streetlights.items.length > 0);
  assert.ok(streetlights.items.every((r) => r.category === "streetlight"));
});

test("filterAdminReports filters accurately by severity", () => {
  const critical = filterAdminReports(mockMyReports, { severity: "critical" });
  assert.ok(critical.items.length > 0);
  assert.ok(critical.items.every((r) => r.severity === "critical"));

  const low = filterAdminReports(mockMyReports, { severity: "low" });
  assert.ok(low.items.length > 0);
  assert.ok(low.items.every((r) => r.severity === "low"));
});

test("filterAdminReports filters urgent-only complaints", () => {
  const urgentResult = filterAdminReports(mockMyReports, { urgent: true });
  assert.ok(urgentResult.items.length > 0);
  assert.ok(urgentResult.items.every((r) => isReportUrgent(r)));
});

test("filterAdminReports searches across title, reference, and category", () => {
  const byRef = filterAdminReports(mockMyReports, { q: "CP-2001" });
  assert.equal(byRef.items.length, 1);
  assert.equal(byRef.items[0].reference, "CP-2001");

  const byTitle = filterAdminReports(mockMyReports, { q: "pothole" });
  assert.ok(byTitle.items.length >= 1);

  const nonExistent = filterAdminReports(mockMyReports, { q: "nonexistent-xyz-query" });
  assert.equal(nonExistent.items.length, 0);
  assert.equal(nonExistent.total, 0);
});

test("filterAdminReports default priority sort prioritizes urgent unresolved complaints", () => {
  const result = filterAdminReports(mockMyReports, { sort: "priority" });
  assert.ok(result.items.length > 1);

  // The first item should be urgent and unresolved
  const first = result.items[0];
  assert.equal(isReportUrgent(first), true);
  assert.notEqual(first.status, "resolved");

  // Higher priority scores should come before lower priority scores among non-urgent items
  const nonUrgent = result.items.filter((r) => !isReportUrgent(r));
  for (let i = 0; i < nonUrgent.length - 1; i++) {
    if (nonUrgent[i].status !== "resolved" && nonUrgent[i + 1].status !== "resolved") {
      assert.ok(
        (nonUrgent[i].priority?.score ?? 0) >= (nonUrgent[i + 1].priority?.score ?? 0),
        "Expected non-urgent unresolved complaints to be ordered by score descending"
      );
    }
  }
});

test("filterAdminReports sorts by recent, oldest, and most supported", () => {
  const recent = filterAdminReports(mockMyReports, { sort: "recent" });
  for (let i = 0; i < recent.items.length - 1; i++) {
    assert.ok(
      new Date(recent.items[i].createdAt).getTime() >=
        new Date(recent.items[i + 1].createdAt).getTime()
    );
  }

  const oldest = filterAdminReports(mockMyReports, { sort: "oldest" });
  for (let i = 0; i < oldest.items.length - 1; i++) {
    assert.ok(
      new Date(oldest.items[i].createdAt).getTime() <=
        new Date(oldest.items[i + 1].createdAt).getTime()
    );
  }

  const mostSupported = filterAdminReports(mockMyReports, { sort: "most_supported" });
  for (let i = 0; i < mostSupported.items.length - 1; i++) {
    assert.ok(mostSupported.items[i].supportCount >= mostSupported.items[i + 1].supportCount);
  }
});

test("filterAdminReports paginates items accurately across multiple pages", () => {
  const page1 = filterAdminReports(mockMyReports, { page: 1, pageSize: 2 });
  assert.equal(page1.items.length, 2);
  assert.equal(page1.page, 1);
  assert.ok(page1.totalPages >= 2);

  const page2 = filterAdminReports(mockMyReports, { page: 2, pageSize: 2 });
  assert.equal(page2.items.length, 2);
  assert.equal(page2.page, 2);

  // Items on page 1 and page 2 must be different
  assert.notEqual(page1.items[0].id, page2.items[0].id);
});

test("filterAdminReports handles empty option cleanly", () => {
  const empty = filterAdminReports(mockMyReports, { empty: true });
  assert.equal(empty.items.length, 0);
  assert.equal(empty.total, 0);
  assert.equal(empty.totalPages, 1);
  assert.equal(empty.urgentCount, 0);
});
