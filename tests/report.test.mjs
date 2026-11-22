import assert from "node:assert/strict";
import test from "node:test";
import {
  reportBasicsSchema,
  createReportSchema,
  validateCreateReport,
  safeValidateCreateReport,
  ISSUE_CATEGORIES,
  REPORT_VISIBILITIES,
} from "../src/lib/validation/report.ts";

test("reportBasicsSchema validates legitimate report data", () => {
  const input = {
    title: "Large pothole near campus entrance",
    description: "Deep crater in asphalt causing hazard for cyclists and scooters at the junction.",
    category: "pothole",
    visibility: "public",
  };

  const result = reportBasicsSchema.safeParse(input);
  assert.equal(result.success, true);
  if (result.success) {
    assert.equal(result.data.title, input.title);
    assert.equal(result.data.description, input.description);
    assert.equal(result.data.category, "pothole");
    assert.equal(result.data.visibility, "public");
  }
});

test("reportBasicsSchema trims surrounding whitespace and rejects whitespace-only values", () => {
  const withWhitespace = {
    title: "   Deep pothole on Main Street   ",
    description: "   Water is accumulating in the depression on the northbound lane.   ",
    category: "pothole",
    visibility: "private",
  };

  const result = reportBasicsSchema.safeParse(withWhitespace);
  assert.equal(result.success, true);
  if (result.success) {
    assert.equal(result.data.title, "Deep pothole on Main Street");
    assert.equal(result.data.description, "Water is accumulating in the depression on the northbound lane.");
  }

  // Whitespace-only title
  const blankTitle = reportBasicsSchema.safeParse({
    ...withWhitespace,
    title: "       ",
  });
  assert.equal(blankTitle.success, false);

  // Whitespace-only description
  const blankDescription = reportBasicsSchema.safeParse({
    ...withWhitespace,
    description: "          ",
  });
  assert.equal(blankDescription.success, false);
});

test("reportBasicsSchema enforces title length boundaries (5 - 120 chars)", () => {
  const base = {
    title: "Valid Title",
    description: "This is a legitimate description of the civic problem.",
    category: "streetlight",
    visibility: "public",
  };

  // Under minimum (4 chars)
  const tooShort = reportBasicsSchema.safeParse({ ...base, title: "Hole" });
  assert.equal(tooShort.success, false);
  if (!tooShort.success) {
    assert.match(tooShort.error.issues[0].message, /at least 5 characters/i);
  }

  // Exactly minimum (5 chars)
  const exactMin = reportBasicsSchema.safeParse({ ...base, title: "12345" });
  assert.equal(exactMin.success, true);

  // Exactly maximum (120 chars)
  const exactMax = reportBasicsSchema.safeParse({ ...base, title: "A".repeat(120) });
  assert.equal(exactMax.success, true);

  // Exceeding maximum (121 chars)
  const tooLong = reportBasicsSchema.safeParse({ ...base, title: "A".repeat(121) });
  assert.equal(tooLong.success, false);
  if (!tooLong.success) {
    assert.match(tooLong.error.issues[0].message, /cannot exceed 120 characters/i);
  }
});

test("reportBasicsSchema enforces description length boundaries (10 - 1000 chars)", () => {
  const base = {
    title: "Broken streetlight fixture",
    description: "This is a legitimate description of the civic problem.",
    category: "streetlight",
    visibility: "public",
  };

  // Under minimum (9 chars)
  const tooShort = reportBasicsSchema.safeParse({ ...base, description: "123456789" });
  assert.equal(tooShort.success, false);
  if (!tooShort.success) {
    assert.match(tooShort.error.issues[0].message, /at least 10 characters/i);
  }

  // Exactly minimum (10 chars)
  const exactMin = reportBasicsSchema.safeParse({ ...base, description: "1234567890" });
  assert.equal(exactMin.success, true);

  // Exactly maximum (1000 chars)
  const exactMax = reportBasicsSchema.safeParse({ ...base, description: "X".repeat(1000) });
  assert.equal(exactMax.success, true);

  // Exceeding maximum (1001 chars)
  const tooLong = reportBasicsSchema.safeParse({ ...base, description: "X".repeat(1001) });
  assert.equal(tooLong.success, false);
  if (!tooLong.success) {
    assert.match(tooLong.error.issues[0].message, /cannot exceed 1000 characters/i);
  }
});

