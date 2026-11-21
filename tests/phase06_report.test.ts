import test from "node:test";
import assert from "node:assert/strict";

import { createReportSchema } from "../src/validators/report.schema.ts";
import {
  REPORT_CATEGORIES,
  REPORT_SEVERITIES,
} from "../src/types/report.ts";
import { verifyOwnedDraftPath } from "../src/services/storage.service.ts";
import { createReport } from "../src/services/report.service.ts";
import { AppError } from "../src/utils/app-error.ts";
import { successResponse, errorResponse } from "../src/utils/api-response.ts";
import type { SupabaseClient } from "@supabase/supabase-js";

const CITIZEN_A = "11111111-1111-4111-8111-111111111111";
const CITIZEN_B = "22222222-2222-4222-8222-222222222222";
const IMAGE_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const VALID_DRAFT_PATH = `drafts/${CITIZEN_A}/${IMAGE_A}.jpg`;

// --- Input Validation Tests ---

test("1. Valid complaint passes Zod validation", () => {
  const result = createReportSchema.safeParse({
    title: "Large pothole on Park Street",
    description: "Deep pothole causing vehicular traffic disruption near entrance.",
    category: "pothole",
    latitude: 22.5726,
    longitude: 88.3639,
    image_path: VALID_DRAFT_PATH,
  });
  assert.equal(result.success, true);
  if (result.success) {
    assert.equal(result.data.title, "Large pothole on Park Street");
    assert.equal(result.data.severity, "medium"); // Default
  }
});

test("2. Missing title is rejected", () => {
  const result = createReportSchema.safeParse({
    description: "Deep pothole causing vehicular traffic disruption near entrance.",
    category: "pothole",
    latitude: 22.5726,
    longitude: 88.3639,
    image_path: VALID_DRAFT_PATH,
  });
  assert.equal(result.success, false);
});

test("3. Short title (< 5 chars) is rejected", () => {
  const result = createReportSchema.safeParse({
    title: "Tiny",
    description: "Deep pothole causing vehicular traffic disruption near entrance.",
    category: "pothole",
    latitude: 22.5726,
    longitude: 88.3639,
    image_path: VALID_DRAFT_PATH,
  });
  assert.equal(result.success, false);
});

test("4. Long title (> 120 chars) is rejected", () => {
  const result = createReportSchema.safeParse({
    title: "A".repeat(121),
    description: "Deep pothole causing vehicular traffic disruption near entrance.",
    category: "pothole",
    latitude: 22.5726,
    longitude: 88.3639,
    image_path: VALID_DRAFT_PATH,
  });
  assert.equal(result.success, false);
});

test("5. Title with leading or trailing whitespace is rejected", () => {
  const leading = createReportSchema.safeParse({
    title: " Pothole issue here",
    description: "Deep pothole causing vehicular traffic disruption near entrance.",
    category: "pothole",
    latitude: 22.5726,
    longitude: 88.3639,
    image_path: VALID_DRAFT_PATH,
  });
  assert.equal(leading.success, false);

  const trailing = createReportSchema.safeParse({
    title: "Pothole issue here ",
    description: "Deep pothole causing vehicular traffic disruption near entrance.",
    category: "pothole",
    latitude: 22.5726,
    longitude: 88.3639,
    image_path: VALID_DRAFT_PATH,
  });
  assert.equal(trailing.success, false);
});

test("6. Missing description is rejected", () => {
  const result = createReportSchema.safeParse({
    title: "Large pothole on Park Street",
    category: "pothole",
    latitude: 22.5726,
    longitude: 88.3639,
    image_path: VALID_DRAFT_PATH,
  });
  assert.equal(result.success, false);
});

test("7. Short description (< 10 chars) is rejected", () => {
  const result = createReportSchema.safeParse({
    title: "Large pothole on Park Street",
    description: "Too short",
    category: "pothole",
    latitude: 22.5726,
    longitude: 88.3639,
    image_path: VALID_DRAFT_PATH,
  });
  assert.equal(result.success, false);
});

test("8. Long description (> 1000 chars) is rejected", () => {
  const result = createReportSchema.safeParse({
    title: "Large pothole on Park Street",
    description: "A".repeat(1001),
    category: "pothole",
    latitude: 22.5726,
    longitude: 88.3639,
    image_path: VALID_DRAFT_PATH,
  });
  assert.equal(result.success, false);
});

