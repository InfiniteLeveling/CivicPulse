import test from "node:test";
import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";

import nextConfig from "../../next.config.ts";
import { checkDeploymentEnvironment } from "../../scripts/deployment/check-env.ts";
import { MAX_FILE_SIZE_BYTES } from "../../src/utils/file-validation.ts";

test("DeployConfig 01: package.json specifies supported Node.js engines", () => {
  const pkgPath = path.resolve(process.cwd(), "package.json");
  const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));

  assert.ok(pkg.engines, "package.json must specify engines");
  assert.ok(pkg.engines.node, "package.json must specify engines.node");
  // Node 22 or 24 supported on Vercel
  assert.match(pkg.engines.node, /(22|24)/);
});

test("DeployConfig 02: next.config.ts exports production security headers and strict CSP", async () => {
  assert.ok(nextConfig.headers, "next.config.ts must define headers()");
  const headerRules = await nextConfig.headers!();

  const globalRule = headerRules.find((r) => r.source === "/:path*");
  assert.ok(globalRule, "Must have global header rule");

  const headerMap = new Map(globalRule.headers.map((h) => [h.key, h.value]));
  assert.equal(headerMap.get("X-Frame-Options"), "DENY");
  assert.equal(headerMap.get("X-Content-Type-Options"), "nosniff");
  assert.equal(headerMap.get("Referrer-Policy"), "strict-origin-when-cross-origin");
  assert.match(headerMap.get("Strict-Transport-Security")!, /max-age=63072000/);

  const csp = headerMap.get("Content-Security-Policy");
  assert.ok(csp, "CSP must be configured");
  assert.match(csp, /default-src 'self'/);
  assert.match(csp, /https:\/\/\*\.supabase\.co/);
  assert.match(csp, /https:\/\/generativelanguage\.googleapis\.com/);
  assert.match(csp, /frame-ancestors 'none'/);
});

test("DeployConfig 03: API endpoints are guarded with Cache-Control: no-store", async () => {
  const headerRules = await nextConfig.headers!();
  const apiRule = headerRules.find((r) => r.source === "/api/:path*");
  assert.ok(apiRule, "Must define API-specific caching headers");

  const headerMap = new Map(apiRule.headers.map((h) => [h.key, h.value]));
  assert.match(headerMap.get("Cache-Control")!, /no-store/);
});

test("DeployConfig 04: File upload limits are within Vercel serverless request limits", () => {
  // Vercel serverless function request body cap is 4.5 MB (4,718,592 bytes)
  const VERCEL_MAX_BODY_BYTES = 4.5 * 1024 * 1024;
  assert.ok(
    MAX_FILE_SIZE_BYTES < VERCEL_MAX_BODY_BYTES,
    `MAX_FILE_SIZE_BYTES (${MAX_FILE_SIZE_BYTES}) must fit within Vercel 4.5MB limit (${VERCEL_MAX_BODY_BYTES})`
  );
  assert.equal(MAX_FILE_SIZE_BYTES, 3 * 1024 * 1024); // 3MB
});

test("DeployConfig 05: .gitignore excludes .env files and credentials", () => {
  const gitignorePath = path.resolve(process.cwd(), ".gitignore");
  assert.ok(fs.existsSync(gitignorePath));
  const content = fs.readFileSync(gitignorePath, "utf-8");

  assert.match(content, /\.env/);
  assert.match(content, /node_modules/);
  assert.match(content, /\.next/);
});

test("DeployConfig 06: Database migration directory contains sequential, chronological files", () => {
  const migrationsDir = path.resolve(process.cwd(), "supabase", "migrations");
  assert.ok(fs.existsSync(migrationsDir), "supabase/migrations directory must exist");

  const files = fs.readdirSync(migrationsDir).filter((f) => f.endsWith(".sql"));
  assert.ok(files.length >= 16, `Expected at least 16 migration files, found ${files.length}`);

  // Ensure timestamps are sorted chronologically
  const sorted = [...files].sort();
  assert.deepEqual(files, sorted, "Migration files must be chronologically ordered");

  // Verify key milestone migrations exist
  assert.ok(files.some((f) => f.includes("core_schema")));
  assert.ok(files.some((f) => f.includes("phase03_rls_policies")));
  assert.ok(files.some((f) => f.includes("phase17_realtime_and_resolution")));
  assert.ok(files.some((f) => f.includes("phase18_admin_analytics")));
  assert.ok(files.some((f) => f.includes("phase19_security_hardening")));
});

test("DeployConfig 07: checkDeploymentEnvironment detects dangerous exposed secrets", () => {
  const origKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
  try {
    process.env.NEXT_PUBLIC_GEMINI_API_KEY = "dangerous_exposed_key";
    const report = checkDeploymentEnvironment();
    assert.equal(report.isValid, false);
    assert.ok(report.errors.some((e) => e.includes("CRITICAL SECURITY ERROR")));
  } finally {
    if (origKey !== undefined) process.env.NEXT_PUBLIC_GEMINI_API_KEY = origKey;
    else delete process.env.NEXT_PUBLIC_GEMINI_API_KEY;
  }
});

test("DeployConfig 08: checkDeploymentEnvironment passes when valid public config is supplied", () => {
  const origUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const origKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  try {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://mock.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_test_key_12345";
    const report = checkDeploymentEnvironment();
    assert.ok(report.summary.NEXT_PUBLIC_SUPABASE_URL.configured);
    assert.ok(report.summary.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.configured);
  } finally {
    if (origUrl !== undefined) process.env.NEXT_PUBLIC_SUPABASE_URL = origUrl;
    else delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (origKey !== undefined) process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = origKey;
    else delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  }
});
