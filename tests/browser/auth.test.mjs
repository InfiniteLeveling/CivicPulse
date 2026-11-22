import assert from "node:assert/strict";
import { after, afterEach, before, beforeEach, test } from "node:test";
import { chromium } from "playwright-core";

const baseURL = process.env.CIVICPULSE_TEST_URL ?? "http://127.0.0.1:3000";
let browser, page, errors, apiRequests;

before(async () => {
  browser = await chromium.launch({
    channel: process.env.CIVICPULSE_BROWSER_CHANNEL ?? (process.platform === "win32" ? "msedge" : "chrome"),
    executablePath: process.env.CIVICPULSE_BROWSER_PATH,
  });
});

beforeEach(async () => {
  errors = [];
  apiRequests = [];
  page = await browser.newPage({ baseURL, reducedMotion: "reduce", viewport: { width: 1440, height: 900 } });
  page.setDefaultTimeout(6000);
  page.on("console", (entry) => {
    if (entry.type() === "error") errors.push(entry.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("request", (request) => {
    if (new URL(request.url()).pathname.startsWith("/api/")) apiRequests.push(request.url());
  });
});

afterEach(async () => {
  await page?.close();
  assert.deepEqual(errors, [], "Browser errors");
  assert.deepEqual(apiRequests, [], "Unexpected backend calls during auth UI tests");
});

after(async () => {
  await browser?.close();
});

test("login page renders, validates inputs, toggles password, and displays prototype notice", async () => {
  const response = await page.goto("/login");
  assert.equal(response.status(), 200);

  // Check page title and heading
  assert.equal(await page.title(), "Sign In | CivicPulse");
  await page.getByRole("heading", { level: 1, name: "Welcome Back" }).waitFor();

  // Test empty submission errors
  const signInButton = page.getByRole("button", { name: "Sign In" });
  await signInButton.click();
  await page.getByText("Email address is required.").waitFor();
  await page.getByText("Password is required.").waitFor();

  // Test invalid email format
  const emailInput = page.getByLabel("Email Address");
  await emailInput.fill("invalid-email-format");
  await signInButton.click();
  await page.getByText("Please enter a valid email address.").waitFor();

  // Test password toggle
  const passwordInput = page.locator("#login-password");
  assert.equal(await passwordInput.getAttribute("type"), "password");
  const toggleButton = page.getByRole("button", { name: "Show password" });
  await toggleButton.click();
  assert.equal(await passwordInput.getAttribute("type"), "text");
  await page.getByRole("button", { name: "Hide password" }).click();
  assert.equal(await passwordInput.getAttribute("type"), "password");

  // Forgot password notice when email is not yet filled
  await page.getByRole("button", { name: "Forgot password?" }).click();
  await page.getByText(/Please enter your email address first/i).waitFor();

  // Valid submission checks configuration without creating fake session
  await emailInput.fill("citizen@example.com");
  await passwordInput.fill("SecurePass123!");
  await signInButton.click();
  await page.getByText(/Supabase credentials are required in .env.local to authenticate/i).first().waitFor();

  // Verify no fake session or user token was set in localStorage
  const localStorageContent = await page.evaluate(() => JSON.stringify(window.localStorage));
  assert.ok(!localStorageContent.includes("supabase"), "No fake supabase session stored");
  assert.ok(!localStorageContent.includes("access_token"), "No fake auth token stored");

  // Navigation to register
  await page.getByRole("link", { name: "Create an Account" }).click();
  await page.waitForURL(url => url.pathname === "/register");
  await page.getByRole("heading", { level: 1, name: "Join CivicPulse" }).waitFor();
});

test("registration page validates inputs, enforces password policies, checks confirmation, and lacks role selection", async () => {
  const response = await page.goto("/register");
  assert.equal(response.status(), 200);

  assert.equal(await page.title(), "Create Account | CivicPulse");
  await page.getByRole("heading", { level: 1, name: "Join CivicPulse" }).waitFor();

  // Verify critical security requirement: NO role selection field exists
  assert.equal(await page.locator("select[name='role']").count(), 0);
  assert.equal(await page.locator("input[name='role']").count(), 0);
  assert.equal(await page.getByText("Admin role", { exact: false }).count(), 0);

  // Empty submission triggers validation errors
  const createButton = page.getByRole("button", { name: "Create Account" });
  await createButton.click();
  await page.getByText("Full name is required.").waitFor();
  await page.getByText("Email address is required.").waitFor();
  await page.getByText("Password is required.").waitFor();

  // Test short name
  const nameInput = page.getByLabel("Full Name");
  await nameInput.fill("A");
  await createButton.click();
  await page.getByText("Full name must be at least 2 characters.").waitFor();

  // Test valid name
  await nameInput.fill("Jane Citizen");

  // Test invalid email
  const emailInput = page.getByLabel("Email Address");
  await emailInput.fill("notanemail");
  await createButton.click();
  await page.getByText("Please enter a valid email address.").waitFor();
  await emailInput.fill("jane@example.com");

  // Test short password
  const passwordInput = page.locator("#register-password");
  await passwordInput.fill("short");
  await createButton.click();
  await page.getByText("Password must be at least 8 characters long.").waitFor();

  // Test password strength indicator updates
  await passwordInput.fill("StrongPassphrase#2026");
  await page.getByText("Strong passphrase").waitFor();

  // Test password mismatch
  const confirmPasswordInput = page.locator("#register-confirm-password");
  await confirmPasswordInput.fill("DifferentPass#2026");
  await createButton.click();
  await page.getByText("Passwords do not match.").waitFor();

  // Fix password mismatch and submit
  await confirmPasswordInput.fill("StrongPassphrase#2026");
  await createButton.click();
  await page.getByText(/Supabase credentials are required in .env.local to register/i).first().waitFor();

  // Navigation back to login
  await page.getByRole("link", { name: "Sign In" }).click();
  await page.waitForURL(url => url.pathname === "/login");
});

test("auth pages are responsive with zero horizontal overflow across 5 viewports", async () => {
  for (const path of ["/login", "/register"]) {
    await page.goto(path);
    for (const width of [320, 375, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 850 });
      assert.equal(
        await page.evaluate(() => document.documentElement.scrollWidth),
        width,
        `Horizontal overflow on ${path} at width ${width}`
      );

      // Verify Back to Home link is present and reachable
      const homeLink = page.getByRole("link", { name: /Home|Back to Home/ }).first();
      assert.equal(await homeLink.isVisible(), true);
    }
  }
});
