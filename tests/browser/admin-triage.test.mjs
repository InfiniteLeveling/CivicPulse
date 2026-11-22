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
        text.includes("404") &&
        (text.includes("/api/reports") ||
          text.includes("/api/admin") ||
          text.includes("/api/stats"))
      ) {
        return;
      }
      errors.push(text);
    }
  });
});

afterEach(async () => {
  await page?.close();
});

test("admin complaint detail route loads with header, breadcrumb, and case overview", async () => {
  await page.goto("/admin/complaints/rep-2001");

  // Breadcrumb back to complaints queue
  const backLink = page.getByRole("link", { name: /Back to Complaints Queue/i });
  await backLink.waitFor({ state: "visible" });
  assert.equal(await backLink.getAttribute("href"), "/admin/complaints");

  // Reference and Title
  await page.getByText("CP-2001").waitFor({ state: "visible" });
  await page.getByRole("heading", { name: "Deep pothole at main campus crossing" }).waitFor({ state: "visible" });

  // Status and Severity badges in header
  await page.getByText("In Progress").first().waitFor({ state: "visible" });
  await page.getByText("High").first().waitFor({ state: "visible" });

  // Overview section
  await page.getByText("Complaint Description").waitFor({ state: "visible" });
  await page.getByText("Substantial asphalt breakdown").waitFor({ state: "visible" });

  // Department and Visibility
  await page.getByText("Road Maintenance").first().waitFor({ state: "visible" });
  await page.getByText(/Public \(Map & Discovery Visible\)/i).waitFor({ state: "visible" });
});

test("sidebar maintains active highlighting on Complaints Queue when on detail page", async () => {
  await page.goto("/admin/complaints/rep-2001");

  const sidebar = page.getByRole("complementary", { name: "Admin desktop navigation" });
  await sidebar.waitFor({ state: "visible" });

  const queueLink = sidebar.getByRole("link", { name: /Complaints Queue/i });
  await queueLink.waitFor({ state: "visible" });

  const ariaCurrent = await queueLink.getAttribute("aria-current");
  assert.equal(ariaCurrent, "page");
});

test("photograph, location preview, and status timeline render properly", async () => {
  await page.goto("/admin/complaints/rep-2001");

  // Issue Photograph
  await page.getByText("Submitted Issue Photograph").waitFor({ state: "visible" });

  // Location preview with coordinates and OpenStreetMap link
  await page.getByText("Issue Location").waitFor({ state: "visible" });
  await page.getByText("12.97160° N").waitFor({ state: "visible" });
  await page.getByText("77.59460° E").waitFor({ state: "visible" });
  const osmLink = page.getByRole("link", { name: /OpenStreetMap/i });
  await osmLink.waitFor({ state: "visible" });

  // Status timeline
  await page.getByText("Status Timeline").waitFor({ state: "visible" });
  await page.getByText(/Citizen intake received/i).waitFor({ state: "visible" });
});

test("department selector loads departments and indicates recommended department", async () => {
  await page.goto("/admin/complaints/rep-2001");

  const deptSelect = page.locator("#department-select");
  await deptSelect.waitFor({ state: "visible" });

  // Road Maintenance is recommended for pothole
  await page.getByText(/Recommended: Road Maintenance/i).waitFor({ state: "visible" });

  // Has Road Maintenance selected
  const selectedValue = await deptSelect.inputValue();
  assert.equal(selectedValue, "dept-1");
});

test("triage form enables saving updated category, severity, and department", async () => {
  await page.goto("/admin/complaints/rep-2001");

  // Change category to Streetlight
  const categorySelect = page.locator("#triage-category");
  await categorySelect.selectOption("streetlight");

  // Recommendation updates to Electrical Services
  await page.getByText(/Recommended: Electrical Services/i).waitFor({ state: "visible" });

  // Change department to Electrical Services
  const deptSelect = page.locator("#department-select");
  await deptSelect.selectOption("dept-2");

  // Add a remark
  const remarkArea = page.locator("#triage-remark");
  await remarkArea.fill("Reclassifying issue to electrical lighting department.");

  // Save Triage Changes button is enabled
  const saveBtn = page.getByRole("button", { name: /Save Triage Changes/i });
  assert.equal(await saveBtn.isEnabled(), true);

  await saveBtn.click();

  // Success toast appears
  await page.getByText(/Complaint triage updated successfully/i).waitFor({ state: "visible" });
});

