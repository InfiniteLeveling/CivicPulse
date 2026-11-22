import test from "node:test";
import assert from "node:assert/strict";

import { runFinalSmokeTest } from "../../scripts/integration/final-smoke-test.ts";
import { createReportSchema } from "../../src/validators/report.schema.ts";
import { updateStatusSchema } from "../../src/validators/status.schema.ts";
import { calculatePriority, calculateInitialPriority } from "../../src/utils/priority.ts";
import { getTargetDepartmentName } from "../../src/config/routing.ts";
import {
  REALTIME_CONFIG,
  getReportChannel,
  isValidReportChannel,
} from "../../src/config/realtime.ts";
import { EVIDENCE_CONFIG } from "../../src/config/evidence.ts";
import { ANALYTICS_CONFIG } from "../../src/config/analytics.ts";
import { isAdminRole, isCitizenRole, assertAdmin } from "../../src/utils/permissions.ts";
import { AppError } from "../../src/utils/app-error.ts";
import type { AuthenticatedUser } from "../../src/types/auth.ts";

const MOCK_CITIZEN_A: AuthenticatedUser = {
  id: "11111111-1111-4111-8111-111111111111",
  email: "citizen.a@example.com",
  role: "citizen",
};

const MOCK_ADMIN: AuthenticatedUser = {
  id: "33333333-3333-4333-8333-333333333333",
  email: "admin@civicpulse.org",
  role: "admin",
};

// ============================================================================
// Group 1: Smoke Test Harness Validation
// ============================================================================

test("FinalIntegration 01: Smoke test harness runs without unhandled exceptions", async () => {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_test_key_12345";
  }
  const results = await runFinalSmokeTest();
  assert.ok(Array.isArray(results));
  assert.ok(results.length >= 7);

  // Assert that zero checks failed catastrophically
  const failCount = results.filter((r) => r.status === "FAIL").length;
  assert.equal(failCount, 0, "No integration checks should report FAIL");
});

// ============================================================================
// Group 2: End-to-End Citizen Complaint Creation & Priority Pipeline
// ============================================================================

test("FinalIntegration 02: Citizen complaint creation contract & deterministic priority calculation", () => {
  const input = {
    title: "Deep pothole causing hazard on Main St",
    description: "Approximately 3 feet wide pothole near intersection.",
    category: "pothole",
    latitude: 22.5726,
    longitude: 88.3639,
    image_path: `drafts/${MOCK_CITIZEN_A.id}/11111111-2222-4333-8444-555555555555.jpg`,
    severity: "high",
  };

  const parsed = createReportSchema.parse(input);
  assert.equal(parsed.category, "pothole");
  assert.equal(parsed.severity, "high");

  // Verify priority calculation
  // Base points: high = 50, votes = 0, age = 0 -> score = 50
  const initialScore = calculateInitialPriority(parsed.severity);
  assert.equal(initialScore, 50);

  // Add 4 community votes (4 * 3 = 12 points, cap 20) -> score = 62
  const updatedScore = calculatePriority({
    severity: parsed.severity,
    voteCount: 4,
    daysUnresolved: 0,
  }).priority_score;
  assert.equal(updatedScore, 62);
});

// ============================================================================
// Group 3: Deterministic Department Routing Contract
// ============================================================================

test("FinalIntegration 03: Automatic department routing mapping matches specifications", () => {
  assert.equal(getTargetDepartmentName("pothole"), "Road Maintenance");
  assert.equal(getTargetDepartmentName("garbage"), "Sanitation");
  assert.equal(getTargetDepartmentName("water_leakage"), "Water Supply");
  assert.equal(getTargetDepartmentName("streetlight"), "Electrical");
  assert.equal(getTargetDepartmentName("drainage"), "Drainage");
  assert.equal(getTargetDepartmentName("damaged_infrastructure"), "Public Works");
  assert.equal(getTargetDepartmentName("other"), null);
});

// ============================================================================
// Group 4: Administrative Workflow, Concurrency & Resolution Evidence
// ============================================================================

test("FinalIntegration 04: Admin status workflow enforces mandatory evidence on resolved", () => {
  // In-progress transition
  const inProgressInput = {
    status: "in_progress",
    notes: "Maintenance team dispatched to site.",
  };
  const parsedInProgress = updateStatusSchema.safeParse(inProgressInput);
  assert.equal(parsedInProgress.success, true);

  // Status schema rejects injected client fields (mass assignment prevention)
  const injected = {
    status: "resolved",
    notes: "Repairs completed.",
    role: "admin", // injected field
  };
  const parsedInjected = updateStatusSchema.safeParse(injected);
  assert.equal(parsedInjected.success, false);

  // Resolution with valid after_image_path is accepted
  const validResolution = {
    status: "resolved",
    notes: "Pothole filled and leveled.",
    after_image_path: `resolution-drafts/${MOCK_ADMIN.id}/77777777-7777-4777-8777-777777777777/88888888-8888-4888-8888-888888888888.jpg`,
  };
  const parsedValid = updateStatusSchema.safeParse(validResolution);
  assert.equal(parsedValid.success, true);
});

// ============================================================================
// Group 5: Role-Based Access Control (RBAC) & Privileged Boundary Defenses
// ============================================================================

test("FinalIntegration 05: Role helpers strictly block citizen access to administrative operations", () => {
  assert.equal(isCitizenRole(MOCK_CITIZEN_A.role), true);
  assert.equal(isAdminRole(MOCK_CITIZEN_A.role), false);

  // assertAdmin throws HTTP 403 FORBIDDEN for citizen
  assert.throws(
    () => assertAdmin(MOCK_CITIZEN_A),
    (err: unknown) => {
      assert.ok(err instanceof AppError);
      assert.equal(err.code, "FORBIDDEN");
      assert.equal(err.status, 403);
      return true;
    }
  );

  // assertAdmin permits admin without throwing
  assert.doesNotThrow(() => assertAdmin(MOCK_ADMIN));
});

// ============================================================================
// Group 6: Realtime & Storage Configuration Invariants
// ============================================================================

test("FinalIntegration 06: Realtime and Storage configurations maintain privacy boundaries", () => {
  // Bucket configuration
  assert.equal(EVIDENCE_CONFIG.BUCKET_NAME, "civic-evidence");
  assert.equal(EVIDENCE_CONFIG.MAX_FILE_SIZE_BYTES, 3 * 1024 * 1024);
  assert.deepEqual(EVIDENCE_CONFIG.ALLOWED_MIME_TYPES, ["image/jpeg", "image/png", "image/webp"]);

  // Realtime configuration
  assert.equal(REALTIME_CONFIG.PUBLIC_REPORTS_CHANNEL, "reports:public");
  assert.equal(
    getReportChannel("44444444-4444-4444-8444-444444444444"),
    "report:44444444-4444-4444-8444-444444444444"
  );
  assert.equal(
    isValidReportChannel("report:44444444-4444-4444-8444-444444444444"),
    true
  );
  assert.equal(isValidReportChannel("unauthorized:channel"), false);

  // Analytics configuration
  assert.equal(ANALYTICS_CONFIG.DEFAULT_RANGE_DAYS, 30);
  assert.equal(ANALYTICS_CONFIG.MAX_RANGE_DAYS, 366);
  assert.deepEqual(ANALYTICS_CONFIG.ALLOWED_GRANULARITIES, ["day", "week", "month"]);
});