test("9. Description with leading or trailing whitespace is rejected", () => {
  const result = createReportSchema.safeParse({
    title: "Large pothole on Park Street",
    description: " Leading whitespace in description text.",
    category: "pothole",
    latitude: 22.5726,
    longitude: 88.3639,
    image_path: VALID_DRAFT_PATH,
  });
  assert.equal(result.success, false);
});

test("10. Invalid category is rejected", () => {
  const result = createReportSchema.safeParse({
    title: "Large pothole on Park Street",
    description: "Deep pothole causing vehicular traffic disruption near entrance.",
    category: "alien_invasion",
    latitude: 22.5726,
    longitude: 88.3639,
    image_path: VALID_DRAFT_PATH,
  });
  assert.equal(result.success, false);
});

test("11. All 7 canonical categories are accepted", () => {
  for (const cat of REPORT_CATEGORIES) {
    const result = createReportSchema.safeParse({
      title: "Valid issue heading",
      description: "Detailed description of the civic problem encountered.",
      category: cat,
      latitude: 22.5726,
      longitude: 88.3639,
      image_path: VALID_DRAFT_PATH,
    });
    assert.equal(result.success, true, `Category ${cat} should be valid`);
  }
});

test("12. Invalid latitude values (< -90 or > 90) are rejected", () => {
  const tooHigh = createReportSchema.safeParse({
    title: "Valid issue heading",
    description: "Detailed description of the civic problem encountered.",
    category: "pothole",
    latitude: 90.001,
    longitude: 88.3639,
    image_path: VALID_DRAFT_PATH,
  });
  assert.equal(tooHigh.success, false);

  const tooLow = createReportSchema.safeParse({
    title: "Valid issue heading",
    description: "Detailed description of the civic problem encountered.",
    category: "pothole",
    latitude: -90.001,
    longitude: 88.3639,
    image_path: VALID_DRAFT_PATH,
  });
  assert.equal(tooLow.success, false);
});

test("13. Invalid longitude values (< -180 or > 180) are rejected", () => {
  const tooHigh = createReportSchema.safeParse({
    title: "Valid issue heading",
    description: "Detailed description of the civic problem encountered.",
    category: "pothole",
    latitude: 22.5726,
    longitude: 180.001,
    image_path: VALID_DRAFT_PATH,
  });
  assert.equal(tooHigh.success, false);

  const tooLow = createReportSchema.safeParse({
    title: "Valid issue heading",
    description: "Detailed description of the civic problem encountered.",
    category: "pothole",
    latitude: 22.5726,
    longitude: -180.001,
    image_path: VALID_DRAFT_PATH,
  });
  assert.equal(tooLow.success, false);
});

test("14. NaN and Infinity coordinates are rejected", () => {
  const nanLat = createReportSchema.safeParse({
    title: "Valid issue heading",
    description: "Detailed description of the civic problem encountered.",
    category: "pothole",
    latitude: Number.NaN,
    longitude: 88.3639,
    image_path: VALID_DRAFT_PATH,
  });
  assert.equal(nanLat.success, false);

  const infLng = createReportSchema.safeParse({
    title: "Valid issue heading",
    description: "Detailed description of the civic problem encountered.",
    category: "pothole",
    latitude: 22.5726,
    longitude: Number.POSITIVE_INFINITY,
    image_path: VALID_DRAFT_PATH,
  });
  assert.equal(infLng.success, false);
});

test("15. Zero coordinates (0, 0) and negative coordinates are accepted", () => {
  const result = createReportSchema.safeParse({
    title: "Issue at Null Island",
    description: "Detailed description of civic problem located at 0, 0 coordinates.",
    category: "drainage",
    latitude: 0,
    longitude: 0,
    image_path: VALID_DRAFT_PATH,
  });
  assert.equal(result.success, true);
  if (result.success) {
    assert.equal(result.data.latitude, 0);
    assert.equal(result.data.longitude, 0);
  }
});

