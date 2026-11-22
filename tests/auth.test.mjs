import assert from "node:assert/strict";
import test from "node:test";
import { getSafeRedirectPath, getRoleRedirectPath } from "../src/lib/auth/redirects.ts";
import { isSupabaseConfigured, createClient } from "../src/lib/supabase/client.ts";

test("getSafeRedirectPath accepts legitimate relative paths", () => {
  assert.equal(getSafeRedirectPath("/dashboard"), "/dashboard");
  assert.equal(getSafeRedirectPath("/admin/complaints"), "/admin/complaints");
  assert.equal(getSafeRedirectPath("/report?step=2"), "/report?step=2");
  assert.equal(getSafeRedirectPath("/my-reports#recent"), "/my-reports#recent");
});

test("getSafeRedirectPath rejects open redirects, protocol-relative, and dangerous schemes", () => {
  const fallback = "/dashboard";
  assert.equal(getSafeRedirectPath("https://evil.com/phish"), fallback);
  assert.equal(getSafeRedirectPath("http://evil.com"), fallback);
  assert.equal(getSafeRedirectPath("//evil.com"), fallback);
  assert.equal(getSafeRedirectPath("/\\evil.com"), fallback);
  assert.equal(getSafeRedirectPath("javascript:alert(1)"), fallback);
  assert.equal(getSafeRedirectPath("data:text/html,<h1>evil</h1>"), fallback);
  assert.equal(getSafeRedirectPath("/dashboard/../admin"), fallback);
  assert.equal(getSafeRedirectPath(""), fallback);
  assert.equal(getSafeRedirectPath(null), fallback);
  assert.equal(getSafeRedirectPath(undefined), fallback);
});

test("getRoleRedirectPath maps verified roles correctly", () => {
  assert.equal(getRoleRedirectPath("admin"), "/admin");
  assert.equal(getRoleRedirectPath("citizen"), "/dashboard");
  assert.equal(getRoleRedirectPath(null), "/login");
  assert.equal(getRoleRedirectPath(undefined), "/login");
});

test("Supabase client fails safely when environment variables are not configured", () => {
  assert.equal(isSupabaseConfigured(), false);
  assert.throws(
    () => createClient(),
    /Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY/
  );
});
