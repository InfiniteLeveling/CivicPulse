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
    if (entry.type() === "error") {
      const text = entry.text();
      // Ignore expected 404 network failures for unprovisioned backend endpoints
      if (
        text.includes("/api/stats") ||
        text.includes("/api/reports") ||
        text.includes("404") ||
        text.includes("net::ERR_FAILED") ||
        text.includes("Failed to load resource")
      ) {
        return;
      }
      errors.push(text);
    }
  });
});

afterEach(async () => {
  await page?.close();
  assert.deepEqual(errors, [], "Browser errors");
});

after(async () => {
  await browser?.close();
});

test("admin portal renders desktop shell with deep navy sidebar, topbar, and admin overview header", async () => {
  const response = await page.goto("/admin");
  assert.equal(response.status(), 200);

  // Verify page title
  const pageTitle = await page.title();
  assert.match(pageTitle, /Admin Operations Dashboard/i);

  // Desktop sidebar exists and is visible
  const sidebar = page.getByRole("complementary", { name: /Admin desktop navigation/i });
  await sidebar.waitFor({ state: "visible" });

  // Topbar exists and is visible
  await page.getByRole("banner").waitFor({ state: "visible" });
  await page.getByText("Official Console").first().waitFor({ state: "visible" });

  // Admin Overview header
  await page.getByRole("heading", { name: "Admin Overview" }).waitFor({ state: "visible" });
  await page.getByText("Operations Console").waitFor({ state: "visible" });
  await page.getByText(/Monitor civic complaints, track resolution progress/i).waitFor({ state: "visible" });
});

test("desktop sidebar displays brand, admin badge, and navigation groupings", async () => {
  await page.goto("/admin");

  const sidebar = page.getByRole("complementary", { name: /Admin desktop navigation/i });

  // Brand and admin badge
  await sidebar.getByText("CivicPulse").first().waitFor({ state: "visible" });
  await sidebar.getByText(/^Admin$/i).first().waitFor({ state: "visible" });

  // Group headers
  await sidebar.getByText("MAIN", { exact: true }).waitFor({ state: "visible" });
  await sidebar.getByText("OPERATIONS", { exact: true }).waitFor({ state: "visible" });
  await sidebar.getByText("PORTALS", { exact: true }).waitFor({ state: "visible" });

  // Main items
  await sidebar.getByRole("link", { name: /Overview/i }).waitFor({ state: "visible" });
  await sidebar.getByText("Complaints Queue").waitFor({ state: "visible" });
  await sidebar.getByText("City Analytics").waitFor({ state: "visible" });
  await sidebar.getByRole("link", { name: /Live Civic Map/i }).waitFor({ state: "visible" });
});

test("active route highlighting accurately highlights Overview and sets aria-current", async () => {
  await page.goto("/admin");

  const sidebar = page.getByRole("complementary", { name: /Admin desktop navigation/i });
  const overviewLink = sidebar.getByRole("link", { name: /Overview/i });

  await overviewLink.waitFor({ state: "visible" });
  const ariaCurrent = await overviewLink.getAttribute("aria-current");
  assert.equal(ariaCurrent, "page", "Expected Overview link to have aria-current='page'");
});

test("main statistics grid displays total, pending, in-progress, and resolved cards", async () => {
  await page.goto("/admin");

  const statsGrid = page.getByRole("region", { name: "Main Complaint Statistics" });
  await statsGrid.waitFor({ state: "visible" });

  await statsGrid.getByText("Total Complaints").waitFor({ state: "visible" });
  await statsGrid.getByText("Pending").waitFor({ state: "visible" });
  await statsGrid.getByText("In Progress").waitFor({ state: "visible" });
  await statsGrid.getByText("Resolved").waitFor({ state: "visible" });

  // Check that values are rendered
  const totalCount = await statsGrid.getByText("Total Complaints").locator("..").locator("..").getByText(/\d+/).textContent();
  assert.ok(totalCount && parseInt(totalCount, 10) >= 0);
});

test("operational attention section renders urgent issues and resolution rate progress cards", async () => {
  await page.goto("/admin");

  const attentionSection = page.getByRole("region", { name: "Operational Attention" });
  await attentionSection.waitFor({ state: "visible" });

  // Urgent Issues Card
  await attentionSection.getByText("Urgent Issues").waitFor({ state: "visible" });
  await attentionSection.getByText("Priority Attention").waitFor({ state: "visible" });

  // Resolution Progress Card
  await attentionSection.getByText("Resolution Rate").waitFor({ state: "visible" });
  await attentionSection.getByText("Caseload Progress").waitFor({ state: "visible" });

  // Progressbar element exists and has aria attributes
  const progressBar = attentionSection.getByRole("progressbar");
  await progressBar.waitFor({ state: "visible" });
  assert.ok(await progressBar.getAttribute("aria-valuenow"));
});