test("16. Missing image_path is rejected", () => {
  const result = createReportSchema.safeParse({
    title: "Valid issue heading",
    description: "Detailed description of the civic problem encountered.",
    category: "pothole",
    latitude: 22.5726,
    longitude: 88.3639,
  });
  assert.equal(result.success, false);
});

test("17. Malformed image_path is rejected", () => {
  const invalidPaths = [
    "not-a-draft-path.jpg",
    "http://example.com/image.jpg",
    "drafts/invalid-uuid/not-uuid.jpg",
    "drafts/11111111-1111-4111-8111-111111111111/photo.exe",
    "/drafts/11111111-1111-4111-8111-111111111111/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa.jpg",
  ];
  for (const path of invalidPaths) {
    const result = createReportSchema.safeParse({
      title: "Valid issue heading",
      description: "Detailed description of the civic problem encountered.",
      category: "pothole",
      latitude: 22.5726,
      longitude: 88.3639,
      image_path: path,
    });
    assert.equal(result.success, false, `Path "${path}" should be rejected`);
  }
});

test("18. Path traversal sequences in image_path are rejected", () => {
  const traversalPaths = [
    `drafts/${CITIZEN_A}/../admin/secret.jpg`,
    `drafts/${CITIZEN_A}//${IMAGE_A}.jpg`,
    `drafts\\${CITIZEN_A}\\${IMAGE_A}.jpg`,
  ];
  for (const path of traversalPaths) {
    const result = createReportSchema.safeParse({
      title: "Valid issue heading",
      description: "Detailed description of the civic problem encountered.",
      category: "pothole",
      latitude: 22.5726,
      longitude: 88.3639,
      image_path: path,
    });
    assert.equal(result.success, false, `Traversal path "${path}" should be rejected`);
  }
});

test("19. Strict validation rejects client injection of privileged fields", () => {
  const privilegedPayloads = [
    { user_id: CITIZEN_B },
    { role: "admin" },
    { status: "resolved" },
    { priority_score: 100 },
    { department_id: "33333333-3333-4333-8333-333333333333" },
    { resolved_at: new Date().toISOString() },
  ];

  for (const injection of privilegedPayloads) {
    const result = createReportSchema.safeParse({
      title: "Valid issue heading",
      description: "Detailed description of the civic problem encountered.",
      category: "pothole",
      latitude: 22.5726,
      longitude: 88.3639,
      image_path: VALID_DRAFT_PATH,
      ...injection,
    });
    assert.equal(result.success, false, `Privileged injection ${JSON.stringify(injection)} must be rejected`);
  }
});

test("20. All canonical severities are accepted", () => {
  for (const sev of REPORT_SEVERITIES) {
    const result = createReportSchema.safeParse({
      title: "Valid issue heading",
      description: "Detailed description of the civic problem encountered.",
      category: "pothole",
      severity: sev,
      latitude: 22.5726,
      longitude: 88.3639,
      image_path: VALID_DRAFT_PATH,
    });
    assert.equal(result.success, true);
    if (result.success) {
      assert.equal(result.data.severity, sev);
    }
  }
});

test("21. Invalid severity is rejected", () => {
  const result = createReportSchema.safeParse({
    title: "Valid issue heading",
    description: "Detailed description of the civic problem encountered.",
    category: "pothole",
    severity: "catastrophic",
    latitude: 22.5726,
    longitude: 88.3639,
    image_path: VALID_DRAFT_PATH,
  });
  assert.equal(result.success, false);
});

test("22. Optional submission_key requires valid UUID format", () => {
  const valid = createReportSchema.safeParse({
    title: "Valid issue heading",
    description: "Detailed description of the civic problem encountered.",
    category: "pothole",
    latitude: 22.5726,
    longitude: 88.3639,
    image_path: VALID_DRAFT_PATH,
    submission_key: "44444444-4444-4444-8444-444444444444",
  });
  assert.equal(valid.success, true);

  const invalid = createReportSchema.safeParse({
    title: "Valid issue heading",
    description: "Detailed description of the civic problem encountered.",
    category: "pothole",
    latitude: 22.5726,
    longitude: 88.3639,
    image_path: VALID_DRAFT_PATH,
    submission_key: "not-a-uuid",
  });
  assert.equal(invalid.success, false);
});

