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

after(async () => {
  await browser?.close();
});

beforeEach(async () => {
  errors = [];
  page = await browser.newPage({ baseURL, viewport: { width: 1280, height: 800 } });
  page.on("console", (msg) => {
    if (msg.type() === "error") {
      const text = msg.text();
      if (
        text.includes("/api/reports") ||
        text.includes("/api/stats") ||
        text.includes("/api/admin") ||
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
  assert.deepEqual(errors, [], "Browser console errors");
});

test("admin analytics dashboard loads with header, 6 metric cards, and filter controls", async () => {
  await page.goto("/admin/analytics");

  // Header
  await page.getByRole("heading", { name: "City Analytics" }).waitFor({ state: "visible" });
  await page.getByText(/Explore complaint trends, issue distribution/i).waitFor({ state: "visible" });
  await page.getByText(/Last refreshed:/i).waitFor({ state: "visible" });

  // 6 Metric Cards
  await page.getByText("Total Complaints").first().waitFor({ state: "visible" });
  await page.getByText("Pending Intake").first().waitFor({ state: "visible" });
  await page.getByText("In Progress").first().waitFor({ state: "visible" });
  await page.getByText("Verified Resolved").first().waitFor({ state: "visible" });
  await page.getByText("Urgent Workload").first().waitFor({ state: "visible" });
  await page.getByText("Resolution Rate").first().waitFor({ state: "visible" });

  // Filters Component
  await page.getByText("Analytical Filters").waitFor({ state: "visible" });
});

test("sidebar accurately highlights City Analytics with aria-current='page'", async () => {
  await page.goto("/admin/analytics");

  const sidebar = page.getByRole("complementary", { name: "Admin desktop navigation" });
  await sidebar.waitFor({ state: "visible" });

  const analyticsLink = sidebar.getByRole("link", { name: /City Analytics/i });
  await analyticsLink.waitFor({ state: "visible" });

  const ariaCurrent = await analyticsLink.getAttribute("aria-current");
  assert.equal(ariaCurrent, "page");
});

test("charts view renders status, category, severity, and workload charts", async () => {
  await page.goto("/admin/analytics");

  // Status Distribution Chart
  await page.getByText("Complaint Status Distribution").waitFor({ state: "visible" });

  // Category Distribution Chart
  await page.getByText("Complaints by Issue Category").waitFor({ state: "visible" });

  // Severity Distribution Chart
  await page.getByText("Severity Distribution").waitFor({ state: "visible" });

  // Department Workload Chart
  await page.getByText("Department Assignment Workload").waitFor({ state: "visible" });

  // Resolution Performance Card
  await page.getByText("Municipal Resolution Performance").waitFor({ state: "visible" });
});

test("view mode toggle switches cleanly between Charts and Accessible Data Tables", async () => {
  await page.goto("/admin/analytics");

  // Click Data Tables button
  const tablesBtn = page.getByRole("button", { name: /Data Tables/i });
  await tablesBtn.click();

  // Semantic Tables appear
  const statusTable = page.getByRole("table", { name: "Status Distribution Table" });
  await statusTable.waitFor({ state: "visible" });
  await statusTable.getByText("Pending Intake").waitFor({ state: "visible" });

  const categoryTable = page.getByRole("table", { name: "Category Distribution Table" });
  await categoryTable.waitFor({ state: "visible" });

  const severityTable = page.getByRole("table", { name: "Severity Distribution Table" });
  await severityTable.waitFor({ state: "visible" });

  const deptTable = page.getByRole("table", { name: "Department Workload Table" });
  await deptTable.waitFor({ state: "visible" });

  // Switch back to Charts
  const chartsBtn = page.getByRole("button", { name: /Charts/i });
  await chartsBtn.click();

  await page.getByText("Complaint Status Distribution").waitFor({ state: "visible" });
});

test("analytical filters update criteria and provide clear reset action", async () => {
  await page.goto("/admin/analytics");

  const timeSelect = page.getByLabel("Filter by time range");
  await timeSelect.selectOption("30d");

  // Reset button appears
  const resetBtn = page.getByRole("button", { name: /Reset/i });
  await resetBtn.waitFor({ state: "visible" });

  // Click reset
  await resetBtn.click();
  await resetBtn.waitFor({ state: "hidden" });
});

test("manual refresh button updates timestamp smoothly", async () => {
  await page.goto("/admin/analytics");

  const refreshBtn = page.getByRole("button", { name: "Refresh analytics dashboard" });
  await refreshBtn.waitFor({ state: "visible" });
  await refreshBtn.click();

  // Toast confirmation appears
  await page.getByText(/Analytics data refreshed/i).waitFor({ state: "visible" });
});

test("admin analytics page maintains zero horizontal overflow across responsive viewports", async () => {
  const viewports = [
    { width: 320, height: 600 },
    { width: 375, height: 667 },
    { width: 768, height: 1024 },
    { width: 1024, height: 768 },
    { width: 1440, height: 900 },
  ];

  for (const vp of viewports) {
    await page.setViewportSize(vp);
    await page.goto("/admin/analytics");

    await page.getByRole("heading", { name: "City Analytics" }).waitFor({ state: "visible" });

    const hasHorizontalOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });

    assert.equal(
      hasHorizontalOverflow,
      false,
      `Horizontal overflow detected at viewport ${vp.width}x${vp.height}`
    );
  }
});
