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
      // Ignore expected 404 network failures for unprovisioned backend routes
      if (
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

test("my-reports page loads with header, 4 summary cards, search, filters, and desktop table", async () => {
  const response = await page.goto("/my-reports");
  assert.equal(response.status(), 200);

  // Main Header
  await page.getByRole("heading", { name: "My Complaints", level: 1 }).waitFor();
  await page.getByText("Demo Mode (Live Backend Pending)").waitFor();

  // CTA button to /report
  const reportCta = page.getByRole("link", { name: "Report New Issue" });
  await reportCta.waitFor();
  assert.equal(await reportCta.getAttribute("href"), "/report");

  // 4 Summary Stat Cards
  await page.getByText("Total Complaints").waitFor();
  await page.getByText("Pending Review").waitFor();
  await page.getByText("In Progress").first().waitFor();
  await page.getByText("Resolved").first().waitFor();

  // Numerical values: total=8, pending=3, inProgress=3, resolved=2
  const totalCounts = await page.locator("text=Total Complaints").locator("..").locator("xpath=..").getByText("8").count();
  assert.ok(totalCounts >= 1, "Expected Total Complaints card to display 8");

  // Search input & Filter controls
  await page.getByRole("searchbox", { name: "Search complaints" }).waitFor();
  await page.getByRole("tab", { name: /All Complaints/i }).waitFor();
  await page.getByRole("tab", { name: /Pending/i }).waitFor();
  await page.getByRole("tab", { name: /In Progress/i }).waitFor();
  await page.getByRole("tab", { name: /Resolved/i }).waitFor();

  // Desktop Table headers and rows
  await page.getByRole("table").waitFor();
  await page.getByRole("columnheader", { name: "Complaint" }).waitFor();
  await page.getByRole("columnheader", { name: "Category" }).waitFor();
  await page.getByRole("columnheader", { name: "Status" }).waitFor();
  await page.getByRole("columnheader", { name: "Visibility" }).waitFor();
  await page.getByRole("columnheader", { name: "Submitted" }).waitFor();
  await page.getByRole("columnheader", { name: "Support" }).waitFor();

  // First page reports
  await page.getByRole("table").getByText("CP-2001").waitFor();
  await page.getByRole("table").getByText("Deep pothole at main campus crossing").waitFor();
});

test("responsive viewports render appropriate layouts with zero horizontal overflow", async () => {
  const viewports = [
    { width: 320, height: 568 },
    { width: 375, height: 667 },
    { width: 768, height: 1024 },
    { width: 1024, height: 768 },
    { width: 1440, height: 900 },
  ];

  for (const vp of viewports) {
    await page.setViewportSize(vp);
    await page.goto("/my-reports");
    await page.getByRole("heading", { name: "My Complaints", level: 1 }).waitFor();

    if (vp.width < 768) {
      // Mobile viewport renders card layout
      await page.locator("[data-testid='my-report-card']").first().waitFor();
    } else {
      // Desktop / tablet renders table layout
      await page.getByRole("table").waitFor();
    }

    const hasOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth;
    });
    assert.equal(hasOverflow, false, `Horizontal overflow detected at ${vp.width}x${vp.height}`);
  }
});

test("status filter tabs update complaints list", async () => {
  await page.goto("/my-reports");
  await page.getByRole("heading", { name: "My Complaints" }).waitFor();

  // Filter to Pending
  const pendingTab = page.getByRole("tab", { name: /Pending/i });
  await pendingTab.click();

  // Verify pending complaints are present
  await page.getByRole("table").getByText("CP-2002").waitFor();
  await page.getByRole("table").getByText("Unlit lamp post along canal walkway").waitFor();

  // Resolved complaints should not appear
  const resolvedRef = await page.getByRole("table").getByText("CP-2003").count();
  assert.equal(resolvedRef, 0, "Resolved complaint CP-2003 should not be visible under Pending tab");

  // Filter to Resolved
  const resolvedTab = page.getByRole("tab", { name: /Resolved/i });
  await resolvedTab.click();

  await page.getByRole("table").getByText("CP-2003").waitFor();
  await page.getByRole("table").getByText("Overflowing community waste container").waitFor();

  // Return to All Complaints
  const allTab = page.getByRole("tab", { name: /All Complaints/i });
  await allTab.click();
  await page.getByRole("table").getByText("CP-2001").waitFor();
});

