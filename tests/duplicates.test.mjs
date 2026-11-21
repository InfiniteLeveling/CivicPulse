import test from "node:test";
import assert from "node:assert/strict";
import {
  duplicateCategoryEnum,
  duplicateStatusEnum,
  duplicateVisibilityEnum,
  duplicateCandidateSchema,
  duplicateCheckRequestSchema,
  duplicateCheckResponseSchema,
  formatDistance,
  formatSupportCount,
  validateDuplicateCheckResponse,
  safeValidateDuplicateCheckResponse,
} from "../src/lib/validation/duplicates.ts";

test("duplicateCategoryEnum accepts all 6 canonical categories and rejects invalid values", () => {
  const canonical = ["pothole", "garbage", "water_leakage", "streetlight", "drainage", "other"];
  for (const cat of canonical) {
    assert.equal(duplicateCategoryEnum.parse(cat), cat);
  }

  assert.throws(() => duplicateCategoryEnum.parse("noise_pollution"), /Invalid option/);
  assert.throws(() => duplicateCategoryEnum.parse(""), /Invalid option/);
});

test("duplicateStatusEnum accepts pending, in_progress, and resolved", () => {
  assert.equal(duplicateStatusEnum.parse("pending"), "pending");
  assert.equal(duplicateStatusEnum.parse("in_progress"), "in_progress");
  assert.equal(duplicateStatusEnum.parse("resolved"), "resolved");

  assert.throws(() => duplicateStatusEnum.parse("closed"), /Invalid option/);
  assert.throws(() => duplicateStatusEnum.parse("archived"), /Invalid option/);
});

test("duplicateVisibilityEnum accepts public and private", () => {
  assert.equal(duplicateVisibilityEnum.parse("public"), "public");
  assert.equal(duplicateVisibilityEnum.parse("private"), "private");

  assert.throws(() => duplicateVisibilityEnum.parse("restricted"), /Invalid option/);
});

test("duplicateCandidateSchema validates legitimate candidates with or without photo", () => {
  const candidateWithPhoto = {
    id: "cand-1",
    reference: "CIV-2026-001",
    title: "Deep pothole near junction",
    category: "pothole",
    status: "pending",
    distanceMeters: 42.5,
    supportCount: 4,
    imageUrl: "https://example.com/photos/pothole.jpg",
  };

  const parsed = duplicateCandidateSchema.parse(candidateWithPhoto);
  assert.equal(parsed.id, "cand-1");
  assert.equal(parsed.reference, "CIV-2026-001");
  assert.equal(parsed.category, "pothole");
  assert.equal(parsed.distanceMeters, 42.5);
  assert.equal(parsed.supportCount, 4);
  assert.equal(parsed.imageUrl, "https://example.com/photos/pothole.jpg");

  const candidateWithoutPhoto = {
    id: "cand-2",
    reference: "CIV-2026-002",
    title: "Broken streetlight lamp post",
    category: "streetlight",
    status: "in_progress",
    distanceMeters: 80,
    supportCount: 0,
    imageUrl: null,
  };

  const parsed2 = duplicateCandidateSchema.parse(candidateWithoutPhoto);
  assert.equal(parsed2.imageUrl, null);
});

test("duplicateCandidateSchema rejects invalid distance, support count, or missing fields", () => {
  const base = {
    id: "cand-1",
    reference: "CIV-2026-001",
    title: "Pothole",
    category: "pothole",
    status: "pending",
    distanceMeters: 10,
    supportCount: 0,
  };

  // Negative distance
  assert.throws(
    () => duplicateCandidateSchema.parse({ ...base, distanceMeters: -5 }),
    /Distance cannot be negative/
  );

  // Non-finite distance
  assert.throws(
    () => duplicateCandidateSchema.parse({ ...base, distanceMeters: Infinity }),
    /Distance must be/
  );

  // Negative support count
  assert.throws(
    () => duplicateCandidateSchema.parse({ ...base, supportCount: -1 }),
    /Support count cannot be negative/
  );

  // Non-integer support count
  assert.throws(
    () => duplicateCandidateSchema.parse({ ...base, supportCount: 3.5 }),
    /Support count must be an integer/
  );

  // Missing reference
  assert.throws(
    () => duplicateCandidateSchema.parse({ ...base, reference: "" }),
    /Reference code is required/
  );
});

test("duplicateCheckRequestSchema validates spatial check request payloads", () => {
  const valid = {
    category: "water_leakage",
    latitude: 19.3149,
    longitude: 84.7941,
    visibility: "public",
  };

  const parsed = duplicateCheckRequestSchema.parse(valid);
  assert.deepEqual(parsed, valid);

  // Out of range latitude
  assert.throws(
    () => duplicateCheckRequestSchema.parse({ ...valid, latitude: 95.0 }),
    /Latitude cannot exceed 90 degrees/
  );

  // Out of range longitude
  assert.throws(
    () => duplicateCheckRequestSchema.parse({ ...valid, longitude: -195.0 }),
    /Longitude cannot be less than -180 degrees/
  );
});

test("duplicateCheckResponseSchema validates array of duplicate candidates", () => {
  const responsePayload = {
    candidates: [
      {
        id: "cand-1",
        reference: "CIV-2026-001",
        title: "Garbage overflow",
        category: "garbage",
        status: "pending",
        distanceMeters: 35,
        supportCount: 12,
        imageUrl: null,
      },
    ],
  };

  const parsedDirect = duplicateCheckResponseSchema.parse(responsePayload);
  assert.equal(parsedDirect.candidates.length, 1);

  const validated = validateDuplicateCheckResponse(responsePayload);
  assert.equal(validated.candidates.length, 1);
  assert.equal(validated.candidates[0].reference, "CIV-2026-001");

  const safeRes = safeValidateDuplicateCheckResponse({ candidates: "not an array" });
  assert.equal(safeRes.success, false);
});

test("formatDistance formats meters and kilometers cleanly", () => {
  assert.equal(formatDistance(0), "0m away");
  assert.equal(formatDistance(42.4), "42m away");
  assert.equal(formatDistance(99), "99m away");
  assert.equal(formatDistance(999), "999m away");
  assert.equal(formatDistance(1000), "1.0km away");
  assert.equal(formatDistance(1500), "1.5km away");
  assert.equal(formatDistance(3250), "3.3km away");
  assert.equal(formatDistance(-5), "0m away");
  assert.equal(formatDistance(NaN), "0m away");
});

test("formatSupportCount handles singular and plural support labels", () => {
  assert.equal(formatSupportCount(0), "0 supports");
  assert.equal(formatSupportCount(1), "1 support");
  assert.equal(formatSupportCount(2), "2 supports");
  assert.equal(formatSupportCount(47), "47 supports");
  assert.equal(formatSupportCount(-1), "0 supports");
});
