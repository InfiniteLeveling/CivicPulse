import test from "node:test";
import assert from "node:assert/strict";

// Direct relative imports for test execution under Node 24 native type stripping
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  updateProfileSchema,
} from "../src/validators/auth.schema.ts";

import {
  sanitizeRedirectUrl,
  isAdminRole,
  isCitizenRole,
  assertAdmin,
} from "../src/utils/permissions.ts";

import { AppError, toAppError } from "../src/utils/app-error.ts";
import { successResponse, errorResponse } from "../src/utils/api-response.ts";

test("1. Valid citizen registration passes validation", () => {
  const result = registerSchema.safeParse({
    email: "citizen@example.com",
    password: "securepassword123",
    full_name: "Jane Citizen",
  });
  assert.equal(result.success, true);
  if (result.success) {
    assert.equal(result.data.email, "citizen@example.com");
    assert.equal(result.data.full_name, "Jane Citizen");
  }
});

test("2. Invalid email registration is rejected", () => {
  const result = registerSchema.safeParse({
    email: "not-an-email",
    password: "securepassword123",
    full_name: "Jane Citizen",
  });
  assert.equal(result.success, false);
});

test("3. Missing password is rejected", () => {
  const result = registerSchema.safeParse({
    email: "citizen@example.com",
    full_name: "Jane Citizen",
  });
  assert.equal(result.success, false);
});

test("4. Weak password (< 8 chars) is rejected", () => {
  const result = registerSchema.safeParse({
    email: "citizen@example.com",
    password: "short",
    full_name: "Jane Citizen",
  });
  assert.equal(result.success, false);
});

test("5. Registration rejects full_name with leading or trailing whitespace", () => {
  const leading = registerSchema.safeParse({
    email: "citizen@example.com",
    password: "securepassword123",
    full_name: " Jane Citizen",
  });
  assert.equal(leading.success, false);

  const trailing = registerSchema.safeParse({
    email: "citizen@example.com",
    password: "securepassword123",
    full_name: "Jane Citizen ",
  });
  assert.equal(trailing.success, false);
});

test("6. Attempted admin role injection in registration payload is stripped/ignored", () => {
  const payload = {
    email: "citizen@example.com",
    password: "securepassword123",
    full_name: "Jane Citizen",
    role: "admin", // Malicious attempt to inject admin role
  };
  const result = registerSchema.safeParse(payload);
  assert.equal(result.success, true);
  if (result.success) {
    // Assert that role is not part of the validated registration data
    assert.equal((result.data as Record<string, unknown>).role, undefined);
  }
});

test("7. Valid login credentials pass validation", () => {
  const result = loginSchema.safeParse({
    email: "citizen@example.com",
    password: "securepassword123",
  });
  assert.equal(result.success, true);
});

test("8. Login with invalid email is rejected", () => {
  const result = loginSchema.safeParse({
    email: "invalid-email",
    password: "password123",
  });
  assert.equal(result.success, false);
});

test("9. Login with empty password is rejected", () => {
  const result = loginSchema.safeParse({
    email: "citizen@example.com",
    password: "",
  });
  assert.equal(result.success, false);
});

test("10. Forgot password validation handles valid and invalid emails", () => {
  assert.equal(forgotPasswordSchema.safeParse({ email: "user@example.com" }).success, true);
  assert.equal(forgotPasswordSchema.safeParse({ email: "invalid" }).success, false);
});

test("11. Reset password requires minimum 8 characters", () => {
  assert.equal(resetPasswordSchema.safeParse({ password: "12345678" }).success, true);
  assert.equal(resetPasswordSchema.safeParse({ password: "1234567" }).success, false);
});

test("12. Profile update permits valid full_name and rejects whitespace padding", () => {
  assert.equal(updateProfileSchema.safeParse({ full_name: "John Doe" }).success, true);
  assert.equal(updateProfileSchema.safeParse({ full_name: "" }).success, false);
  assert.equal(updateProfileSchema.safeParse({ full_name: "  John" }).success, false);
});

test("13. Redirect URL sanitizer allows safe relative paths", () => {
  assert.equal(sanitizeRedirectUrl("/dashboard"), "/dashboard");
  assert.equal(sanitizeRedirectUrl("/admin/complaints"), "/admin/complaints");
  assert.equal(sanitizeRedirectUrl("/report?category=pothole"), "/report?category=pothole");
});

test("14. Redirect URL sanitizer rejects open redirect attempts", () => {
  assert.equal(sanitizeRedirectUrl("//attacker.com"), "/dashboard");
  assert.equal(sanitizeRedirectUrl("https://attacker.com"), "/dashboard");
  assert.equal(sanitizeRedirectUrl("http://attacker.com/steal"), "/dashboard");
  assert.equal(sanitizeRedirectUrl("javascript:alert(1)"), "/dashboard");
  assert.equal(sanitizeRedirectUrl("\\evil.com"), "/dashboard");
  assert.equal(sanitizeRedirectUrl(null), "/dashboard");
  assert.equal(sanitizeRedirectUrl(undefined), "/dashboard");
  assert.equal(sanitizeRedirectUrl(""), "/dashboard");
});

test("15. AppError maps codes to correct HTTP statuses", () => {
  assert.equal(new AppError("UNAUTHORIZED", "msg").status, 401);
  assert.equal(new AppError("FORBIDDEN", "msg").status, 403);
  assert.equal(new AppError("NOT_FOUND", "msg").status, 404);
  assert.equal(new AppError("CONFLICT", "msg").status, 409);
  assert.equal(new AppError("VALIDATION_ERROR", "msg").status, 422);
  assert.equal(new AppError("INTERNAL_SERVER_ERROR", "msg").status, 500);
});

test("16. toAppError preserves existing AppError and converts unknown errors safely", () => {
  const existing = new AppError("FORBIDDEN", "Forbidden access");
  assert.equal(toAppError(existing), existing);

  const unknown = new Error("Raw database connection error with secret token");
  const converted = toAppError(unknown);
  assert.equal(converted.status, 500);
  assert.equal(converted.publicMessage, "An unexpected error occurred.");
  assert.equal(converted.cause, unknown);
});

test("17. successResponse serializes data and applies Cache-Control: no-store", () => {
  const res = successResponse({ user: { id: "123", role: "citizen" } });
  assert.equal(res.status, 200);
  assert.equal(res.headers.get("Cache-Control"), "no-store");
});

test("18. errorResponse serializes safe error envelope and applies Cache-Control: no-store", () => {
  const res = errorResponse(new AppError("UNAUTHORIZED", "Authentication required"));
  assert.equal(res.status, 401);
  assert.equal(res.headers.get("Cache-Control"), "no-store");
});

test("19. Role helpers distinguish citizen and admin roles", () => {
  assert.equal(isAdminRole("admin"), true);
  assert.equal(isAdminRole("citizen"), false);
  assert.equal(isAdminRole(undefined), false);

  assert.equal(isCitizenRole("citizen"), true);
  assert.equal(isCitizenRole("admin"), false);
  assert.equal(isCitizenRole(null), false);
});

test("20. assertAdmin allows admin and throws 403 FORBIDDEN for citizen", () => {
  const citizen = { id: "u-1", full_name: "Citizen", role: "citizen" as const };
  const admin = { id: "u-2", full_name: "Admin", role: "admin" as const };

  assert.throws(() => assertAdmin(citizen), (err) => err instanceof AppError && err.status === 403 && err.code === "FORBIDDEN");
  assert.doesNotThrow(() => assertAdmin(admin));
});
