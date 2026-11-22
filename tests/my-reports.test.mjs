import assert from "node:assert/strict";
import test from "node:test";
import {
  formatReportDate,
  formatReportTime,
  formatReportDateTime,
} from "../src/lib/reports/formatting.ts";
import {
  mockMyReports,
  computeReportStats,
  filterReports,
} from "../src/lib/api/reports-mock.ts";

test("formatReportDate safely formats dates and gracefully handles invalid values", () => {
  // Valid ISO string
  const formatted = formatReportDate("2026-11-20T10:00:00.000Z");
  assert.equal(formatted, "Nov 20, 2026");

  // Valid timestamp number
  const timestamp = Date.UTC(2026, 10, 15, 12, 0, 0);
  assert.equal(formatReportDate(timestamp), "Nov 15, 2026");

  // Valid Date object
  assert.equal(formatReportDate(new Date("2026-11-01T00:00:00.000Z")), "Nov 1, 2026");

  // Null, undefined, empty string
  assert.equal(formatReportDate(null), "Unknown date");
  assert.equal(formatReportDate(undefined), "Unknown date");
  assert.equal(formatReportDate(""), "Unknown date");

  // Malformed date string
  assert.equal(formatReportDate("not-a-valid-date"), "Unknown date");
});

test("formatReportTime and formatReportDateTime handle edge cases gracefully", () => {
  assert.equal(formatReportTime(null), "");
  assert.equal(formatReportTime("invalid"), "");

  const timeFormatted = formatReportTime("2026-11-20T14:30:00.000Z");
  assert.match(timeFormatted, /2:30\s*PM/i);

  const dateTimeFormatted = formatReportDateTime("2026-11-20T14:30:00.000Z");
  assert.ok(dateTimeFormatted.includes("Nov 20, 2026"));
  assert.ok(dateTimeFormatted.includes("2:30"));
});

test("mockMyReports fixture dataset adheres strictly to domain model contract", () => {
  assert.equal(mockMyReports.length, 8);

  for (const report of mockMyReports) {
    assert.ok(report.id.startsWith("rep-"));
    assert.ok(report.reference.startsWith("CP-"));
    assert.ok(report.title.length > 5);
    assert.ok(report.description.length > 10);
    assert.ok(["pending", "in_progress", "resolved"].includes(report.status));
    assert.ok(["low", "medium", "high", "critical"].includes(report.severity));
    assert.ok(["public", "private"].includes(report.visibility));
    assert.ok(
      ["pothole", "streetlight", "garbage", "water_leakage", "drainage", "other"].includes(
        report.category
      )
    );
    assert.ok(typeof report.supportCount === "number" && report.supportCount >= 0);
    assert.ok(typeof report.latitude === "number");
    assert.ok(typeof report.longitude === "number");
    assert.ok(report.priority && typeof report.priority.score === "number");
    assert.ok(typeof report.createdAt === "string");
  }
});

test("computeReportStats calculates exact distribution across personal complaints", () => {
  const stats = computeReportStats(mockMyReports);
  assert.equal(stats.total, 8);
  assert.equal(stats.pending, 3);
  assert.equal(stats.inProgress, 3);
  assert.equal(stats.resolved, 2);
  assert.equal(stats.total, stats.pending + stats.inProgress + stats.resolved);

  // Empty reports list returns all zeros
  const emptyStats = computeReportStats([]);
  assert.equal(emptyStats.total, 0);
  assert.equal(emptyStats.pending, 0);
  assert.equal(emptyStats.inProgress, 0);
  assert.equal(emptyStats.resolved, 0);
});

test("filterReports filters accurately by status", () => {
  const pendingOnly = filterReports(mockMyReports, { status: "pending", pageSize: 20 });
  assert.equal(pendingOnly.total, 3);
  assert.ok(pendingOnly.items.every((r) => r.status === "pending"));

  const inProgressOnly = filterReports(mockMyReports, { status: "in_progress", pageSize: 20 });
  assert.equal(inProgressOnly.total, 3);
  assert.ok(inProgressOnly.items.every((r) => r.status === "in_progress"));

  const resolvedOnly = filterReports(mockMyReports, { status: "resolved", pageSize: 20 });
  assert.equal(resolvedOnly.total, 2);
  assert.ok(resolvedOnly.items.every((r) => r.status === "resolved"));
});

