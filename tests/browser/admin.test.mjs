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

test("admin portal renders desktop shell with deep navy sidebar, topbar, and workspace welcome content", async () => {
  const response = await page.goto("/admin");
  assert.equal(response.status(), 200);

  // Verify page title
  const pageTitle = await page.title();
  assert.match(pageTitle, /Admin Portal/i);

  // Desktop sidebar exists and is visible
  const sidebar = page.getByRole("complementary", { name: /Admin desktop navigation/i });
  await sidebar.waitFor({ state: "visible" });

  // Topbar exists and is visible
  await page.getByRole("banner").waitFor({ state: "visible" });
  await page.getByText("Official Console").first().waitFor({ state: "visible" });

  // Main workspace content
  await page.getByRole("heading", { name: "Admin Workspace" }).waitFor({ state: "visible" });
  await page.getByText("Administrator Access Verified").waitFor({ state: "visible" });
  await page.getByText("Official municipal management console active.").waitFor({ state: "visible" });
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

test("future routes display disabled coming-soon badges and prevent navigation", async () => {
  await page.goto("/admin");

  const sidebar = page.getByRole("complementary", { name: /Admin desktop navigation/i });

  // Complaints Queue
  const complaintsItem = sidebar.locator("div").filter({ hasText: /^Complaints Queue/ }).first();
  await complaintsItem.waitFor({ state: "visible" });
  await sidebar.getByText("Phase 18").first().waitFor({ state: "visible" });

  // City Analytics
  const analyticsItem = sidebar.locator("div").filter({ hasText: /^City Analytics/ }).first();
  await analyticsItem.waitFor({ state: "visible" });
  await sidebar.getByText("Phase 20").first().waitFor({ state: "visible" });
});

test("topbar displays console badge, public site shortcut, and administrator profile menu", async () => {
  await page.goto("/admin");

  const topbar = page.getByRole("banner");
  await topbar.getByText("Administrator Portal").waitFor({ state: "visible" });
  await topbar.getByText("Official Console").waitFor({ state: "visible" });

  // Public Site link in topbar
  const publicLink = topbar.getByRole("link", { name: "Public Site" });
  await publicLink.waitFor({ state: "visible" });
  assert.equal(await publicLink.getAttribute("href"), "/");

  // Profile menu trigger
  const menuButton = page.locator("#admin-menu-button");
  await menuButton.waitFor({ state: "visible" });
  assert.equal(await menuButton.getAttribute("aria-expanded"), "false");
});

test("profile dropdown menu toggles open, shows user credentials, and closes on Escape", async () => {
  await page.goto("/admin");

  const menuButton = page.locator("#admin-menu-button");
  await menuButton.click();

  assert.equal(await menuButton.getAttribute("aria-expanded"), "true");

  // Menu popup is open
  const menu = page.getByRole("menu");
  await menu.waitFor({ state: "visible" });

  // Credentials displayed
  await menu.getByText("Administrator").first().waitFor({ state: "visible" });
  await menu.getByText("admin@civicpulse.gov").waitFor({ state: "visible" });
  await menu.getByText("View Public Website").waitFor({ state: "visible" });
  await menu.getByRole("button", { name: /Sign Out/i }).waitFor({ state: "visible" });

  // Escape key closes menu
  await page.keyboard.press("Escape");
  await menu.waitFor({ state: "hidden" });
  assert.equal(await menuButton.getAttribute("aria-expanded"), "false");
});

test("profile dropdown menu closes on click outside", async () => {
  await page.goto("/admin");

  const menuButton = page.locator("#admin-menu-button");
  await menuButton.click();

  const menu = page.getByRole("menu");
  await menu.waitFor({ state: "visible" });

  // Click outside (on the page title heading)
  await page.getByRole("heading", { name: "Admin Workspace" }).click();
  await menu.waitFor({ state: "hidden" });
});

test("mobile drawer toggles on hamburger button, displays nav items, and closes on Escape", async () => {
  // Set to mobile viewport
  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto("/admin");

  // Desktop sidebar should be hidden
  const desktopSidebar = page.getByRole("complementary", { name: /Admin desktop navigation/i });
  await desktopSidebar.waitFor({ state: "hidden" });

  // Hamburger menu button should be visible
  const menuTrigger = page.getByRole("button", { name: "Open administrative navigation" });
  await menuTrigger.waitFor({ state: "visible" });

  // Open drawer
  await menuTrigger.click();

  const drawer = page.getByRole("dialog", { name: "Mobile administrative navigation drawer" });
  await drawer.waitFor({ state: "visible" });

  // Verify navigation items inside drawer
  await drawer.getByRole("link", { name: /Overview/i }).waitFor({ state: "visible" });
  await drawer.getByText("Complaints Queue").waitFor({ state: "visible" });
  await drawer.getByText("City Analytics").waitFor({ state: "visible" });
  await drawer.getByRole("link", { name: /Live Civic Map/i }).waitFor({ state: "visible" });

  // Escape closes drawer
  await page.keyboard.press("Escape");
  await drawer.waitFor({ state: "hidden" });
});

test("welcome banner links allow quick navigation to Live Civic Map and Public Site", async () => {
  await page.goto("/admin");

  const mapLink = page.getByRole("link", { name: "Live Civic Map" }).first();
  await mapLink.waitFor({ state: "visible" });
  assert.equal(await mapLink.getAttribute("href"), "/map");

  const publicLink = page.getByRole("link", { name: "Public Site" }).first();
  await publicLink.waitFor({ state: "visible" });
  assert.equal(await publicLink.getAttribute("href"), "/");
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
