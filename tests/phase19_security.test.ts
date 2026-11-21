import test from "node:test";
import assert from "node:assert/strict";

import {
  checkRateLimit,
  enforceRateLimit,
  resetRateLimitStore,
} from "../src/utils/rate-limit.ts";
import nextConfig from "../next.config.ts";
import { AppError } from "../src/utils/app-error.ts";
import {
  assertAdmin,
  isAdminRole,
  isCitizenRole,
  sanitizeRedirectUrl,
} from "../src/utils/permissions.ts";
import {
  validateImageFile,
  MAX_FILE_SIZE_BYTES,
} from "../src/utils/file-validation.ts";
import {
  generateDraftStoragePath,
  generateResolutionDraftStoragePath,
  parseDraftStoragePath,
  parseResolutionDraftStoragePath,
} from "../src/utils/storage-path.ts";
import { getSupabaseConfig } from "../src/lib/env.ts";
import { reportQuerySchema } from "../src/validators/report-query.schema.ts";
import { updateStatusSchema } from "../src/validators/status.schema.ts";
import { assignDepartmentSchema } from "../src/validators/assignment.schema.ts";
import { checkDuplicatesSchema } from "../src/validators/duplicate.schema.ts";
import type { AuthenticatedUser } from "../src/types/auth.ts";

const CITIZEN_A: AuthenticatedUser = {
  id: "11111111-1111-4111-8111-111111111111",
  email: "alice@example.com",
  role: "citizen",
};

const ADMIN_USER: AuthenticatedUser = {
  id: "33333333-3333-4333-8333-333333333333",
  email: "admin@civicpulse.org",
  role: "admin",
};

// ============================================================================
// Group 1: Rate Limiting & Abuse Prevention
// ============================================================================

test("RateLimit 01: checkRateLimit tracks requests and returns correct remaining counts", () => {
  resetRateLimitStore();

  const r1 = checkRateLimit("test-key-1", 3, 60);
  assert.equal(r1.allowed, true);
  assert.equal(r1.remaining, 2);

  const r2 = checkRateLimit("test-key-1", 3, 60);
  assert.equal(r2.allowed, true);
  assert.equal(r2.remaining, 1);

  const r3 = checkRateLimit("test-key-1", 3, 60);
  assert.equal(r3.allowed, true);
  assert.equal(r3.remaining, 0);

  const r4 = checkRateLimit("test-key-1", 3, 60);
  assert.equal(r4.allowed, false);
  assert.equal(r4.remaining, 0);
  assert.ok(r4.resetSeconds > 0);
});

test("RateLimit 02: enforceRateLimit throws AppError with HTTP 429 RATE_LIMITED when exceeded", () => {
  resetRateLimitStore();

  enforceRateLimit("test-action", 2, 60);
  enforceRateLimit("test-action", 2, 60);

  assert.throws(
    () => enforceRateLimit("test-action", 2, 60),
    (err: unknown) => {
      assert.ok(err instanceof AppError);
      assert.equal(err.code, "RATE_LIMITED");
      assert.equal(err.status, 429);
      assert.match(err.message, /Too many requests/);
      return true;
    }
  );
});

test("RateLimit 03: Independent rate limit keys do not interfere with each other", () => {
  resetRateLimitStore();

  enforceRateLimit("user-A", 1, 60);
  assert.throws(() => enforceRateLimit("user-A", 1, 60));

  // user-B should still be permitted
  assert.doesNotThrow(() => enforceRateLimit("user-B", 1, 60));
});

// ============================================================================
// Group 2: Next.js Security Headers & CSP Audit
// ============================================================================

test("SecurityHeaders 01: next.config.ts exports all mandatory security headers", async () => {
  assert.ok(nextConfig.headers, "nextConfig must define headers()");
  const headerRules = await nextConfig.headers!();

  const globalRule = headerRules.find((r) => r.source === "/:path*");
  assert.ok(globalRule, "Must have global header rule for /:path*");

  const headers = new Map(globalRule.headers.map((h) => [h.key, h.value]));

  assert.equal(headers.get("X-Frame-Options"), "DENY");
  assert.equal(headers.get("X-Content-Type-Options"), "nosniff");
  assert.equal(headers.get("Referrer-Policy"), "strict-origin-when-cross-origin");
  assert.match(headers.get("Strict-Transport-Security")!, /max-age=63072000/);
  assert.match(headers.get("Permissions-Policy")!, /camera=\(\)/);

  const csp = headers.get("Content-Security-Policy");
  assert.ok(csp, "CSP header must be present");
  assert.match(csp, /default-src 'self'/);
  assert.match(csp, /https:\/\/\*\.supabase\.co/);
  assert.match(csp, /https:\/\/\*\.tile\.openstreetmap\.org/);
  assert.match(csp, /https:\/\/generativelanguage\.googleapis\.com/);
  assert.match(csp, /frame-ancestors 'none'/);
});