test("23. Unicode multilingual text is accepted and preserved", () => {
  const result = createReportSchema.safeParse({
    title: "সড়কে গভীর গর্ত (Large road pothole)",
    description: "মহাবিদ্যালয়ের প্রধান ফটকের সামনে গভীর গর্তের কারণে যানবাহন চলাচল ব্যাহত হচ্ছে।",
    category: "pothole",
    latitude: 22.5726,
    longitude: 88.3639,
    image_path: VALID_DRAFT_PATH,
  });
  assert.equal(result.success, true);
  if (result.success) {
    assert.equal(result.data.title, "সড়কে গভীর গর্ত (Large road pothole)");
  }
});

// --- Ownership Verification Tests ---

test("24. verifyOwnedDraftPath permits valid owner path", () => {
  const result = verifyOwnedDraftPath(CITIZEN_A, VALID_DRAFT_PATH);
  assert.equal(result.isValid, true);
  assert.equal(result.storagePath, VALID_DRAFT_PATH);
});

test("25. verifyOwnedDraftPath throws 403 FORBIDDEN when Citizen A claims Citizen B draft", () => {
  const foreignPath = `drafts/${CITIZEN_B}/${IMAGE_A}.jpg`;
  assert.throws(
    () => verifyOwnedDraftPath(CITIZEN_A, foreignPath),
    (err: unknown) => {
      assert.ok(err instanceof AppError);
      assert.equal(err.code, "FORBIDDEN");
      assert.equal(err.status, 403);
      return true;
    }
  );
});

// --- Report Service Business Logic & Transaction Tests ---

test("26. Report service rejects duplicate image association with 409 CONFLICT", async () => {
  // Stub client where report_images has existing record for storage_path
  const stubClient = {
    from: (table: string) => {
      assert.equal(table, "report_images");
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({
              data: { id: "existing-image-id", report_id: "existing-report-id" },
              error: null,
            }),
          }),
        }),
      };
    },
  } as unknown as SupabaseClient;

  await assert.rejects(
    async () => {
      await createReport(
        CITIZEN_A,
        {
          title: "Duplicate report attempt",
          description: "This should fail because image is already linked to another report.",
          category: "pothole",
          latitude: 22.5726,
          longitude: 88.3639,
          image_path: VALID_DRAFT_PATH,
        },
        stubClient
      );
    },
    (err: unknown) => {
      assert.ok(err instanceof AppError);
      assert.equal(err.code, "CONFLICT");
      assert.equal(err.status, 409);
      return true;
    }
  );
});

test("27. Report service delegates to atomic RPC when available", async () => {
  const expectedReport = {
    id: "55555555-5555-4555-8555-555555555555",
    reference: "CP-55555555-5555-4555-8555-555555555555",
    title: "Water pipe rupture on main road",
    description: "High pressure drinking water leaking continuously onto the road.",
    category: "water_leakage",
    severity: "high",
    status: "pending",
    priority_score: 0,
    latitude: 22.5726,
    longitude: 88.3639,
    image_count: 1,
    image_path: VALID_DRAFT_PATH,
    created_at: new Date().toISOString(),
  };

  const stubClient = {
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({ data: null, error: null }),
        }),
      }),
    }),
    rpc: async (fn: string, params: Record<string, unknown>) => {
      assert.equal(fn, "civicpulse_create_report");
      assert.equal(params.p_title, expectedReport.title);
      assert.equal(params.p_category, "water_leakage");
      return { data: expectedReport, error: null };
    },
  } as unknown as SupabaseClient;

  const result = await createReport(
    CITIZEN_A,
    {
      title: "Water pipe rupture on main road",
      description: "High pressure drinking water leaking continuously onto the road.",
      category: "water_leakage",
      severity: "high",
      latitude: 22.5726,
      longitude: 88.3639,
      image_path: VALID_DRAFT_PATH,
    },
    stubClient
  );

  assert.equal(result.id, expectedReport.id);
  assert.equal(result.status, "pending");
  assert.equal(result.priority_score, 0);
  assert.equal(result.image_path, VALID_DRAFT_PATH);
});