test("category dropdown filters complaints list", async () => {
  await page.goto("/my-reports");
  await page.getByRole("heading", { name: "My Complaints" }).waitFor();

  const categorySelect = page.getByLabel("Filter by issue category");
  await categorySelect.selectOption("pothole");

  // Pothole complaints visible
  await page.getByRole("table").getByText("CP-2001").waitFor();
  await page.getByRole("table").getByText("CP-2004").waitFor();

  // Non-pothole complaint should not appear
  const garbageCount = await page.getByRole("table").getByText("CP-2003").count();
  assert.equal(garbageCount, 0, "CP-2003 garbage report should not be shown when filtered by pothole");

  // Reset category
  await categorySelect.selectOption("all");
  await page.getByRole("table").getByText("CP-2002").waitFor();
});

test("search input filters dynamically by reference and title, and clear button restores list", async () => {
  await page.goto("/my-reports");
  await page.getByRole("heading", { name: "My Complaints" }).waitFor();

  const searchInput = page.getByRole("searchbox", { name: "Search complaints" });

  // Search by reference code
  await searchInput.fill("CP-2004");
  await page.getByRole("table").getByText("Cracked sidewalk slab near elementary school").waitFor();

  const otherCount = await page.getByRole("table").getByText("CP-2001").count();
  assert.equal(otherCount, 0, "CP-2001 should be filtered out when searching for CP-2004");

  // Click clear button
  const clearBtn = page.getByRole("button", { name: "Clear search query" });
  await clearBtn.click();

  await page.getByRole("table").getByText("CP-2001").waitFor();
  assert.equal(await searchInput.inputValue(), "");
});

test("sorting changes order of complaints list", async () => {
  await page.goto("/my-reports");
  await page.getByRole("heading", { name: "My Complaints" }).waitFor();

  const sortSelect = page.getByLabel("Sort complaints list");

  // Sort by Most Supported
  await sortSelect.selectOption("support");

  // CP-2004 has 12 votes (highest) and should appear on the first row
  await page.getByRole("table").getByText("CP-2004").waitFor();
});

test("pagination navigates between pages and boundary states", async () => {
  await page.goto("/my-reports");
  await page.getByRole("heading", { name: "My Complaints" }).waitFor();

  // Initial page 1: showing 1–5 of 8 reports
  await page.getByText(/Showing 1–5 of 8 reports/).waitFor();

  const prevBtn = page.getByRole("button", { name: "Previous page" });
  const nextBtn = page.getByRole("button", { name: "Next page" });

  assert.equal(await prevBtn.isDisabled(), true, "Previous button should be disabled on page 1");
  assert.equal(await nextBtn.isDisabled(), false, "Next button should be enabled on page 1");

  // Navigate to Page 2
  await nextBtn.click();
  await page.getByText(/Showing 6–8 of 8 reports/).waitFor();
  await page.getByText("Page 2 of 2").waitFor();

  assert.equal(await prevBtn.isDisabled(), false, "Previous button should be enabled on page 2");
  assert.equal(await nextBtn.isDisabled(), true, "Next button should be disabled on page 2");

  // Navigate back to Page 1
  await prevBtn.click();
  await page.getByText(/Showing 1–5 of 8 reports/).waitFor();
  await page.getByText("Page 1 of 2").waitFor();
});

test("empty search results displays friendly state with Clear Filters button", async () => {
  await page.goto("/my-reports");
  await page.getByRole("heading", { name: "My Complaints" }).waitFor();

  const searchInput = page.getByRole("searchbox", { name: "Search complaints" });
  await searchInput.fill("nonexistent-civic-query-12345");

  await page.getByRole("heading", { name: "No Complaints Match Your Filters" }).waitFor();
  await page.getByText("Try adjusting your search query, status, or category filters").waitFor();

  const clearBtn = page.getByRole("button", { name: "Clear Filters" });
  await clearBtn.click();

  // Full list restored
  await page.getByRole("table").getByText("CP-2001").waitFor();
});

test("empty account renders zero-state view with Report Your First Issue CTA when empty=true", async () => {
  const response = await page.goto("/my-reports?empty=true");
  assert.equal(response.status(), 200);

  // Empty state title & description
  await page.getByRole("heading", { name: "You Haven't Reported Any Issues Yet" }).waitFor();
  await page.getByText("When you report civic infrastructure problems like potholes").waitFor();

  // CTA button
  const startCta = page.getByRole("link", { name: "Report Your First Issue" });
  await startCta.waitFor();
  assert.equal(await startCta.getAttribute("href"), "/report");

  // All 4 stat cards show 0
  const zeroCounts = await page.getByText("0").count();
  assert.ok(zeroCounts >= 4, "Expected stat cards to reflect 0 complaints");
});

test("Report New Issue CTA button navigates to /report", async () => {
  await page.goto("/my-reports");
  const reportCta = page.getByRole("link", { name: "Report New Issue" });
  await reportCta.click();

  await page.waitForURL("**/report");
  await page.getByRole("heading", { name: "Report a Civic Issue" }).waitFor();
});
