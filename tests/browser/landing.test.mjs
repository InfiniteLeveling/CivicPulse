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
  page.on("console", (entry) => { if (entry.type() === "error") errors.push(entry.text()); });
  page.on("pageerror", error => errors.push(error.message));
  page.on("request", request => { if (new URL(request.url()).pathname.startsWith("/api/")) apiRequests.push(request.url()); });
  const response = await page.goto("/");
  assert.equal(response.status(), 200);
  await page.getByRole("heading", { level: 1, name: "Your City. Your Voice. Your Impact." }).waitFor();
});
afterEach(async () => {
  await page?.close();
  assert.deepEqual(errors, [], "Browser errors");
  assert.deepEqual(apiRequests, [], "Unexpected backend calls");
});
after(async () => { await browser?.close(); });

async function checkAnchor(link) {
  const href = await link.getAttribute("href");
  await link.click();
  await page.waitForURL(url => url.pathname + url.hash === href);
  if (href.includes("#")) {
    await page.waitForFunction(hash => {
      const target = document.getElementById(hash);
      if (!target) return false;
      const top = target.getBoundingClientRect().top;
      return top >= document.querySelector(".public-header").getBoundingClientRect().bottom - 1 && top < innerHeight;
    }, href.split("#")[1], { timeout: 5000 });
  } else {
    await page.waitForFunction(() => scrollY < 5);
  }
  if (!href.startsWith("/#") && href !== "/") {
    await page.goto("/");
    await page.getByRole("heading", { level: 1, name: "Your City. Your Voice. Your Impact." }).waitFor();
  }
}

test("desktop navigation, both CTA groups, preview actions and footer reach visible destinations", async () => {
  assert.equal(await page.title(), "CivicPulse | Intelligent Civic Problem Resolution");
  assert.match(await page.locator('meta[name="description"]').getAttribute("content"), /discover community problems/);
  const header = page.getByRole("banner");
  const nav = page.getByRole("navigation", { name: "Main navigation" });
  for (const label of ["Features", "How It Works", "About", "Explore Map", "Home"]) {
    await checkAnchor(nav.getByRole("link", { name: label, exact: true }));
  }
  for (const label of ["Sign In", "Report an Issue", "CivicPulse home"]) {
    await checkAnchor(header.getByRole("link", { name: label, exact: true }));
  }
  for (const section of [page.locator(".hero-section"), page.locator('section[aria-labelledby="cta-title"]')]) {
    for (const label of ["Report an Issue", "Explore Civic Map"]) {
      await checkAnchor(section.getByRole("link", { name: label, exact: true }));
    }
  }
  await checkAnchor(page.getByRole("link", { name: /Report New Issue/ }));
  const footer = page.getByRole("contentinfo");
  for (const link of await footer.getByRole("link").all()) await checkAnchor(link);
});

test("mobile menu supports Escape, keyboard navigation, focus return, and same-page dismissal", async () => {
  await page.setViewportSize({ width: 320, height: 780 });
  const open = page.getByRole("button", { name: "Open menu" });
  await open.focus();
  await page.keyboard.press("Enter");
  const menu = page.getByRole("navigation", { name: "Mobile navigation" });
  await menu.waitFor();
  await page.keyboard.press("Tab");
  assert.equal(await menu.getByRole("link", { name: "Home", exact: true }).evaluate(el => el === document.activeElement), true);
  await page.keyboard.press("Escape");
  await menu.waitFor({ state: "hidden" });
  assert.equal(await open.evaluate(el => el === document.activeElement), true);
  for (const label of ["Features", "How It Works", "Explore Map", "About", "Sign In", "Report an Issue", "Home"]) {
    await open.click();
    await checkAnchor(menu.getByRole("link", { name: label, exact: true }));
    assert.equal(await open.getAttribute("aria-expanded"), "false");
  }
  await open.click();
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.setViewportSize({ width: 375, height: 800 });
  await open.waitFor();
});

test("neighborhood examples and FAQ expand, change and close by keyboard", async () => {
  const map = page.getByRole("figure", { name: "Civic map demonstration" });
  const title = map.locator("figcaption");
  await map.getByRole("button", { name: "Next sample report" }).click();
  assert.match(await title.innerText(), /Streetlight needs repair/);
  await map.getByRole("button", { name: "Previous sample report" }).click();
  assert.match(await title.innerText(), /Pothole at the crossing/);
  for (const button of await map.getByRole("button", { name: /^Show / }).all()) {
    await button.focus();
    await page.keyboard.press("Enter");
    assert.equal(await button.getAttribute("aria-pressed"), "true");
  }
  const triggers = page.locator('[data-slot="accordion-trigger"]');
  for (const question of await triggers.all()) {
    await question.focus();
    await page.keyboard.press("Enter");
    assert.equal(await question.getAttribute("aria-expanded"), "true");
    const panelId = await question.getAttribute("aria-controls");
    assert.ok(await page.evaluate(id => document.getElementById(id)?.textContent.trim().length > 20, panelId));
    await page.keyboard.press("Space");
    assert.equal(await question.getAttribute("aria-expanded"), "false");
  }
});

test("section order, six categories, local image and overflow across all required widths", async () => {
  const headings = await page.locator("main h2").allTextContents();
  assert.deepEqual(headings, ["A shared record of local issues", "What you can report", "How CivicPulse works",
    "Tools for a clearer picture", "Who it’s designed for", "Who handles each step?", "Inside the platform",
    "Frequently asked questions", "A better community starts with a single report."]);
  assert.equal(await page.locator(".category-card").count(), 6);
  assert.equal(await page.locator(".workflow-list li").count(), 8);
  await page.waitForFunction(() => document.querySelector("#civic-map img")?.naturalWidth > 0);
  for (const width of [320, 375, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 850 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), width, "Overflow at " + width);
    assert.equal(await page.getByRole("button", { name: "Open menu" }).isVisible(), width < 1024);
    if (width < 1024) {
      await page.getByRole("button", { name: "Open menu" }).click();
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), width);
      await page.keyboard.press("Escape");
    }
  }
});
