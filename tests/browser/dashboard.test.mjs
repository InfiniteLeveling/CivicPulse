import assert from "node:assert/strict";
import { after, afterEach, before, beforeEach, test } from "node:test";
import { chromium } from "playwright-core";

const baseURL = process.env.CIVICPULSE_TEST_URL ?? "http://127.0.0.1:3000";
let browser, page, errors;

before(async () => {
  browser = await chromium.launch({
    channel:
      process.env.CIVICPULSE_BROWSER_CHANNEL ??
      (process.platform === "win32" ? "msedge" : "chrome"),
    executablePath: process.env.CIVICPULSE_BROWSER_PATH,
  });
});

beforeEach(async () => {
  errors = [];
  page = await browser.newPage({
    baseURL,
    reducedMotion: "reduce",
    viewport: { width: 1440, height: 900 },
  });
  page.setDefaultTimeout(6000);
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (entry) => {
    if (entry.type() === "error") errors.push(entry.text());
  });
});

afterEach(async () => {
  await page?.close();
  assert.deepEqual(errors, [], "Browser errors");
});

after(async () => {
  await browser?.close();
});

test("citizen dashboard loads with welcome hero, 4 stat cards, quick actions, and recent reports", async () => {
  const response = await page.goto("/dashboard");
  assert.equal(response.status(), 200);

  // Welcome greeting
  await page.getByRole("heading", { name: /Welcome back/i }).waitFor();

  // 4 Stat Cards
  await page.getByText("Total Reported").waitFor();
  await page.getByText("Pending Review").waitFor();
  await page.getByText("In Progress").first().waitFor();
  await page.getByText("Resolved").first().waitFor();

  // Verify numerical values from fixtures
  const totalValue = await page.locator("text=Total Reported").locator("..").locator("xpath=..").getByText("3").count();
  assert.ok(totalValue >= 1, "Expected total stats card to show 3");

  // Quick Action cards
  await page.getByRole("heading", { name: "Quick Actions" }).waitFor();
  await page.getByText("Phase 7").first().waitFor();
  await page.getByText("Phase 8").first().waitFor();
  await page.getByText("Phase 9").first().waitFor();

  // Recent complaints list
  await page.getByRole("heading", { name: "Recent Complaints" }).waitFor();
  await page.getByText("CP-2001").waitFor();
  await page.getByText("CP-2002").waitFor();
  await page.getByText("CP-2003").waitFor();
});

test("recent complaint view details modal opens and closes cleanly", async () => {
  await page.goto("/dashboard");
  await page.getByText("CP-2001").waitFor();

  // Find and click the first "View Details" button
  const viewButton = page.getByRole("button", { name: /View Details/i }).first();
  await viewButton.click();

  // Modal dialog content
  const dialog = page.getByRole("alertdialog");
  await dialog.waitFor();
  await dialog.getByRole("heading", { name: "Deep pothole at main campus crossing" }).waitFor();
  await dialog.getByText("Road Maintenance").waitFor();

  // Close modal
  const closeButton = dialog.getByRole("button", { name: "Close" });
  await closeButton.click();
  await page.waitForFunction(() => !document.querySelector("[role='alertdialog']"));
});

test("empty state view renders when empty=true query parameter is passed", async () => {
  const response = await page.goto("/dashboard?empty=true");
  assert.equal(response.status(), 200);

  // Empty state container and message
  await page.getByRole("heading", { name: "No complaints reported yet" }).waitFor();
  await page.getByText("You haven't submitted any civic issue reports yet").waitFor();

  // Stats cards show 0
  const zeroCounts = await page.getByText("0").count();
  assert.ok(zeroCounts >= 4, "Expected stat cards to reflect 0 complaints");
});

test("profile menu opens on click and closes on Escape", async () => {
  await page.goto("/dashboard");

  const profileTrigger = page.getByRole("button", { name: /User menu for/i });
  await profileTrigger.waitFor();
  await profileTrigger.click();

  // Profile dropdown menu opens
  const profileMenu = page.getByRole("menu", { name: "User profile options" });
  await profileMenu.waitFor();
  await profileMenu.getByText(/Citizen/i).first().waitFor();
  await profileMenu.getByRole("button", { name: /Sign Out/i }).waitFor();

  // Press Escape to dismiss
  await page.keyboard.press("Escape");
  await page.waitForFunction(() => !document.querySelector("[role='menu']"));
});

test("desktop sidebar is visible on wide viewports and mobile nav is visible on small viewports", async () => {
  // Desktop viewport
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/dashboard");

  const sidebar = page.locator("aside[aria-label='Citizen Navigation']");
  await sidebar.waitFor({ state: "visible" });
  const mobileNav = page.locator("nav[aria-label='Mobile Navigation']");
  assert.equal(await mobileNav.isVisible(), false);

  // Mobile viewport
  await page.setViewportSize({ width: 375, height: 667 });
  await sidebar.waitFor({ state: "hidden" });
  await mobileNav.waitFor({ state: "visible" });

  // Check mobile nav links using exact match
  await mobileNav.getByRole("link", { name: "Dashboard" }).waitFor();
  await mobileNav.getByRole("link", { name: "Report", exact: true }).waitFor();
  await mobileNav.getByRole("link", { name: "My Reports" }).waitFor();
  await mobileNav.getByRole("link", { name: "Map" }).waitFor();
});

test("responsive viewports have zero horizontal overflow on dashboard", async () => {
  const viewports = [
    { width: 320, height: 568 },
    { width: 375, height: 667 },
    { width: 768, height: 1024 },
    { width: 1024, height: 768 },
    { width: 1440, height: 900 },
  ];

  for (const vp of viewports) {
    await page.setViewportSize(vp);
    await page.goto("/dashboard");
    await page.getByRole("heading", { name: /Welcome back/i }).waitFor();

    const hasOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth;
    });
    assert.equal(hasOverflow, false, `Horizontal overflow detected at ${vp.width}x${vp.height}`);
  }
});
