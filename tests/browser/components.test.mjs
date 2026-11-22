import assert from "node:assert/strict";
import { after, afterEach, before, beforeEach, test } from "node:test";
import { chromium } from "playwright-core";

const baseURL = process.env.CIVICPULSE_TEST_URL ?? "http://127.0.0.1:3000";
let browser, page, errors;

before(async () => {
  browser = await chromium.launch({
    channel: process.env.CIVICPULSE_BROWSER_CHANNEL ?? (process.platform === "win32" ? "msedge" : "chrome"),
    executablePath: process.env.CIVICPULSE_BROWSER_PATH,
  });
});

beforeEach(async () => {
  errors = [];
  page = await browser.newPage({ baseURL, reducedMotion: "reduce" });
  page.setDefaultTimeout(6000);
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (entry) => { if (entry.type() === "error") errors.push(entry.text()); });
  const response = await page.goto("/dev/ui");
  assert.equal(response.status(), 200);
  await page.getByRole("heading", { name: "Component library" }).waitFor();
});

afterEach(async () => {
  await page?.close();
  assert.deepEqual(errors, [], "Browser errors");
});
after(async () => { await browser?.close(); });

const button = (name) => page.getByRole("button", { name, exact: true });
const tab = (name) => page.getByRole("tab", { name });
const field = (name) => page.getByLabel(name);

test("variants, form validation, helper text and size changes", async () => {
  const title = field("Example title");
  await button("Validate fields").click();
  await page.getByText("Enter an example title.").waitFor();
  assert.equal(await title.getAttribute("aria-invalid"), "true");
  assert.equal(await title.evaluate(el => el === document.activeElement), true);
  assert.match(await title.evaluate(el => el.getAttribute("aria-describedby").split(" ")
    .map(id => document.getElementById(id).textContent).join(" ")), /Use a short title.*Enter an example title/);
  await button("Reset messages").click();
  assert.equal(await page.getByText("Enter an example title.").count(), 0);
  await button("Fill example").click();
  await button("Validate fields").click();
  await page.getByText("Example values are valid.").waitFor();
  await button("Hide hints").click();
  assert.equal(await title.getAttribute("aria-describedby"), null);
  await button("Show sample password").click();
  assert.equal(await page.getByRole("textbox", { name: "Sample password", exact: true }).getAttribute("type"), "text");
  await button("Hide sample password").click();
  assert.equal(await page.locator('input[type="password"]').count(), 1);
  const sizes = [];
  for (const size of ["sm", "default", "lg"]) {
    await field("Button size").selectOption(size);
    sizes.push((await button("Validate fields").boundingBox()).height);
  }
  assert.ok(sizes[0] < sizes[1] && sizes[1] < sizes[2]);
  await button("View indicators").click();
  assert.equal(await tab("Indicators").getAttribute("aria-selected"), "true");
});

test("readonly, disabled and loading states prevent editing and submission", async () => {
  const title = field("Example title");
  for (const state of ["Read-only", "Disabled", "Loading", "Normal"]) {
    await page.getByRole("radio", { name: state, exact: true }).click();
    assert.equal(await title.isEditable(), state === "Normal");
    assert.equal(await button("Validate fields").isDisabled(), ["Disabled", "Loading"].includes(state));
    if (state === "Loading") {
      assert.equal(await button("Validate fields").getAttribute("aria-busy"), "true");
      const spinner = button("Validate fields").locator('[data-slot="spinner"]');
      assert.equal(await spinner.evaluate(el => getComputedStyle(el).animationName), "none");
    }
  }
});

test("keyboard tab navigation, modal focus, Escape, cancellation and confirmation", async () => {
  await tab("Controls").focus();
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("Enter");
  assert.equal(await tab("Indicators").getAttribute("aria-selected"), "true");
  await tab("Controls").click();
  await button("Fill example").click();
  const trigger = button("Clear example");
  const cancel = button("Cancel");
  const confirm = button("Clear values");
  const opened = page.getByRole("alertdialog", { name: "Clear example values?" });
  await trigger.focus();
  await page.keyboard.press("Enter");
  await opened.waitFor();
  await page.waitForFunction(() => document.activeElement?.textContent === "Cancel");
  await page.keyboard.press("Shift+Tab");
  await confirm.and(page.locator(":focus")).waitFor();
  await page.keyboard.press("Tab");
  await cancel.and(page.locator(":focus")).waitFor();
  await page.keyboard.press("Escape");
  await opened.waitFor({ state: "hidden" });
  await page.waitForFunction(() => document.activeElement?.textContent === "Clear example");
  assert.equal(await trigger.evaluate(el => getComputedStyle(el).outlineStyle), "solid");
  await trigger.click();
  await cancel.click();
  assert.equal(await field("Example title").inputValue(), "Field preview");
  await trigger.click();
  await confirm.click();
  await page.getByText("Example values cleared.").waitFor();
  assert.equal(await field("Example title").inputValue(), "");
});

test("all canonical badges, priority boundaries, invalid scores and independent urgency", async () => {
  await tab("Indicators").click();
  for (const label of ["Pending", "In Progress", "Resolved", "Low", "Medium", "High", "Critical", "AI-suggested", "Admin-reviewed"]) {
    await page.getByText(label, { exact: true }).first().waitFor();
  }
  for (const [score, band] of [[0,"Low"],[39,"Low"],[40,"Medium"],[69,"Medium"],[70,"High"],[100,"High"]]) {
    await page.getByText(band + " priority · " + score, { exact: true }).waitFor();
  }
  assert.equal(await page.getByText("Invalid priority score", { exact: true }).count(), 3);
  const toggle = page.getByRole("checkbox", { name: "Mark examples urgent" });
  await toggle.focus();
  await page.keyboard.press("Space");
  assert.equal(await page.getByText("Urgent", { exact: true }).count(), 9);
});

test("empty and retry actions change preview state and the card links home", async () => {
  await tab("Feedback").click();
  await button("Add example").click();
  await page.getByText("One preview item added.").waitFor();
  await button("Remove example").click();
  await page.getByText("No example items").waitFor();
  await button("Try again").click();
  assert.equal(await page.locator("dd").textContent(), "1");
  assert.equal(await page.locator('[data-slot="skeleton"]').first().evaluate(el => getComputedStyle(el).animationName), "none");
  await page.getByRole("link", { name: "Open homepage" }).click();
  await page.getByRole("heading", { name: "Your City. Your Voice. Your Impact.", exact: true }).waitFor();
  assert.equal(await page.title(), "CivicPulse | Intelligent Civic Problem Resolution");
});

test("all preview panels and the confirmation popup fit five viewport widths", async () => {
  for (const width of [320, 375, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 800 });
    for (const name of ["Indicators", "Feedback", "Controls"]) {
      await tab(name).click();
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, name + " at " + width);
    }
    await button("Clear example").click();
    const rect = await page.getByRole("alertdialog").boundingBox();
    assert.ok(rect && rect.x >= 0 && rect.x + rect.width <= width && rect.y >= 0 && rect.y + rect.height <= 800);
    await button("Cancel").click();
  }
});
