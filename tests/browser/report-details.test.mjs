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
      // Ignore expected 404/403 network failures for missing/forbidden test endpoints
      if (
        text.includes("/api/reports") ||
        text.includes("404") ||
        text.includes("403") ||
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

test("complaint details page loads for public report with header, overview, photo, timeline, and support card", async () => {
  const response = await page.goto("/reports/rep-2001");
  assert.equal(response.status(), 200);

  // Header information
  await page.getByRole("heading", { name: "Deep pothole at main campus crossing", level: 1 }).waitFor();
  await page.getByText("CP-2001").waitFor();
  await page.getByText("In Progress").first().waitFor();
  await page.getByText("Public Report").waitFor();

  // Overview Information
  await page.getByRole("heading", { name: "Issue Description" }).waitFor();
  await page.getByText("Substantial asphalt breakdown posing severe hazard").waitFor();
  await page.getByText("Road Maintenance", { exact: true }).waitFor();
  await page.getByText("12.97160° N").waitFor();
  await page.getByText("77.59460° E").waitFor();

  // Support Card
  await page.getByRole("heading", { name: "Community Support" }).waitFor();
  await page.getByText("7").first().waitFor();
});

test("status timeline renders events in chronological order with remarks", async () => {
  await page.goto("/reports/rep-2001");

  await page.getByRole("heading", { name: "Status Timeline" }).waitFor();
  await page.getByText("Report Submitted").waitFor();
  await page.getByText("Municipal Triage & Assignment").waitFor();
  await page.getByText(/Assigned to Road Maintenance for active maintenance/).waitFor();
});

test("resolved complaint displays resolution evidence, photo, and official note with closed support", async () => {
  const response = await page.goto("/reports/rep-2003");
  assert.equal(response.status(), 200);

  await page.getByRole("heading", { name: "Overflowing community waste container", level: 1 }).waitFor();
  await page.getByText("Resolved").first().waitFor();

  // Resolution Evidence card
  await page.getByRole("heading", { name: "Resolution Evidence" }).waitFor();
  await page.getByText("Municipal Verified").waitFor();
  await page.getByText("Official Resolution Note").waitFor();
  await page.getByText(/Work order completed, site verified/).first().waitFor();

  // Support Card closed state
  await page.getByText("Support Closed").waitFor();
  await page.getByText("This issue has already been resolved and is closed for new endorsements.").waitFor();
});

test("private report displays Private Report badge and unavailable support notice", async () => {
  const response = await page.goto("/reports/rep-2005");
  assert.equal(response.status(), 200);

  await page.getByText("Private Report").waitFor();
  await page.getByText("Community Support Unavailable").waitFor();
  await page.getByText("This report is marked private and cannot be viewed or endorsed publicly.").waitFor();
});

test("community support interaction updates count and transitions to Supported state", async () => {
  await page.goto("/reports/rep-2002");

  // Initial count is 2 and viewer has not supported
  const supportBtn = page.getByTestId("support-issue-btn");
  await supportBtn.waitFor();
  assert.equal(await supportBtn.innerText(), "Support This Issue");

  // Click support button
  await supportBtn.click();

  // Transitions to Supported state
  await page.getByText("Supported", { exact: true }).waitFor();
  await page.getByText("You have supported this issue").waitFor();

  // Authoritative count incremented to 3
  await page.getByText("3").first().waitFor();
});

test("nonexistent report ID renders friendly 404 not-found page with safe navigation", async () => {
  const response = await page.goto("/reports/not-found");
  assert.ok(response.status() === 404 || response.status() === 200);

  await page.getByRole("heading", { name: "We Couldn't Find This Complaint" }).waitFor();
  await page.getByText("The requested complaint report does not exist").waitFor();

  const browseBtn = page.getByRole("link", { name: "Browse My Complaints" });
  await browseBtn.waitFor();
  assert.equal(await browseBtn.getAttribute("href"), "/my-reports");
});

test("forbidden private report renders Access Denied card with safe navigation", async () => {
  await page.goto("/reports/forbidden");

  await page.getByRole("heading", { name: "Access Denied" }).waitFor();
  await page.getByText("You don't have permission to view this complaint").waitFor();

  const returnBtn = page.getByRole("link", { name: "Return to My Complaints" });
  await returnBtn.waitFor();
  assert.equal(await returnBtn.getAttribute("href"), "/my-reports");
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
    await page.goto("/reports/rep-2001");
    await page.getByRole("heading", { name: "Deep pothole at main campus crossing", level: 1 }).waitFor();

    const hasOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth;
    });
    assert.equal(hasOverflow, false, `Horizontal overflow detected at ${vp.width}x${vp.height}`);
  }
});

test("navigation back to /my-reports works smoothly", async () => {
  await page.goto("/reports/rep-2001");

  const backLink = page.getByRole("link", { name: "Back to My Complaints" });
  await backLink.click();

  await page.waitForURL("**/my-reports");
  await page.getByRole("heading", { name: "My Complaints", level: 1 }).waitFor();
});

test("navigation from My Complaints table to report details page functions cleanly", async () => {
  await page.goto("/my-reports");
  await page.getByRole("heading", { name: "My Complaints", level: 1 }).waitFor();

  // Find the first details link in the desktop table
  const detailsLink = page.getByRole("table").getByRole("link", { name: "Details" }).first();
  await detailsLink.click();

  await page.waitForURL("**/reports/**");
  await page.getByRole("heading", { name: "Issue Description" }).waitFor();
  await page.getByRole("heading", { name: "Status Timeline" }).waitFor();
});