test("reportBasicsSchema accepts all canonical issue categories and rejects invalid values", () => {
  const base = {
    title: "Infrastructure hazard",
    description: "Detailed report of the civic infrastructure defect.",
    visibility: "public",
  };

  for (const cat of ISSUE_CATEGORIES) {
    const res = reportBasicsSchema.safeParse({ ...base, category: cat });
    assert.equal(res.success, true, `Category ${cat} should be valid`);
  }

  // Missing category
  const missing = reportBasicsSchema.safeParse({ ...base, category: undefined });
  assert.equal(missing.success, false);

  // Invalid category
  const invalid = reportBasicsSchema.safeParse({ ...base, category: "flying_car" });
  assert.equal(invalid.success, false);
});

test("reportBasicsSchema accepts canonical visibilities (public, private) and rejects invalid", () => {
  const base = {
    title: "Infrastructure hazard",
    description: "Detailed report of the civic infrastructure defect.",
    category: "drainage",
  };

  for (const vis of REPORT_VISIBILITIES) {
    const res = reportBasicsSchema.safeParse({ ...base, visibility: vis });
    assert.equal(res.success, true, `Visibility ${vis} should be valid`);
  }

  const invalid = reportBasicsSchema.safeParse({ ...base, visibility: "classified" });
  assert.equal(invalid.success, false);
});

test("createReportSchema validates canonical full report payload", () => {
  const input = {
    title: "Dangerous pothole at junction",
    description: "Deep pothole causing serious hazard to traffic and two-wheelers.",
    category: "pothole",
    visibility: "public",
    latitude: 19.3149,
    longitude: 84.7941,
    imageId: "img_upload_789xyz",
    analysisId: "ai_analysis_456abc",
    confirmedSeparateFromIds: ["rep_001", "rep_002"],
  };

  const parsed = createReportSchema.parse(input);
  assert.deepEqual(parsed, validateCreateReport(input));
  assert.equal(parsed.title, input.title);
  assert.equal(parsed.description, input.description);
  assert.equal(parsed.category, "pothole");
  assert.equal(parsed.visibility, "public");
  assert.equal(parsed.latitude, 19.3149);
  assert.equal(parsed.longitude, 84.7941);
  assert.equal(parsed.imageId, "img_upload_789xyz");
  assert.equal(parsed.analysisId, "ai_analysis_456abc");
  assert.deepEqual(parsed.confirmedSeparateFromIds, ["rep_001", "rep_002"]);
});

test("createReportSchema allows optional analysisId and defaults confirmedSeparateFromIds", () => {
  const minimal = {
    title: "Broken streetlight fixture",
    description: "Light pole #42 is flickering and going completely dark at night.",
    category: "streetlight",
    visibility: "private",
    latitude: 12.9716,
    longitude: 77.5946,
    imageId: "img_pole_123",
  };

  const res = safeValidateCreateReport(minimal);
  assert.equal(res.success, true);
  if (res.success) {
    assert.equal(res.data.analysisId, null);
    assert.deepEqual(res.data.confirmedSeparateFromIds, []);
  }
});

test("createReportSchema trims whitespace and enforces length boundaries", () => {
  const base = {
    title: "   Pothole on Main Road   ",
    description: "   Extremely dangerous crater near pedestrian crossing.   ",
    category: "pothole",
    visibility: "public",
    latitude: 20.0,
    longitude: 80.0,
    imageId: "img_valid_id",
  };

  const res = safeValidateCreateReport(base);
  assert.equal(res.success, true);
  if (res.success) {
    assert.equal(res.data.title, "Pothole on Main Road");
    assert.equal(res.data.description, "Extremely dangerous crater near pedestrian crossing.");
  }

  // Title too short (<5)
  assert.equal(safeValidateCreateReport({ ...base, title: "Bad" }).success, false);
  // Title min (5)
  assert.equal(safeValidateCreateReport({ ...base, title: "12345" }).success, true);
  // Title max (120)
  assert.equal(safeValidateCreateReport({ ...base, title: "A".repeat(120) }).success, true);
  // Title too long (>120)
  assert.equal(safeValidateCreateReport({ ...base, title: "A".repeat(121) }).success, false);

  // Description too short (<10)
  assert.equal(safeValidateCreateReport({ ...base, description: "123456789" }).success, false);
  // Description min (10)
  assert.equal(safeValidateCreateReport({ ...base, description: "1234567890" }).success, true);
  // Description max (1000)
  assert.equal(safeValidateCreateReport({ ...base, description: "B".repeat(1000) }).success, true);
  // Description too long (>1000)
  assert.equal(safeValidateCreateReport({ ...base, description: "B".repeat(1001) }).success, false);
});