test("filterReports filters accurately by category", () => {
  const potholes = filterReports(mockMyReports, { category: "pothole", pageSize: 20 });
  assert.equal(potholes.total, 2);
  assert.ok(potholes.items.every((r) => r.category === "pothole"));

  const streetlights = filterReports(mockMyReports, { category: "streetlight", pageSize: 20 });
  assert.equal(streetlights.total, 2);
  assert.ok(streetlights.items.every((r) => r.category === "streetlight"));

  const drainage = filterReports(mockMyReports, { category: "drainage", pageSize: 20 });
  assert.equal(drainage.total, 1);
  assert.equal(drainage.items[0].reference, "CP-2008");
});

test("filterReports searches across title, reference, and category label", () => {
  // Match by reference
  const byRef = filterReports(mockMyReports, { q: "CP-2004", pageSize: 20 });
  assert.equal(byRef.total, 1);
  assert.equal(byRef.items[0].reference, "CP-2004");

  // Match by title keyword
  const byTitle = filterReports(mockMyReports, { q: "sidewalk", pageSize: 20 });
  assert.equal(byTitle.total, 1);
  assert.equal(byTitle.items[0].reference, "CP-2004");

  // Match by category label
  const byCatLabel = filterReports(mockMyReports, { q: "garbage", pageSize: 20 });
  assert.ok(byCatLabel.total >= 2);
  assert.ok(byCatLabel.items.some((r) => r.category === "garbage"));

  // Case insensitivity & trimming
  const caseInsensitive = filterReports(mockMyReports, { q: "  pOTHOle  ", pageSize: 20 });
  assert.ok(caseInsensitive.total >= 2);

  // No match
  const noMatch = filterReports(mockMyReports, { q: "xyz-non-existent-query", pageSize: 20 });
  assert.equal(noMatch.total, 0);
  assert.equal(noMatch.items.length, 0);
});

test("filterReports sorts correctly by newest, oldest, and support count", () => {
  // Newest First (default)
  const newest = filterReports(mockMyReports, { sort: "newest", pageSize: 20 });
  for (let i = 1; i < newest.items.length; i++) {
    const prevDate = new Date(newest.items[i - 1].createdAt).getTime();
    const currDate = new Date(newest.items[i].createdAt).getTime();
    assert.ok(prevDate >= currDate, "Expected descending order by createdAt");
  }

  // Oldest First
  const oldest = filterReports(mockMyReports, { sort: "oldest", pageSize: 20 });
  for (let i = 1; i < oldest.items.length; i++) {
    const prevDate = new Date(oldest.items[i - 1].createdAt).getTime();
    const currDate = new Date(oldest.items[i].createdAt).getTime();
    assert.ok(prevDate <= currDate, "Expected ascending order by createdAt");
  }

  // Highest Support Count
  const bySupport = filterReports(mockMyReports, { sort: "support", pageSize: 20 });
  for (let i = 1; i < bySupport.items.length; i++) {
    assert.ok(
      bySupport.items[i - 1].supportCount >= bySupport.items[i].supportCount,
      "Expected descending order by supportCount"
    );
  }
  assert.equal(bySupport.items[0].reference, "CP-2004"); // 12 votes
});

test("filterReports paginates items accurately across multiple pages", () => {
  const page1 = filterReports(mockMyReports, { page: 1, pageSize: 5 });
  assert.equal(page1.total, 8);
  assert.equal(page1.page, 1);
  assert.equal(page1.pageSize, 5);
  assert.equal(page1.items.length, 5);

  const page2 = filterReports(mockMyReports, { page: 2, pageSize: 5 });
  assert.equal(page2.total, 8);
  assert.equal(page2.page, 2);
  assert.equal(page2.pageSize, 5);
  assert.equal(page2.items.length, 3);

  // Ensure no duplicate items between page 1 and page 2
  const idsPage1 = new Set(page1.items.map((r) => r.id));
  for (const item of page2.items) {
    assert.equal(idsPage1.has(item.id), false, `Item ${item.id} should not appear on both pages`);
  }

  // Out of range page
  const page3 = filterReports(mockMyReports, { page: 3, pageSize: 5 });
  assert.equal(page3.items.length, 0);
  assert.equal(page3.total, 8);
});

test("filterReports handles empty datasets cleanly", () => {
  const result = filterReports([], { page: 1, pageSize: 5 });
  assert.equal(result.total, 0);
  assert.equal(result.items.length, 0);
  assert.equal(result.page, 1);
});

test("filterReports handles combined filters and edge queries", () => {
  const combined = filterReports(mockMyReports, {
    status: "in_progress",
    category: "pothole",
    q: "crossing",
  });
  assert.equal(combined.total, 1);
  assert.equal(combined.items[0].reference, "CP-2001");
});

