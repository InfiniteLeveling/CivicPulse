import assert from "node:assert/strict";
import test from "node:test";
import {
  reportStatusEnum,
  issueCategoryEnum,
  statusHistorySchema,
  resolutionImageSchema,
  safeValidateComplaintDetails,
} from "../src/lib/validation/report-details.ts";
import { getMockReportDetails } from "../src/lib/api/reports-mock.ts";

test("reportStatusEnum accepts canonical statuses and rejects invalid", () => {
  assert.equal(reportStatusEnum.parse("pending"), "pending");
  assert.equal(reportStatusEnum.parse("in_progress"), "in_progress");
  assert.equal(reportStatusEnum.parse("resolved"), "resolved");

  assert.equal(reportStatusEnum.safeParse("assigned").success, false);
  assert.equal(reportStatusEnum.safeParse("closed").success, false);
  assert.equal(reportStatusEnum.safeParse("rejected").success, false);
});

test("issueCategoryEnum accepts all 6 canonical categories and rejects others", () => {
  const valid = ["pothole", "garbage", "water_leakage", "streetlight", "drainage", "other"];
  for (const cat of valid) {
    assert.equal(issueCategoryEnum.parse(cat), cat);
  }

  assert.equal(issueCategoryEnum.safeParse("sidewalk").success, false);
  assert.equal(issueCategoryEnum.safeParse("traffic").success, false);
});

test("statusHistorySchema validates legitimate status transitions and rejects malformed", () => {
  const validEvent = {
    id: "hist-101",
    eventType: "triaged",
    oldStatus: "pending",
    newStatus: "in_progress",
    remark: "Dispatched to Road Maintenance division.",
    createdAt: "2026-11-20T10:00:00.000Z",
  };

  const parsed = statusHistorySchema.parse(validEvent);
  assert.equal(parsed.id, "hist-101");
  assert.equal(parsed.eventType, "triaged");
  assert.equal(parsed.oldStatus, "pending");
  assert.equal(parsed.newStatus, "in_progress");

  // Rejects invalid eventType
  const invalidType = { ...validEvent, eventType: "unknown_event" };
  assert.equal(statusHistorySchema.safeParse(invalidType).success, false);

  // Rejects empty ID
  const emptyId = { ...validEvent, id: "" };
  assert.equal(statusHistorySchema.safeParse(emptyId).success, false);
});

test("resolutionImageSchema validates resolution proof images", () => {
  const validImage = {
    id: "res-img-001",
    imageUrl: "https://example.org/evidence/res-1.jpg",
    createdAt: "2026-11-21T09:00:00.000Z",
  };

  const parsed = resolutionImageSchema.parse(validImage);
  assert.equal(parsed.id, "res-img-001");
  assert.equal(parsed.imageUrl, validImage.imageUrl);

  // Missing imageUrl
  assert.equal(resolutionImageSchema.safeParse({ id: "res-1", createdAt: "2026" }).success, false);
});

test("complaintDetailsSchema validates full authorized complaint detail payload", () => {
  const validDetails = {
    report: {
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
      priority: {
        score: 71,
        severityPoints: 50,
        supportPoints: 20,
        agePoints: 1,
        urgent: true,
      },
      createdAt: "2026-11-19T14:30:00.000Z",
      updatedAt: "2026-11-20T08:00:00.000Z",
      resolvedAt: null,
      imageUrl: "/images/pothole-sample.webp",
      viewerHasSupported: true,
    },
    history: [
      {
        id: "hist-1",
        eventType: "submitted",
        oldStatus: null,
        newStatus: "pending",
        remark: "Intake recorded.",
        createdAt: "2026-11-19T14:30:00.000Z",
      },
    ],
    resolutionImages: [],
    canGiveFeedback: false,
    version: 2,
  };

  const result = safeValidateComplaintDetails(validDetails);
  assert.equal(result.success, true);
  if (result.success) {
    assert.equal(result.data.report.id, "rep-2001");
    assert.equal(result.data.version, 2);
    assert.equal(result.data.history.length, 1);
  }
});

test("getMockReportDetails returns complete authorized details for existing reports", () => {
  // In-progress report CP-2001
  const inProgress = getMockReportDetails("rep-2001");
  assert.ok(inProgress !== null);
  if (inProgress) {
    assert.equal(inProgress.report.reference, "CP-2001");
    assert.equal(inProgress.report.status, "in_progress");
    assert.ok(inProgress.history.length >= 2);
    assert.equal(inProgress.history[0].eventType, "submitted");
    assert.equal(inProgress.history[1].eventType, "triaged");
    assert.equal(inProgress.resolutionImages.length, 0);
    assert.equal(inProgress.canGiveFeedback, false);
  }

  // Pending report CP-2002
  const pending = getMockReportDetails("rep-2002");
  assert.ok(pending !== null);
  if (pending) {
    assert.equal(pending.report.reference, "CP-2002");
    assert.equal(pending.report.status, "pending");
    assert.equal(pending.history.length, 1);
    assert.equal(pending.history[0].eventType, "submitted");
  }

  // Resolved report CP-2003 with resolution evidence
  const resolved = getMockReportDetails("rep-2003");
  assert.ok(resolved !== null);
  if (resolved) {
    assert.equal(resolved.report.reference, "CP-2003");
    assert.equal(resolved.report.status, "resolved");
    assert.ok(resolved.history.length >= 3);
    assert.ok(resolved.history.some((h) => h.newStatus === "resolved"));
    assert.ok(resolved.resolutionImages.length >= 1);
    assert.equal(resolved.canGiveFeedback, true);
  }

  // Resolves by reference code (case-insensitive)
  const byRef = getMockReportDetails("cp-2001");
  assert.ok(byRef !== null);
  assert.equal(byRef?.report.id, "rep-2001");

  // Nonexistent report returns null
  assert.equal(getMockReportDetails("non-existent-report-xyz"), null);
});
