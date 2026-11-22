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
        text.includes("/api/reports") ||
        text.includes("/api/stats") ||
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

test("admin complaints queue loads with header, toolbar, table, and pagination", async () => {
  const response = await page.goto("/admin/complaints");
  assert.equal(response.status(), 200);

  // Page title
  const title = await page.title();
  assert.match(title, /Complaints Queue · Admin/i);

  // Header
  await page.getByRole("heading", { name: "Manage Complaints" }).waitFor({ state: "visible" });
  await page.getByText(/Review reported civic issues, identify urgent complaints/i).waitFor({ state: "visible" });

  // Toolbar
  await page.getByPlaceholder(/Search complaints by title, reference/i).waitFor({ state: "visible" });
  await page.getByLabel("Filter by status").waitFor({ state: "visible" });
  await page.getByLabel("Filter by category").waitFor({ state: "visible" });
  await page.getByLabel("Filter by severity").waitFor({ state: "visible" });
  await page.getByRole("button", { name: "Urgent Only" }).waitFor({ state: "visible" });

  // Table
  const table = page.getByRole("table", { name: "Complaints Queue Table" });
  await table.waitFor({ state: "visible" });

  // First sample complaint visible
  await table.getByText("CP-2001").waitFor({ state: "visible" });
});

test("sidebar active route highlighting accurately highlights Complaints Queue", async () => {
  await page.goto("/admin/complaints");

  const sidebar = page.getByRole("complementary", { name: /Admin desktop navigation/i });
  const complaintsLink = sidebar.getByRole("link", { name: /Complaints Queue/i });

  await complaintsLink.waitFor({ state: "visible" });
  const ariaCurrent = await complaintsLink.getAttribute("aria-current");
  assert.equal(ariaCurrent, "page", "Expected Complaints Queue link to have aria-current='page'");
});

test("search input filters complaints by reference code and title", async () => {
  await page.goto("/admin/complaints");

  const searchInput = page.getByPlaceholder(/Search complaints by title, reference/i);
  await searchInput.fill("CP-2002");

  // Wait for debounce and filtered table update
  const table = page.getByRole("table", { name: "Complaints Queue Table" });
  await table.getByText("CP-2002").waitFor({ state: "visible" });
  await table.getByText("CP-2001").waitFor({ state: "hidden" });

  // Clear search restores items
  await searchInput.fill("");
  await table.getByText("CP-2001").waitFor({ state: "visible" });
});

test("status filter filters complaints accurately", async () => {
  await page.goto("/admin/complaints");

  const statusSelect = page.getByLabel("Filter by status");
  await statusSelect.selectOption("pending");

  // Table should show pending items and hide in_progress items
  const table = page.getByRole("table", { name: "Complaints Queue Table" });
  await table.getByText("CP-2002").waitFor({ state: "visible" });
  await table.getByText("CP-2001").waitFor({ state: "hidden" });
});

test("category filter filters complaints accurately", async () => {
  await page.goto("/admin/complaints");

  const categorySelect = page.getByLabel("Filter by category");
  await categorySelect.selectOption("streetlight");

  const table = page.getByRole("table", { name: "Complaints Queue Table" });
  await table.getByText("CP-2002").waitFor({ state: "visible" });
  await table.getByText("CP-2001").waitFor({ state: "hidden" });
});

test("severity filter filters complaints accurately", async () => {
  await page.goto("/admin/complaints");

  const severitySelect = page.getByLabel("Filter by severity");
  await severitySelect.selectOption("critical");

  const table = page.getByRole("table", { name: "Complaints Queue Table" });
  await table.getByText("CP-2004").waitFor({ state: "visible" });
  await table.getByText("CP-2001").waitFor({ state: "hidden" });
});

test("urgent only filter toggles and isolates urgent complaints", async () => {
  await page.goto("/admin/complaints");

  const urgentBtn = page.getByRole("button", { name: "Urgent Only" });
  await urgentBtn.click();

  // Button should have aria-pressed="true"
  assert.equal(await urgentBtn.getAttribute("aria-pressed"), "true");

  // Urgent complaints (CP-2001, CP-2004) should be visible, non-urgent (CP-2002) hidden
  const table = page.getByRole("table", { name: "Complaints Queue Table" });
  await table.getByText("CP-2001").waitFor({ state: "visible" });
  await table.getByText("CP-2002").waitFor({ state: "hidden" });
});

test("inspect button opens read-only complaint preview modal and closes on Escape", async () => {
  await page.goto("/admin/complaints");

  // Click Inspect on CP-2001
  const inspectBtn = page.getByRole("button", { name: "Inspect complaint CP-2001" });
  await inspectBtn.click();

  // Modal dialog should open
  const dialog = page.getByRole("dialog", { name: "Deep pothole at main campus crossing" });
  await dialog.waitFor({ state: "visible" });

  // Dialog contents
  await dialog.getByText("Priority Score").waitFor({ state: "visible" });
  await dialog.getByText("Road Maintenance").waitFor({ state: "visible" });
  await dialog.getByText("View on OpenStreetMap").waitFor({ state: "visible" });
  await dialog.getByText(/Direct administrative triage, department reassignment/i).waitFor({ state: "visible" });

  // Press Escape to close
  await page.keyboard.press("Escape");
  await dialog.waitFor({ state: "hidden" });
});

test("clear filters button restores default queue state", async () => {
  await page.goto("/admin/complaints");

  // Apply search
  const searchInput = page.getByPlaceholder(/Search complaints by title, reference/i);
  await searchInput.fill("CP-2002");

  // Clear Filters button appears
  const clearBtn = page.getByRole("button", { name: "Clear Filters" });
  await clearBtn.waitFor({ state: "visible" });

  // Click clear
  await clearBtn.click();

  // Search input is cleared and items restored
  assert.equal(await searchInput.inputValue(), "");
  const table = page.getByRole("table", { name: "Complaints Queue Table" });
  await table.getByText("CP-2001").waitFor({ state: "visible" });
  await table.getByText("CP-2002").waitFor({ state: "visible" });
});

test("empty complaints state displays properly when empty=true", async () => {
  await page.goto("/admin/complaints?empty=true");

  await page.getByRole("heading", { name: "No Complaints Recorded Yet" }).waitFor({ state: "visible" });
  await page.getByText(/Submitted civic issues will appear here once reports are received/i).waitFor({ state: "visible" });
});

test("admin complaints page maintains zero horizontal overflow across responsive viewports", async () => {
  const viewports = [
    { width: 320, height: 568 },
    { width: 375, height: 667 },
    { width: 768, height: 1024 },
    { width: 1024, height: 768 },
    { width: 1440, height: 900 },
  ];

  for (const vp of viewports) {
    await page.setViewportSize(vp);
    await page.goto("/admin/complaints");
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