test("SecurityHeaders 02: API routes are configured with Cache-Control: no-store", async () => {
  const headerRules = await nextConfig.headers!();
  const apiRule = headerRules.find((r) => r.source === "/api/:path*");
  assert.ok(apiRule, "Must have dedicated API header rule for /api/:path*");

  const headers = new Map(apiRule.headers.map((h) => [h.key, h.value]));
  assert.match(headers.get("Cache-Control")!, /no-store/);
});

// ============================================================================
// Group 3: Authentication & RBAC Defenses
// ============================================================================

test("RBAC 01: Role helpers distinguish citizen and admin roles strictly", () => {
  assert.equal(isAdminRole("admin"), true);
  assert.equal(isAdminRole("citizen"), false);
  assert.equal(isAdminRole(null), false);
  assert.equal(isAdminRole(""), false);
  assert.equal(isAdminRole("superadmin"), false); // unapproved role

  assert.equal(isCitizenRole("citizen"), true);
  assert.equal(isCitizenRole("admin"), false);
});

test("RBAC 02: assertAdmin rejects citizen accounts with HTTP 403 FORBIDDEN", () => {
  assert.throws(
    () => assertAdmin(CITIZEN_A),
    (err: unknown) => {
      assert.ok(err instanceof AppError);
      assert.equal(err.code, "FORBIDDEN");
      assert.equal(err.status, 403);
      assert.match(err.message, /Administrative privileges required/);
      return true;
    }
  );

  // Admin user should pass without error
  assert.doesNotThrow(() => assertAdmin(ADMIN_USER));
});

test("RBAC 03: sanitizeRedirectUrl neutralizes open redirect attempts", () => {
  assert.equal(sanitizeRedirectUrl("https://evil.com"), "/dashboard");
  assert.equal(sanitizeRedirectUrl("//evil.com"), "/dashboard");
  assert.equal(sanitizeRedirectUrl("javascript:alert(1)"), "/dashboard");
  assert.equal(sanitizeRedirectUrl("/reports?id=123"), "/reports?id=123");
  assert.equal(sanitizeRedirectUrl("/dashboard"), "/dashboard");
  assert.equal(sanitizeRedirectUrl(null), "/dashboard");
});

// ============================================================================
// Group 4: Property-Level Authorization & Injection Defenses
// ============================================================================

test("PropertyAuth 01: assignDepartmentSchema strictly rejects injected client fields", () => {
  const injected = {
    report_id: "44444444-4444-4444-8444-444444444444",
    department_id: "d1111111-1111-4111-8111-111111111111",
    role: "admin", // injected authority
    user_id: CITIZEN_A.id, // injected actor
    status: "resolved", // forged state
  };

  const result = assignDepartmentSchema.safeParse(injected);
  assert.equal(result.success, false);
});

test("PropertyAuth 02: updateStatusSchema strictly rejects injected client fields", () => {
  const injected = {
    status: "in_progress",
    priority_score: 100, // forged priority
    resolved_at: new Date().toISOString(), // forged timestamp
    changed_by: ADMIN_USER.id, // forged actor
  };

  const result = updateStatusSchema.safeParse(injected);
  assert.equal(result.success, false);
});

test("PropertyAuth 03: reportQuerySchema strictly rejects unknown query filters", () => {
  const result = reportQuerySchema.safeParse({
    category: "pothole",
    raw_sql: "DROP TABLE reports", // SQL injection attempt
  });
  assert.equal(result.success, false);
});

// ============================================================================
// Group 5: Object-Level Authorization & Storage Path Isolation
// ============================================================================

test("Storage 01: generateDraftStoragePath constructs user-scoped path", () => {
  const path = generateDraftStoragePath(CITIZEN_A.id, "jpg");
  assert.match(path, new RegExp(`^drafts/${CITIZEN_A.id}/[0-9a-fA-F-]{36}\\.jpg$`));
});