test("28. Report service handles direct persistence fallback when RPC is missing", async () => {
  const expectedReport = {
    id: "66666666-6666-4666-8666-666666666666",
    reference: "CP-66666666-6666-4666-8666-666666666666",
    title: "Broken streetlight causing hazard",
    description: "Streetlight fixture is loose and hanging dangerously above sidewalk.",
    category: "streetlight",
    severity: "medium",
    status: "pending",
    priority_score: 0,
    latitude: 22.5726,
    longitude: 88.3639,
    created_at: new Date().toISOString(),
  };

  let imageInserted = false;

  const stubClient = {
    from: (table: string) => {
      if (table === "report_images") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: null, error: null }),
            }),
          }),
          insert: async (data: Record<string, unknown>) => {
            assert.equal(data.type, "before");
            assert.equal(data.uploaded_by, CITIZEN_A);
            imageInserted = true;
            return { error: null };
          },
        };
      }
      if (table === "reports") {
        return {
          insert: () => ({
            select: () => ({
              single: async () => ({ data: expectedReport, error: null }),
            }),
          }),
        };
      }
      throw new Error(`Unexpected table ${table}`);
    },
    rpc: async () => {
      // Simulate missing RPC function
      return { data: null, error: { code: "42883", message: "function civicpulse_create_report does not exist" } };
    },
  } as unknown as SupabaseClient;

  const result = await createReport(
    CITIZEN_A,
    {
      title: "Broken streetlight causing hazard",
      description: "Streetlight fixture is loose and hanging dangerously above sidewalk.",
      category: "streetlight",
      latitude: 22.5726,
      longitude: 88.3639,
      image_path: VALID_DRAFT_PATH,
    },
    stubClient
  );

  assert.equal(result.id, expectedReport.id);
  assert.equal(result.status, "pending");
  assert.equal(result.priority_score, 0);
  assert.equal(imageInserted, true);
});

// --- Route Handler Pattern & Response Envelope Tests ---

test("29. Route handler error contract maps UNAUTHORIZED to 401 with no-store", () => {
  const err = new AppError("UNAUTHORIZED", "Authentication required");
  const res = errorResponse(err);
  assert.equal(res.status, 401);
  assert.equal(res.headers.get("cache-control"), "no-store");
});

test("30. Route handler error contract maps VALIDATION_ERROR to 422 with no-store", () => {
  const err = new AppError("VALIDATION_ERROR", "Invalid complaint information");
  const res = errorResponse(err);
  assert.equal(res.status, 422);
  assert.equal(res.headers.get("cache-control"), "no-store");
});

test("31. Route handler error contract maps FORBIDDEN to 403 with no-store", () => {
  const err = new AppError("FORBIDDEN", "Administrative accounts cannot submit citizen reports");
  const res = errorResponse(err);
  assert.equal(res.status, 403);
  assert.equal(res.headers.get("cache-control"), "no-store");
});

test("32. Route handler error contract maps CONFLICT to 409 with no-store", () => {
  const err = new AppError("CONFLICT", "This evidence image has already been associated with another report.");
  const res = errorResponse(err);
  assert.equal(res.status, 409);
  assert.equal(res.headers.get("cache-control"), "no-store");
});

test("33. Route handler success contract produces 201 Created with standard envelope and no-store", async () => {
  const sampleReport = {
    id: "77777777-7777-4777-8777-777777777777",
    reference: "CP-77777777-7777-4777-8777-777777777777",
    title: "Large pothole on Park Street",
    description: "Deep pothole causing vehicular traffic disruption near entrance.",
    category: "pothole" as const,
    severity: "medium" as const,
    status: "pending" as const,
    priority_score: 0,
    latitude: 22.5726,
    longitude: 88.3639,
    image_count: 1,
    image_path: VALID_DRAFT_PATH,
    created_at: new Date().toISOString(),
  };

  const res = successResponse(sampleReport, {
    status: 201,
    message: "Complaint submitted successfully",
  });

  assert.equal(res.status, 201);
  assert.equal(res.headers.get("cache-control"), "no-store");

  const body = await res.json();
  assert.equal(body.success, true);
  assert.equal(body.message, "Complaint submitted successfully");
  assert.equal(body.data.id, sampleReport.id);
  assert.equal(body.data.reference, sampleReport.reference);
  assert.equal(body.data.status, "pending");
  assert.equal(body.data.priority_score, 0);
  assert.equal(body.data.image_count, 1);
});

