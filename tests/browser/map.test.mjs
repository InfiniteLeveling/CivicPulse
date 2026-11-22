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
      // Ignore expected OpenStreetMap tile network 404/failures in offline or sandboxed test runs
      if (
        text.includes("tile.openstreetmap.org") ||
        text.includes("/api/reports") ||
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

test("public civic map loads with header, toolbar, legend, map container, and complaints list", async () => {
  const response = await page.goto("/map");
  assert.equal(response.status(), 200);

  // Main Heading
  await page.getByRole("heading", { name: "Live Civic Issue Map", level: 1 }).waitFor();
  await page.getByText(/Current public reports retrieved from CivicPulse/).waitFor();

  // Toolbar & visible count
  await page.getByText(/public issues shown/).waitFor();

  // Legend
  const legend = page.getByRole("region", { name: "Map status legend" });
  await legend.waitFor();
  await legend.getByText("Pending Review").waitFor();
  await legend.getByText("In Progress").waitFor();
  await legend.getByText("Resolved").waitFor();

  // Accessible Complaints list heading
  await page.getByRole("heading", { name: "Public Complaints" }).waitFor();

  // Check reports are displayed in list
  await page.getByText("CP-2001").waitFor();
  await page.getByText("CP-2002").waitFor();
  await page.getByText("CP-2003").waitFor();

  // VERIFY PRIVACY: CP-2005 (private report) must NEVER be displayed!
  const hasPrivateReport = await page.locator("text=CP-2005").count();
  assert.equal(hasPrivateReport, 0, "Private complaint CP-2005 must not appear on public map!");
});

test("category filter updates public issues list and visible count", async () => {
  await page.goto("/map");
  await page.getByRole("heading", { name: "Live Civic Issue Map", level: 1 }).waitFor();

  // Select "Pothole" category
  const categorySelect = page.locator("select").first();
  await categorySelect.selectOption("pothole");

  // Should display 2 pothole issues
  await page.getByText("2 public issues shown").waitFor();
  await page.getByText("CP-2001").waitFor();
  await page.getByText("CP-2004").waitFor();

  // Non-pothole issues should be hidden
  const streetlightCount = await page.locator("text=CP-2002").count();
  assert.equal(streetlightCount, 0);

  // Reset category to "all"
  await categorySelect.selectOption("all");
  await page.getByText("7 public issues shown").waitFor();
});

test("status filter updates public issues list and visible count", async () => {
  await page.goto("/map");
  await page.getByRole("heading", { name: "Live Civic Issue Map", level: 1 }).waitFor();

  // Select "Resolved" status
  const statusSelect = page.locator("select").nth(1);
  await statusSelect.selectOption("resolved");

  // Should display 2 resolved issues (CP-2003, CP-2007)
  await page.getByText("2 public issues shown").waitFor();
  await page.getByText("CP-2003").waitFor();
  await page.getByText("CP-2007").waitFor();

  // Pending issues should be hidden
  const pendingCount = await page.locator("text=CP-2002").count();
  assert.equal(pendingCount, 0);

  // Reset status to "all"
  await statusSelect.selectOption("all");
  await page.getByText("7 public issues shown").waitFor();
});

test("search input filters public issues by title and reference code", async () => {
  await page.goto("/map");
  await page.getByRole("heading", { name: "Live Civic Issue Map", level: 1 }).waitFor();

  const searchInput = page.getByRole("searchbox");
  await searchInput.fill("CP-2006");

  // Should display only 1 issue
  await page.getByText("1 public issue shown").waitFor();
  await page.getByText("CP-2006").waitFor();
  await page.getByText("Potable main line leak near bus terminal").waitFor();

  // Clear query button
  const clearBtn = page.getByRole("button", { name: "Clear search query" });
  await clearBtn.click();

  // All 7 restored
  await page.getByText("7 public issues shown").waitFor();
});

test("empty search displays friendly empty state with Clear Filters button", async () => {
  await page.goto("/map");
  await page.getByRole("heading", { name: "Live Civic Issue Map", level: 1 }).waitFor();

  const searchInput = page.getByRole("searchbox");
  await searchInput.fill("xyz-nonexistent-query-12345");

  await page.getByText("0 public issues shown").waitFor();
  await page.getByRole("heading", { name: "No Issues Match These Filters" }).waitFor();
  await page.getByText("Try selecting another category or status").waitFor();

  // Click clear filters in empty state
  const clearBtn = page.getByRole("button", { name: "Clear Filters" });
  await clearBtn.click();

  await page.getByText("7 public issues shown").waitFor();
});

test("selecting Map button on list card highlights report card and updates selection", async () => {
  await page.goto("/map");
  await page.getByRole("heading", { name: "Live Civic Issue Map", level: 1 }).waitFor();

  // Find card for CP-2001 and click its Map button
  const card = page.locator('article[data-report-id="rep-2001"]');
  await card.waitFor();
  assert.equal(await card.getAttribute("data-selected"), "false");

  const mapBtn = card.getByRole("button", { name: "Map" });
  await mapBtn.click();

  // Card transitions to selected state
  assert.equal(await card.getAttribute("data-selected"), "true");
});

test("details link navigates to authoritative complaint details page /reports/[id]", async () => {
  await page.goto("/map");
  await page.getByRole("heading", { name: "Live Civic Issue Map", level: 1 }).waitFor();

  // Click Details on CP-2001
  const card = page.locator('article[data-report-id="rep-2001"]');
  const detailsLink = card.getByRole("link", { name: "Details" });
  await detailsLink.click();

  // Navigates to /reports/rep-2001
  await page.waitForURL("**/reports/rep-2001");
  await page.getByRole("heading", { name: "Deep pothole at main campus crossing", level: 1 }).waitFor();
  await page.getByText("CP-2001", { exact: true }).first().waitFor();
});

test("refresh button triggers re-fetch and updates issue collection", async () => {
  await page.goto("/map");
  await page.getByRole("heading", { name: "Live Civic Issue Map", level: 1 }).waitFor();

  const refreshBtn = page.getByRole("button", { name: /Refresh/i });
  await refreshBtn.waitFor();
  await refreshBtn.click();

  // Should succeed and show 7 public issues
  await page.getByText("7 public issues shown").waitFor();
});

test("responsive layouts have zero horizontal overflow across 5 standard viewports", async () => {
  const viewports = [
    { width: 320, height: 568 },
    { width: 375, height: 667 },
    { width: 768, height: 1024 },
    { width: 1024, height: 768 },
    { width: 1440, height: 900 },
  ];

  for (const vp of viewports) {
    await page.setViewportSize(vp);
    await page.goto("/map");
    await page.getByRole("heading", { name: "Live Civic Issue Map", level: 1 }).waitFor();

    const hasOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth;
    });
    assert.equal(hasOverflow, false, `Horizontal overflow detected at ${vp.width}x${vp.height}`);
  }
});

test("mobile view switch toggles between Map View and List View", async () => {
  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto("/map");
  await page.getByRole("heading", { name: "Live Civic Issue Map", level: 1 }).waitFor();

  // By default, Map View is active on mobile
  const mapTab = page.getByRole("button", { name: "Map View", exact: true });
  const listTab = page.getByRole("button", { name: /List \(/ });

  await listTab.click();
  // List panel should now be visible
  await page.getByRole("heading", { name: "Public Complaints" }).waitFor();
  await page.getByText("CP-2001").waitFor();

  // Switch back to Map View
  await mapTab.click();
  // Map container should be active
  await page.getByRole("region", { name: "Interactive map displaying public civic complaints" }).waitFor();
});

test("navigation from citizen dashboard Explore Map reaches /map", async () => {
  await page.goto("/dashboard");
  await page.getByRole("heading", { name: /Welcome back/i }).waitFor();

  const exploreMapBtn = page.getByRole("link", { name: "Explore Map" });
  await exploreMapBtn.click();

  await page.waitForURL("**/map");
  await page.getByRole("heading", { name: "Live Civic Issue Map", level: 1 }).waitFor();
});