test("Storage 02: parseDraftStoragePath rejects path traversal attempts", () => {
  assert.equal(parseDraftStoragePath(`drafts/../evil/${CITIZEN_A.id}.jpg`).isValid, false);
  assert.equal(parseDraftStoragePath(`drafts/${CITIZEN_A.id}/../../etc/passwd`).isValid, false);
  assert.equal(parseDraftStoragePath(`drafts/${CITIZEN_A.id}/evil.exe`).isValid, false);
});

test("Storage 03: parseResolutionDraftStoragePath strictly bounds admin resolution paths", () => {
  const valid = generateResolutionDraftStoragePath(
    ADMIN_USER.id,
    "44444444-4444-4444-8444-444444444444",
    "png"
  );
  const parsed = parseResolutionDraftStoragePath(valid);
  assert.ok(parsed);
  assert.equal(parsed.adminId, ADMIN_USER.id);
  assert.equal(parsed.reportId, "44444444-4444-4444-8444-444444444444");
  assert.equal(parsed.extension, "png");
});

test("Storage 04: File validation strictly enforces magic byte signatures and file bounds", () => {
  // Valid JPEG header
  const jpegBytes = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
  const res = validateImageFile(jpegBytes, "image/jpeg");
  assert.equal(res.extension, "jpg");

  // Invalid PDF masquerading as JPEG
  const pdfBytes = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d]);
  assert.throws(
    () => validateImageFile(pdfBytes, "image/jpeg"),
    (err: unknown) => {
      assert.ok(err instanceof AppError);
      assert.equal(err.code, "VALIDATION_ERROR");
      return true;
    }
  );

  // SVG file rejected (XSS vector)
  const svgBytes = new Uint8Array(Buffer.from("<svg onload='alert(1)'></svg>"));
  assert.throws(
    () => validateImageFile(svgBytes, "image/svg+xml"),
    (err: unknown) => {
      assert.ok(err instanceof AppError);
      assert.equal(err.code, "VALIDATION_ERROR");
      return true;
    }
  );

  // Oversized file (> 3MB)
  assert.equal(MAX_FILE_SIZE_BYTES, 3 * 1024 * 1024);
  const oversized = new Uint8Array(MAX_FILE_SIZE_BYTES + 1);
  assert.throws(
    () => validateImageFile(oversized, "image/jpeg"),
    (err: unknown) => {
      assert.ok(err instanceof AppError);
      assert.equal(err.code, "VALIDATION_ERROR");
      return true;
    }
  );
});

// ============================================================================
// Group 6: Secrets Separation & Environment Verification
// ============================================================================

test("Secrets 01: getSupabaseConfig exposes only public configuration", () => {
  const origUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const origKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  try {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://mock.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_mock_key_12345";
    const config = getSupabaseConfig();
    assert.ok(config.NEXT_PUBLIC_SUPABASE_URL);
    assert.ok(config.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);

    // Service role key or secret keys must NOT be part of public config
    const configKeys = Object.keys(config);
    assert.equal(configKeys.includes("SUPABASE_SERVICE_ROLE_KEY"), false);
    assert.equal(configKeys.includes("GEMINI_API_KEY"), false);
  } finally {
    if (origUrl !== undefined) process.env.NEXT_PUBLIC_SUPABASE_URL = origUrl;
    else delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (origKey !== undefined) process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = origKey;
    else delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  }
});

test("Secrets 02: GEMINI_API_KEY is not exposed in public environment variables", () => {
  assert.equal(process.env.NEXT_PUBLIC_GEMINI_API_KEY, undefined);
});

// ============================================================================
// Group 7: Geographic & Abuse Constraints
// ============================================================================

test("GeoSecurity 01: checkDuplicatesSchema enforces coordinate ranges and limits", () => {
  const valid = checkDuplicatesSchema.safeParse({
    latitude: 22.5726,
    longitude: 88.3639,
    category: "pothole",
  });
  assert.equal(valid.success, true);

  const invalidLat = checkDuplicatesSchema.safeParse({
    latitude: 95.0, // out of range [-90, 90]
    longitude: 88.3639,
    category: "pothole",
  });
  assert.equal(invalidLat.success, false);

  const invalidLon = checkDuplicatesSchema.safeParse({
    latitude: 22.5726,
    longitude: 195.0, // out of range [-180, 180]
    category: "pothole",
  });
  assert.equal(invalidLon.success, false);

  const invalidCat = checkDuplicatesSchema.safeParse({
    latitude: 22.5726,
    longitude: 88.3639,
    category: "nuclear_waste", // invalid category enum
  });
  assert.equal(invalidCat.success, false);
});
