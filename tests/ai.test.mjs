import test from "node:test";
import assert from "node:assert/strict";
import {
  aiCategoryEnum,
  aiSeverityEnum,
  aiClassifyRequestSchema,
  aiClassifyResultSchema,
  validateAIClassification,
  safeValidateAIClassification,
} from "../src/lib/validation/ai.ts";

test("aiCategoryEnum accepts all 6 canonical categories and rejects invalid values", () => {
  const canonical = ["pothole", "garbage", "water_leakage", "streetlight", "drainage", "other"];
  for (const cat of canonical) {
    assert.equal(aiCategoryEnum.parse(cat), cat);
  }

  assert.throws(() => aiCategoryEnum.parse("footpath_damage"), /Invalid option/);
  assert.throws(() => aiCategoryEnum.parse("road_accident"), /Invalid option/);
  assert.throws(() => aiCategoryEnum.parse(""), /Invalid option/);
});

test("aiSeverityEnum accepts canonical severities (low, medium, high, critical) and rejects others", () => {
  const canonical = ["low", "medium", "high", "critical"];
  for (const sev of canonical) {
    assert.equal(aiSeverityEnum.parse(sev), sev);
  }

  assert.throws(() => aiSeverityEnum.parse("urgent"), /Invalid option/);
  assert.throws(() => aiSeverityEnum.parse("moderate"), /Invalid option/);
});

test("aiClassifyRequestSchema requires a non-empty imageId", () => {
  assert.deepEqual(
    aiClassifyRequestSchema.parse({ imageId: "img-12345" }),
    { imageId: "img-12345" }
  );

  assert.throws(() => aiClassifyRequestSchema.parse({ imageId: "" }), /A valid image identifier is required/);
  assert.throws(() => aiClassifyRequestSchema.parse({ imageId: "   " }), /A valid image identifier is required/);
  assert.throws(() => aiClassifyRequestSchema.parse({}), /expected string/i);
});

test("aiClassifyResultSchema validates legitimate AI responses for civic and non-civic issues", () => {
  const validCivic = {
    analysisId: "analysis-999",
    category: "pothole",
    severity: "high",
    description: "Deep pothole in asphalt surface approximately 50cm wide.",
    isCivicIssue: true,
  };
  const parsedCivic = aiClassifyResultSchema.parse(validCivic);
  assert.deepEqual(parsedCivic, validCivic);

  const validNonCivic = {
    analysisId: "analysis-888",
    category: "other",
    severity: "low",
    description: "Indoor photograph of an office desk. Does not show public infrastructure.",
    isCivicIssue: false,
  };
  const parsedNonCivic = validateAIClassification(validNonCivic);
  assert.deepEqual(parsedNonCivic, validNonCivic);
});

test("aiClassifyResultSchema rejects malformed responses", () => {
  // Missing analysisId
  const missingId = {
    category: "pothole",
    severity: "high",
    description: "A pothole.",
    isCivicIssue: true,
  };
  const res1 = safeValidateAIClassification(missingId);
  assert.equal(res1.success, false);

  // Invalid category
  const badCategory = {
    analysisId: "analysis-1",
    category: "unknown_category",
    severity: "high",
    description: "A pothole.",
    isCivicIssue: true,
  };
  const res2 = safeValidateAIClassification(badCategory);
  assert.equal(res2.success, false);

  // Missing isCivicIssue
  const missingCivic = {
    analysisId: "analysis-1",
    category: "pothole",
    severity: "high",
    description: "A pothole.",
  };
  const res3 = safeValidateAIClassification(missingCivic);
  assert.equal(res3.success, false);
});

test("aiClassifyResultSchema rejects empty description or whitespace-only strings", () => {
  const emptyDesc = {
    analysisId: "analysis-1",
    category: "pothole",
    severity: "high",
    description: "   ",
    isCivicIssue: true,
  };
  const res = safeValidateAIClassification(emptyDesc);
  assert.equal(res.success, false);
});