test("createReportSchema enforces finite coordinate boundaries", () => {
  const base = {
    title: "Valid Issue Title",
    description: "Valid issue description meeting length constraints.",
    category: "drainage",
    visibility: "public",
    imageId: "img_valid_id",
  };

  // Valid boundary latitude: -90 and 90
  assert.equal(safeValidateCreateReport({ ...base, latitude: -90, longitude: 0 }).success, true);
  assert.equal(safeValidateCreateReport({ ...base, latitude: 90, longitude: 0 }).success, true);
  // Invalid latitude
  assert.equal(safeValidateCreateReport({ ...base, latitude: -90.001, longitude: 0 }).success, false);
  assert.equal(safeValidateCreateReport({ ...base, latitude: 90.001, longitude: 0 }).success, false);
  assert.equal(safeValidateCreateReport({ ...base, latitude: NaN, longitude: 0 }).success, false);
  assert.equal(safeValidateCreateReport({ ...base, latitude: Infinity, longitude: 0 }).success, false);

  // Valid boundary longitude: -180 and 180
  assert.equal(safeValidateCreateReport({ ...base, latitude: 0, longitude: -180 }).success, true);
  assert.equal(safeValidateCreateReport({ ...base, latitude: 0, longitude: 180 }).success, true);
  // Invalid longitude
  assert.equal(safeValidateCreateReport({ ...base, latitude: 0, longitude: -180.001 }).success, false);
  assert.equal(safeValidateCreateReport({ ...base, latitude: 0, longitude: 180.001 }).success, false);
  assert.equal(safeValidateCreateReport({ ...base, latitude: 0, longitude: NaN }).success, false);
  assert.equal(safeValidateCreateReport({ ...base, latitude: 0, longitude: -Infinity }).success, false);
});

test("createReportSchema rejects local, temporary, or remote URLs for imageId", () => {
  const base = {
    title: "Valid Issue Title",
    description: "Valid issue description meeting length constraints.",
    category: "pothole",
    visibility: "public",
    latitude: 19.3,
    longitude: 84.7,
  };

  // Rejects blob URL
  const blobRes = safeValidateCreateReport({ ...base, imageId: "blob:http://localhost:3000/12345" });
  assert.equal(blobRes.success, false);
  if (!blobRes.success) {
    assert.match(blobRes.error.issues[0].message, /server-returned identifier/i);
  }

  // Rejects data URL
  const dataRes = safeValidateCreateReport({ ...base, imageId: "data:image/png;base64,iVBORw0KGgoAAAANS..." });
  assert.equal(dataRes.success, false);

  // Rejects http/https URLs
  assert.equal(safeValidateCreateReport({ ...base, imageId: "http://example.com/photo.jpg" }).success, false);
  assert.equal(safeValidateCreateReport({ ...base, imageId: "https://example.com/photo.jpg" }).success, false);

  // Rejects empty or whitespace imageId
  assert.equal(safeValidateCreateReport({ ...base, imageId: "" }).success, false);
  assert.equal(safeValidateCreateReport({ ...base, imageId: "    " }).success, false);
});

test("createReportSchema deduplicates confirmedSeparateFromIds", () => {
  const base = {
    title: "Valid Issue Title",
    description: "Valid issue description meeting length constraints.",
    category: "garbage",
    visibility: "public",
    latitude: 19.3,
    longitude: 84.7,
    imageId: "img_server_stored_id",
    confirmedSeparateFromIds: ["dup-1", "dup-2", "dup-1", "dup-3", "dup-2"],
  };

  const res = safeValidateCreateReport(base);
  assert.equal(res.success, true);
  if (res.success) {
    assert.deepEqual(res.data.confirmedSeparateFromIds, ["dup-1", "dup-2", "dup-3"]);
  }
});
