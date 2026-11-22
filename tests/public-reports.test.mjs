import assert from "node:assert/strict";
import { test } from "node:test";
import {
  publicReportSummarySchema,
  hasValidCoordinates,
  filterPublicReports,
} from "../src/lib/validation/public-reports.ts";
import { mockMyReports } from "../src/lib/api/reports-mock.ts";

test("publicReportSummarySchema accepts valid public reports with coordinates", () => {
  const validReport = {
    id: "rep-2001",
    reference: "CP-2001",
    title: "Deep pothole at main campus crossing",
    description: "Substantial asphalt breakdown posing severe hazard to cyclists.",
    category: "pothole",
    severity: "high",
    severityReviewed: true,
    status: "in_progress",
    visibility: "public",
    latitude: 12.9716,
    longitude: 77.5946,
    department: { id: "dept-1", name: "Road Maintenance" },
    supportCount: 7,
    createdAt: "2026-11-19T14:30:00.000Z",
    updatedAt: "2026-11-20T08:00:00.000Z",
    imageUrl: "/images/pothole-sample.webp",
    viewerHasSupported: true,
  };

  const parsed = publicReportSummarySchema.parse(validReport);
  assert.equal(parsed.id, "rep-2001");
  assert.equal(parsed.visibility, "public");
  assert.equal(parsed.latitude, 12.9716);
  assert.equal(parsed.longitude, 77.5946);
});

test("publicReportSummarySchema strictly rejects private reports", () => {
  const privateReport = {
    id: "rep-2005",
    reference: "CP-2005",
    title: "Construction debris dumped in park alley",
    description: "Large pile of concrete rubble.",
    category: "garbage",
    severity: "medium",
    severityReviewed: false,
    status: "pending",
    visibility: "private",
    latitude: 12.9698,
    longitude: 77.5925,
    department: { id: "dept-3", name: "Sanitation Dept" },
    supportCount: 1,
    createdAt: "2026-11-21T07:45:00.000Z",
    updatedAt: "2026-11-21T07:45:00.000Z",
    imageUrl: null,
    viewerHasSupported: true,
  };

  assert.throws(
    () => publicReportSummarySchema.parse(privateReport),
    /invalid_value|expected "public"/i
  );
});

test("publicReportSummarySchema rejects invalid or out-of-bounds coordinates", () => {
  const base = {
    id: "rep-test",
    reference: "CP-TEST",
    title: "Test report",
    description: "Description text",
    category: "pothole",
    severity: "low",
    severityReviewed: false,
    status: "pending",
    visibility: "public",
    createdAt: "2026-11-20T10:00:00.000Z",
    updatedAt: "2026-11-20T10:00:00.000Z",
    supportCount: 0,
    viewerHasSupported: false,
  };

  // Latitude > 90
  assert.throws(
    () => publicReportSummarySchema.parse({ ...base, latitude: 95.5, longitude: 50 }),
    /Latitude must be <= 90/
  );

  // Latitude < -90
  assert.throws(
    () => publicReportSummarySchema.parse({ ...base, latitude: -91, longitude: 50 }),
    /Latitude must be >= -90/
  );

  // Longitude > 180
  assert.throws(
    () => publicReportSummarySchema.parse({ ...base, latitude: 10, longitude: 181 }),
    /Longitude must be <= 180/
  );

  // NaN or Infinity
  assert.throws(
    () => publicReportSummarySchema.parse({ ...base, latitude: Number.NaN, longitude: 50 }),
    /expected number/i
  );
});

test("hasValidCoordinates accurately validates finite coordinate bounds", () => {
  assert.equal(hasValidCoordinates({ latitude: 12.9716, longitude: 77.5946 }), true);
  assert.equal(hasValidCoordinates({ latitude: -89.9, longitude: -179.9 }), true);
  assert.equal(hasValidCoordinates({ latitude: 0, longitude: 0 }), true);
  assert.equal(hasValidCoordinates({ latitude: 90, longitude: 180 }), true);
  assert.equal(hasValidCoordinates({ latitude: -90, longitude: -180 }), true);

  // Invalid cases
  assert.equal(hasValidCoordinates({ latitude: 91, longitude: 50 }), false);
  assert.equal(hasValidCoordinates({ latitude: 50, longitude: 185 }), false);
  assert.equal(hasValidCoordinates({ latitude: Number.NaN, longitude: 50 }), false);
  assert.equal(hasValidCoordinates({ latitude: Number.POSITIVE_INFINITY, longitude: 50 }), false);
  assert.equal(hasValidCoordinates({ latitude: null, longitude: 50 }), false);
  assert.equal(hasValidCoordinates({ latitude: 50, longitude: undefined }), false);
});

test("filterPublicReports strictly excludes private complaints", () => {
  const result = filterPublicReports(mockMyReports);

  // Total mock reports is 8, but 1 is private (rep-2005)
  assert.equal(result.total, 7);
  assert.equal(result.items.length, 7);

  // Verify rep-2005 is not present
  const hasPrivate = result.items.some((r) => r.id === "rep-2005" || r.visibility === "private");
  assert.equal(hasPrivate, false);
});

test("filterPublicReports accurately filters by category, status, and search query", () => {
  // Category filter
  const potholeReports = filterPublicReports(mockMyReports, { category: "pothole" });
  assert.equal(potholeReports.total, 2);
  assert.ok(potholeReports.items.every((r) => r.category === "pothole"));

  // Status filter
  const resolvedReports = filterPublicReports(mockMyReports, { status: "resolved" });
  assert.equal(resolvedReports.total, 2);
  assert.ok(resolvedReports.items.every((r) => r.status === "resolved"));

  // Combined status and category
  const inProgressPotholes = filterPublicReports(mockMyReports, {
    category: "pothole",
    status: "in_progress",
  });
  assert.equal(inProgressPotholes.total, 2);

  // Search by reference
  const searchRef = filterPublicReports(mockMyReports, { q: "CP-2001" });
  assert.equal(searchRef.total, 1);
  assert.equal(searchRef.items[0].id, "rep-2001");

  // Search by text query
  const searchLeak = filterPublicReports(mockMyReports, { q: "leak" });
  assert.equal(searchLeak.total, 1);
  assert.equal(searchLeak.items[0].id, "rep-2006");

  // Empty query returns all public
  const emptySearch = filterPublicReports(mockMyReports, { q: "xyz-nonexistent-12345" });
  assert.equal(emptySearch.total, 0);
  assert.equal(emptySearch.items.length, 0);
});
