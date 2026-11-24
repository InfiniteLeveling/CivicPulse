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
  page = await browser.newPage({
    baseURL,
    reducedMotion: "reduce",
    viewport: { width: 1440, height: 900 },
  });
  page.setDefaultTimeout(6000);
  page.on("console", (entry) => {
    if (entry.type() === "error") {
      const text = entry.text();
      if (
        text.includes("/api/uploads") ||
        text.includes("/api/ai/classify") ||
        text.includes("/api/reports") ||
        text.includes("/api/stats") ||
        text.includes("404") ||
        text.includes("409") ||
        text.includes("Failed to load resource")
      ) {
        return;
      }
      errors.push(text);
    }
  });
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("request", (request) => {
    if (new URL(request.url()).pathname.startsWith("/api/")) apiRequests.push(request.url());
  });
});

afterEach(async () => {
  await page?.close();
  assert.deepEqual(errors, [], "Browser errors");
});

after(async () => {
  await browser?.close();
});

test("theme toggle renders, opens appearance menu, and switches between light, dark, and system", async () => {
  await page.goto("/");
  await page.getByRole("heading", { level: 1, name: "Your City. Your Voice. Your Impact." }).waitFor();

  // Find theme toggle button
  const toggleBtn = page.getByRole("button", { name: /appearance settings/i }).first();
  await toggleBtn.waitFor();

  // Open theme menu
  await toggleBtn.click();
  const menu = page.getByRole("menu", { name: "Appearance options" });
  await menu.waitFor();

  // Verify all 3 options exist
  const lightOption = page.getByRole("menuitem", { name: /light mode/i });
  const darkOption = page.getByRole("menuitem", { name: /dark mode/i });
  const systemOption = page.getByRole("menuitem", { name: /system default/i });

  await lightOption.waitFor();
  await darkOption.waitFor();
  await systemOption.waitFor();

  // Switch to Dark Mode
  await darkOption.click();
  await page.waitForFunction(() => document.documentElement.classList.contains("dark"));
  const isDark = await page.evaluate(() => document.documentElement.classList.contains("dark"));
  assert.equal(isDark, true, "html tag should have class 'dark'");

  // Verify persistence in localStorage
  const storedTheme = await page.evaluate(() => localStorage.getItem("civicpulse_theme"));
  assert.equal(storedTheme, "dark");

  // Re-open and switch to Light Mode
  await toggleBtn.click();
  await lightOption.click();
  await page.waitForFunction(() => !document.documentElement.classList.contains("dark"));
  const isLight = await page.evaluate(() => !document.documentElement.classList.contains("dark"));
  assert.equal(isLight, true, "html tag should not have class 'dark'");

  // Re-open and switch to System Mode
  await toggleBtn.click();
  await systemOption.click();
  const storedSystem = await page.evaluate(() => localStorage.getItem("civicpulse_theme"));
  assert.equal(storedSystem, "system");
});

test("dark mode persists across navigation and refresh without resetting forms", async () => {
  await page.goto("/");

  // Set theme to dark
  const toggleBtn = page.getByRole("button", { name: /appearance settings/i }).first();
  await toggleBtn.click();
  await page.getByRole("menuitem", { name: /dark mode/i }).click();
  await page.waitForFunction(() => document.documentElement.classList.contains("dark"));

  // Navigate to /report
  await page.goto("/report");
  await page.getByRole("heading", { level: 1, name: "Report a Civic Issue" }).waitFor();

  // Verify dark mode persisted across navigation
  const isDarkOnReport = await page.evaluate(() => document.documentElement.classList.contains("dark"));
  assert.equal(isDarkOnReport, true, "dark mode should persist on /report");

  // Type into form field
  const titleField = page.locator("#report-title-input");
  await titleField.fill("Massive pothole on Main Street");

  // Toggle theme while form has input
  const reportToggleBtn = page.getByRole("button", { name: /appearance settings/i }).first();
  await reportToggleBtn.click();
  await page.getByRole("menuitem", { name: /light mode/i }).click();
  await page.waitForFunction(() => !document.documentElement.classList.contains("dark"));

  // Verify input text was preserved without losing state
  assert.equal(await titleField.inputValue(), "Massive pothole on Main Street");

  // Refresh page and verify light mode is remembered
  await page.reload();
  await page.waitForFunction(() => !document.documentElement.classList.contains("dark"));
});

test("admin topbar and dashboard include working theme toggle in dark mode", async () => {
  // Test admin route with dark mode
  await page.goto("/admin");
  await page.getByRole("heading", { name: "Admin Overview" }).waitFor();

  const adminToggle = page.getByRole("button", { name: /appearance settings/i }).first();
  await adminToggle.waitFor();
  await adminToggle.click();

  await page.getByRole("menuitem", { name: /dark mode/i }).click();
  await page.waitForFunction(() => document.documentElement.classList.contains("dark"));

  // Verify admin sidebar and cards adapt
  const isDarkAdmin = await page.evaluate(() => document.documentElement.classList.contains("dark"));
  assert.equal(isDarkAdmin, true, "admin layout should have dark class");

  // Navigate to analytics in dark mode
  await page.goto("/admin/analytics");
  await page.getByRole("heading", { name: "City Analytics" }).waitFor();
  assert.equal(await page.evaluate(() => document.documentElement.classList.contains("dark")), true);
});

test("theme toggle keyboard navigation and escape key dismissal", async () => {
  await page.goto("/");
  const toggleBtn = page.getByRole("button", { name: /appearance settings/i }).first();

  await toggleBtn.focus();
  await page.keyboard.press("Enter");

  const menu = page.getByRole("menu", { name: "Appearance options" });
  await menu.waitFor();

  // Press Escape to close
  await page.keyboard.press("Escape");
  await page.waitForFunction(() => document.querySelector('[role="menu"][aria-label="Appearance options"]') === null);
});