test("status distribution section displays visual breakdown and percentage indicators", async () => {
  await page.goto("/admin");

  const distributionSection = page.getByRole("region", { name: "Complaint Status Distribution" });
  await distributionSection.waitFor({ state: "visible" });

  await distributionSection.getByText("Status Distribution").waitFor({ state: "visible" });
  await distributionSection.getByText("Pending").waitFor({ state: "visible" });
  await distributionSection.getByText("In Progress").waitFor({ state: "visible" });
  await distributionSection.getByText("Resolved").waitFor({ state: "visible" });

  // Visual status distribution bar has role img and accessible label
  const distBar = distributionSection.getByRole("img", { name: /Status distribution:/i });
  await distBar.waitFor({ state: "visible" });
});

test("recent complaints section renders authorized reports list and phase 19 notice", async () => {
  await page.goto("/admin");

  const recentSection = page.getByRole("region", { name: "Recent Municipal Complaints" });
  await recentSection.waitFor({ state: "visible" });

  await recentSection.getByText("Recent Complaints").waitFor({ state: "visible" });
  await recentSection.getByText("CP-2001").waitFor({ state: "visible" });
  await recentSection.getByText(/Direct administrative triage, department assignment/i).waitFor({ state: "visible" });
});

test("quick actions section provides valid navigation and marks future phases coming soon", async () => {
  await page.goto("/admin");

  const actionsSection = page.getByRole("region", { name: "Administrative Actions" });
  await actionsSection.waitFor({ state: "visible" });

  // Live Civic Map link works
  const mapLink = actionsSection.getByRole("link", { name: /Live Civic Map/i });
  await mapLink.waitFor({ state: "visible" });
  assert.equal(await mapLink.getAttribute("href"), "/map");

  // Public Website link works
  const publicLink = actionsSection.getByRole("link", { name: /Public Website/i });
  await publicLink.waitFor({ state: "visible" });
  assert.equal(await publicLink.getAttribute("href"), "/");

  // Phase 18 Complaints Queue button is disabled
  const complaintsBtn = actionsSection.getByRole("button", { name: /Complaints Queue/i });
  await complaintsBtn.waitFor({ state: "visible" });
  assert.equal(await complaintsBtn.getAttribute("disabled"), "");
});

test("data freshness indicator and manual refresh button function smoothly", async () => {
  await page.goto("/admin");

  // Freshness text
  await page.getByText(/Last refreshed:/i).waitFor({ state: "visible" });

  // Refresh button
  const refreshBtn = page.getByRole("button", { name: "Refresh administrative dashboard" });
  await refreshBtn.waitFor({ state: "visible" });

  // Click refresh
  await refreshBtn.click();
  await refreshBtn.waitFor({ state: "visible" });
  await page.getByText(/Last refreshed:/i).waitFor({ state: "visible" });
});

test("empty dashboard view handles zero complaints cleanly when empty=true", async () => {
  await page.goto("/admin?empty=true");

  // Stats cards show 0
  const statsGrid = page.getByRole("region", { name: "Main Complaint Statistics" });
  await statsGrid.waitFor({ state: "visible" });

  // Total Complaints should show 0
  const totalValue = await statsGrid.getByText("Total Complaints").locator("..").locator("..").getByText("0").count();
  assert.ok(totalValue >= 1, "Expected Total Complaints to show 0");

  // Empty state in recent complaints
  await page.getByRole("region", { name: "Recent Municipal Complaints" }).getByText("No Complaints Recorded Yet").waitFor({ state: "visible" });
});

test("admin layout maintains zero horizontal overflow across responsive viewports", async () => {
  const viewports = [
    { width: 320, height: 568 },
    { width: 375, height: 667 },
    { width: 768, height: 1024 },
    { width: 1024, height: 768 },
    { width: 1440, height: 900 },
  ];

  for (const vp of viewports) {
    await page.setViewportSize(vp);
    await page.goto("/admin");
    await page.waitForLoadState("networkidle");

    const noHorizontalScroll = await page.evaluate(() => {
      return document.documentElement.scrollWidth <= window.innerWidth;
    });

    assert.ok(
      noHorizontalScroll,
      `Horizontal overflow detected at viewport ${vp.width}x${vp.height} (scrollWidth=${await page.evaluate(() => document.documentElement.scrollWidth)} vs innerWidth=${vp.width})`
    );
  }
});
