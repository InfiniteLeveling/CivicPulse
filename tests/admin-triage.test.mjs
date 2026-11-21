import test from "node:test";
import assert from "node:assert/strict";
import {
  adminTriageSchema,
  CATEGORY_RECOMMENDED_DEPT,
} from "../src/lib/validation/admin-triage.ts";
import {
  adminStatusSchema,
  isValidStatusTransition,
  getAllowedNextStatuses,
  VALID_STATUSES,
} from "../src/lib/validation/admin-status.ts";

test("adminTriageSchema validates legitimate triage parameters", () => {
  const valid = {
    version: 3,
    departmentId: "dept-1",
    category: "pothole",
    severity: "high",
    visibility: "public",
    remark: "Assigned to road maintenance for urgent pothole patching.",
  };

  const parsed = adminTriageSchema.parse(valid);
  assert.equal(parsed.version, 3);
  assert.equal(parsed.departmentId, "dept-1");
  assert.equal(parsed.category, "pothole");
  assert.equal(parsed.severity, "high");
  assert.equal(parsed.visibility, "public");
  assert.equal(parsed.remark, valid.remark);
});

test("adminTriageSchema allows unassigning department with null", () => {
  const payload = {
    version: 1,
    departmentId: null,
  };

  const parsed = adminTriageSchema.parse(payload);
  assert.equal(parsed.departmentId, null);
});

test("adminTriageSchema rejects missing, non-integer, or non-positive version", () => {
  assert.throws(() => adminTriageSchema.parse({}));
  assert.throws(() => adminTriageSchema.parse({ version: 0 }), /positive/i);
  assert.throws(() => adminTriageSchema.parse({ version: -2 }), /positive/i);
  assert.throws(() => adminTriageSchema.parse({ version: 2.5 }), /integer/i);
});

test("adminTriageSchema rejects invalid category, severity, and visibility", () => {
  assert.throws(() => adminTriageSchema.parse({ version: 1, category: "flying_cars" }));
  assert.throws(() => adminTriageSchema.parse({ version: 1, severity: "apocalyptic" }));
  assert.throws(() => adminTriageSchema.parse({ version: 1, visibility: "unlisted" }));
});

test("adminTriageSchema enforces maximum remark length", () => {
  const longRemark = "a".repeat(1001);
  assert.throws(() => adminTriageSchema.parse({ version: 1, remark: longRemark }));
});

test("CATEGORY_RECOMMENDED_DEPT accurately maps categories to default municipal departments", () => {
  assert.equal(CATEGORY_RECOMMENDED_DEPT.pothole, "dept-1");
  assert.equal(CATEGORY_RECOMMENDED_DEPT.garbage, "dept-3");
  assert.equal(CATEGORY_RECOMMENDED_DEPT.water_leakage, "dept-4");
  assert.equal(CATEGORY_RECOMMENDED_DEPT.streetlight, "dept-2");
  assert.equal(CATEGORY_RECOMMENDED_DEPT.drainage, "dept-5");
  assert.equal(CATEGORY_RECOMMENDED_DEPT.other, null);
});

test("adminStatusSchema validates legitimate status change requests", () => {
  const payload = {
    version: 2,
    status: "in_progress",
    remark: "Crew deployed to location.",
  };

  const parsed = adminStatusSchema.parse(payload);
  assert.equal(parsed.version, 2);
  assert.equal(parsed.status, "in_progress");
  assert.equal(parsed.remark, "Crew deployed to location.");
});

test("adminStatusSchema accepts optional resolution evidence image ID", () => {
  const payload = {
    version: 4,
    status: "resolved",
    remark: "Asphalt patch completed and cured.",
    resolutionImageId: "res-img-998822",
  };

  const parsed = adminStatusSchema.parse(payload);
  assert.equal(parsed.resolutionImageId, "res-img-998822");
  assert.equal(parsed.status, "resolved");
});

test("adminStatusSchema rejects non-canonical status values", () => {
  assert.throws(() => adminStatusSchema.parse({ version: 1, status: "closed" }));
  assert.throws(() => adminStatusSchema.parse({ version: 1, status: "in_review" }));
  assert.throws(() => adminStatusSchema.parse({ version: 1, status: "assigned" }));
});

test("isValidStatusTransition enforces canonical municipal lifecycle", () => {
  // Valid forward transitions
  assert.equal(isValidStatusTransition("pending", "in_progress"), true);
  assert.equal(isValidStatusTransition("pending", "resolved"), true);
  assert.equal(isValidStatusTransition("in_progress", "resolved"), true);

  // No-op transitions
  assert.equal(isValidStatusTransition("pending", "pending"), false);
  assert.equal(isValidStatusTransition("in_progress", "in_progress"), false);
  assert.equal(isValidStatusTransition("resolved", "resolved"), false);

  // Disallowed backward transitions
  assert.equal(isValidStatusTransition("in_progress", "pending"), false);
  assert.equal(isValidStatusTransition("resolved", "in_progress"), false);
  assert.equal(isValidStatusTransition("resolved", "pending"), false);
});

test("getAllowedNextStatuses returns accurate choices based on current lifecycle stage", () => {
  assert.deepEqual(getAllowedNextStatuses("pending"), ["in_progress", "resolved"]);
  assert.deepEqual(getAllowedNextStatuses("in_progress"), ["resolved"]);
  assert.deepEqual(getAllowedNextStatuses("resolved"), []);
});

test("VALID_STATUSES defines all 3 canonical statuses", () => {
  assert.deepEqual(VALID_STATUSES, ["pending", "in_progress", "resolved"]);
});