test("changing private report visibility to public triggers safeguard confirmation dialog", async () => {
  // rep-2005 is private by default
  await page.goto("/admin/complaints/rep-2005");

  // Confirm it starts private
  await page.getByText(/Private \(Citizen & Staff Only\)/i).waitFor({ state: "visible" });

  // Select Public in visibility dropdown
  const visibilitySelect = page.locator("#triage-visibility");
  await visibilitySelect.selectOption("public");

  // Click Save Triage Changes
  const saveBtn = page.getByRole("button", { name: /Save Triage Changes/i });
  await saveBtn.click();

  // Confirmation dialog opens
  const confirmDialog = page.getByRole("dialog", { name: /Publish Previously Private Complaint\?/i });
  await confirmDialog.waitFor({ state: "visible" });
  await confirmDialog.getByText(/will make its description, category, and confirmed geographic location visible/i).waitFor({ state: "visible" });

  // Click cancel
  const cancelBtn = confirmDialog.getByRole("button", { name: "Cancel" });
  await cancelBtn.click();
  await confirmDialog.waitFor({ state: "hidden" });
});

test("status update form presents valid lifecycle transitions", async () => {
  // rep-2002 is pending by default
  await page.goto("/admin/complaints/rep-2002");

  const statusSelect = page.locator("#target-status-select");
  await statusSelect.waitFor({ state: "visible" });

  // Pending complaint allows In Progress and Resolved
  const inProgressOption = statusSelect.locator("option[value='in_progress']");
  const resolvedOption = statusSelect.locator("option[value='resolved']");
  assert.equal(await inProgressOption.count(), 1);
  assert.equal(await resolvedOption.count(), 1);

  // Transition to In Progress
  await statusSelect.selectOption("in_progress");
  const remarkArea = page.locator("#status-remark");
  await remarkArea.fill("Field crew dispatched for streetlight inspection.");

  const submitBtn = page.getByRole("button", { name: /Start Progress/i });
  await submitBtn.click();

  // Success toast appears
  await page.getByText(/Complaint status updated successfully/i).waitFor({ state: "visible" });
});

test("selecting resolved status reveals resolution evidence upload and triggers confirmation", async () => {
  await page.goto("/admin/complaints/rep-2001");

  const statusSelect = page.locator("#target-status-select");
  await statusSelect.selectOption("resolved");

  // Resolution evidence upload zone is visible
  await page.getByText("Resolution Evidence Photograph").waitFor({ state: "visible" });

  // Click Mark Complaint as Resolved
  const submitBtn = page.getByRole("button", { name: /Mark Complaint as Resolved/i });
  await submitBtn.click();

  // Confirmation dialog opens
  const confirmDialog = page.getByRole("dialog", { name: /Confirm Complaint Resolution/i });
  await confirmDialog.waitFor({ state: "visible" });
  await confirmDialog.getByText(/transition this complaint to Resolved status\?/i).waitFor({ state: "visible" });

  // Confirm resolution
  const confirmBtn = confirmDialog.getByRole("button", { name: "Confirm Resolution" });
  await confirmBtn.click();

  // Success confirmation
  await page.getByText(/Complaint status updated successfully/i).waitFor({ state: "visible" });
});

test("admin complaint detail page maintains zero horizontal overflow across responsive viewports", async () => {
  const viewports = [
    { width: 320, height: 600 },
    { width: 375, height: 667 },
    { width: 768, height: 1024 },
    { width: 1024, height: 768 },
    { width: 1440, height: 900 },
  ];

  for (const vp of viewports) {
    await page.setViewportSize(vp);
    await page.goto("/admin/complaints/rep-2001");

    await page.getByText("CP-2001").waitFor({ state: "visible" });

    // Verify zero horizontal overflow
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
