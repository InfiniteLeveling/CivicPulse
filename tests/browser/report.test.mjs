import assert from "node:assert/strict";
import { after, afterEach, before, beforeEach, test } from "node:test";
import { chromium } from "playwright-core";

const baseURL = process.env.CIVICPULSE_TEST_URL ?? "http://127.0.0.1:3000";
let browser, page, errors;

const validImageBuffer = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
  "base64"
);

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
      // Ignore expected 404/409 network failures for the unprovisioned backend endpoints
      // and browser blob resource notifications
      if (
        text.includes("/api/uploads") ||
        text.includes("/api/ai/classify") ||
        text.includes("/api/reports") ||
        text.includes("404") ||
        text.includes("409") ||
        text.includes("net::ERR_FILE_NOT_FOUND") ||
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

test("report page loads with header, 4-step progress bar, form sections, and upcoming notices", async () => {
  const response = await page.goto("/report");
  assert.equal(response.status(), 200);

  // Header & back link
  await page.getByRole("heading", { name: "Report a Civic Issue" }).waitFor();
  await page.getByRole("link", { name: /Back to Dashboard/i }).waitFor();

  // 4 Progress steps
  const nav = page.locator("nav[aria-label='Reporting progress']");
  await nav.waitFor();
  await nav.getByText("Issue Details").waitFor();
  await nav.getByText("Add Photo").waitFor();
  await nav.getByText("Confirm Location").waitFor();
  await nav.getByText("Review & Submit").waitFor();

  // Inputs
  await page.locator("#report-title-input").waitFor();
  await page.locator("#report-description-input").waitFor();

  // 6 Categories
  await page.getByRole("radio", { name: /Pothole/i }).waitFor();
  await page.getByRole("radio", { name: /Garbage Accumulation/i }).waitFor();
  await page.getByRole("radio", { name: /Water Leakage/i }).waitFor();
  await page.getByRole("radio", { name: /Broken Streetlight/i }).waitFor();
  await page.getByRole("radio", { name: /Drainage Problem/i }).waitFor();
  await page.getByRole("radio", { name: /Other Civic Issue/i }).waitFor();

  // Photo dropzone
  await page.getByText("Add a Photo of the Problem").waitFor();
  await page.getByRole("button", { name: /Browse Files/i }).waitFor();
  await page.getByRole("button", { name: /Take Photo/i }).waitFor();
  await page.getByText(/Supported: JPG, PNG, WebP · Max 2 MB/i).waitFor();

  // Review Details button
  await page.getByRole("button", { name: /Review Details/i }).waitFor();
});

test("empty form submission triggers field-level validation errors", async () => {
  await page.goto("/report");

  // Click submit without entering values
  const reviewBtn = page.getByRole("button", { name: /Review Details/i });
  await reviewBtn.click();

  // Validation messages appear
  await page.getByText("Issue title is required.").waitFor();
  await page.getByText("Please describe the problem.").waitFor();
  await page.getByText("Please select an issue category.").waitFor();

  // Does not navigate or enter review view
  assert.equal(await page.getByText("Review Complaint Details").count(), 0);
});

test("short inputs trigger boundary validation errors", async () => {
  await page.goto("/report");

  const titleInput = page.locator("#report-title-input");
  const descInput = page.locator("#report-description-input");

  await titleInput.fill("Tiny");
  await descInput.fill("Too short");

  const reviewBtn = page.getByRole("button", { name: /Review Details/i });
  await reviewBtn.click();

  await page.getByText(/Issue title must be at least 5 characters/i).waitFor();
  await page.getByText(/Description must be at least 10 characters long/i).waitFor();
});

test("selecting a photograph renders preview and metadata, and removal restores dropzone", async () => {
  await page.goto("/report");
  await page.getByRole("heading", { name: "Report a Civic Issue" }).waitFor();

  // Set file into standard hidden file input
  const fileInput = page.getByLabel("Upload civic issue photograph");
  await fileInput.setInputFiles({
    name: "street-damage.png",
    mimeType: "image/png",
    buffer: validImageBuffer,
  });

  // Preview elements render
  await page.getByAltText("Preview of the selected civic issue photograph.").waitFor();
  await page.getByText("street-damage.png", { exact: true }).waitFor();
  await page.locator("[data-slot='badge']").getByText("PNG", { exact: true }).waitFor();
  await page.getByText(/Valid photo format & size/i).waitFor();

  // Upload status action card
  await page.getByText("Ready to Upload").waitFor();
  const uploadBtn = page.getByRole("button", { name: /Upload Photo/i });
  await uploadBtn.waitFor();

  // Click Remove button
  const removeBtn = page.getByRole("button", { name: /Remove/i });
  await removeBtn.click();

  // Dropzone restored
  await page.getByText("Add a Photo of the Problem").waitFor();
  assert.equal(await page.getByText("street-damage.png", { exact: true }).count(), 0);
});

test("attempting photo upload calls API and displays honest error when endpoint is offline", async () => {
  await page.goto("/report");

  const fileInput = page.getByLabel("Upload civic issue photograph");
  await fileInput.setInputFiles({
    name: "pothole-photo.png",
    mimeType: "image/png",
    buffer: validImageBuffer,
  });

  await page.getByText("Ready to Upload").waitFor();
  const uploadBtn = page.getByRole("button", { name: /Upload Photo/i });
  await uploadBtn.click();

  // Since /api/uploads is not yet provisioned, error is handled gracefully
  await page.getByText("Upload Unsuccessful").waitFor();
  await page.getByRole("button", { name: /Retry Upload/i }).waitFor();

  // Preview remains intact during retry state
  await page.getByAltText("Preview of the selected civic issue photograph.").waitFor();
  await page.getByText("pothole-photo.png", { exact: true }).waitFor();
});

test("valid details with attached photo transition to review mode and preserve values on edit", async () => {
  await page.goto("/report");

  const titleInput = page.locator("#report-title-input");
  const descInput = page.locator("#report-description-input");

  const testTitle = "Large asphalt crater on North Crossing Avenue";
  const testDesc = "Continuous breakdown of road surface causing hazard to cyclists and vehicles.";

  await titleInput.fill(testTitle);
  await descInput.fill(testDesc);

  // Select Pothole category
  const potholeRadio = page.getByRole("radio", { name: /Pothole/i });
  await potholeRadio.click();

  // Attach a photo
  const fileInput = page.getByLabel("Upload civic issue photograph");
  await fileInput.setInputFiles({
    name: "evidence-leak.png",
    mimeType: "image/png",
    buffer: validImageBuffer,
  });

  // Submit to Review
  const reviewBtn = page.getByRole("button", { name: /Review Details/i });
  await reviewBtn.click();

  // Review mode is displayed
  await page.getByText("Review Complaint Details").waitFor();
  await page.getByText("Issue Details & Photo Validated").waitFor();
  await page.getByText(testTitle).waitFor();
  await page.getByText(testDesc).waitFor();

  // Photo details rendered in review
  await page.getByText("evidence-leak.png", { exact: true }).waitFor();
  await page.locator("[data-slot='badge']").getByText("PNG", { exact: true }).waitFor();

  // Verify submit button is disabled (Phase 12 readiness check)
  const submitBtn = page.getByRole("button", { name: /Submit (Report|Complaint)/i });
  await submitBtn.waitFor();
  assert.equal(await submitBtn.isDisabled(), true);

  // Click Edit Details
  const editBtn = page.getByRole("button", { name: /Edit Details/i }).first();
  await editBtn.click();

  // Form mode restored with preserved values AND preserved photo
  await page.locator("#report-title-input").waitFor();
  assert.equal(await page.locator("#report-title-input").inputValue(), testTitle);
  assert.equal(await page.locator("#report-description-input").inputValue(), testDesc);
  await page.getByText("evidence-leak.png", { exact: true }).waitFor();
});

test("AI analysis panel appears upon photo selection, requires explicit consent and uploaded image ID, and allows skipping", async () => {
  await page.goto("/report");
  await page.getByRole("heading", { name: "Report a Civic Issue" }).waitFor();

  // No AI panel before photo selection
  assert.equal(await page.getByText("Let AI Help Identify the Issue").count(), 0);

  // Attach a photo
  const fileInput = page.getByLabel("Upload civic issue photograph");
  await fileInput.setInputFiles({
    name: "broken-lamp.png",
    mimeType: "image/png",
    buffer: validImageBuffer,
  });

  // AI Panel renders
  await page.getByText("Let AI Help Identify the Issue").waitFor();
  await page.getByText("Phase 9 Active").waitFor();

  // Checkbox is unchecked by default
  const consentCheckbox = page.getByRole("checkbox", {
    name: /Allow AI analysis of this photograph/i,
  });
  await consentCheckbox.waitFor();
  assert.equal(await consentCheckbox.isChecked(), false);

  // Analyze button is disabled because image is not uploaded yet
  const analyzeBtn = page.getByRole("button", { name: /Analyze Image/i });
  await analyzeBtn.waitFor();
  assert.equal(await analyzeBtn.isDisabled(), true);
  await page.getByText(/Upload your photo before using AI analysis/i).waitFor();

  // Citizen can skip AI anytime
  const skipBtn = page.getByRole("button", { name: /Skip AI/i });
  await skipBtn.waitFor();
  await skipBtn.click();
  await page.getByText(/Continuing with manual reporting/i).waitFor();
});

test("image removal or replacement clears AI consent and resets AI panel", async () => {
  await page.goto("/report");
  await page.getByRole("heading", { name: "Report a Civic Issue" }).waitFor();

  const fileInput = page.getByLabel("Upload civic issue photograph");
  await fileInput.setInputFiles({
    name: "drain-clog-1.png",
    mimeType: "image/png",
    buffer: validImageBuffer,
  });

  await page.getByText("Let AI Help Identify the Issue").waitFor();
  const consentCheckbox = page.getByRole("checkbox", {
    name: /Allow AI analysis of this photograph/i,
  });
  await consentCheckbox.click();
  assert.equal(await consentCheckbox.isChecked(), true);

  // Remove photograph
  const removeBtn = page.getByRole("button", { name: /Remove/i });
  await removeBtn.click();

  // AI panel disappears because no photo is selected
  assert.equal(await page.getByText("Let AI Help Identify the Issue").count(), 0);

  // Re-attach a new photograph
  await fileInput.setInputFiles({
    name: "drain-clog-2.png",
    mimeType: "image/png",
    buffer: validImageBuffer,
  });

  // AI panel reappears with fresh consent required (checkbox unchecked!)
  await page.getByText("Let AI Help Identify the Issue").waitFor();
  const freshConsent = page.getByRole("checkbox", {
    name: /Allow AI analysis of this photograph/i,
  });
  assert.equal(await freshConsent.isChecked(), false);
});

test("location section renders interactive map, detect button, and accessible coordinate inputs", async () => {
  await page.goto("/report");

  // Section heading and badges
  await page.getByRole("heading", { name: "5. Issue Location" }).waitFor();
  await page.getByText("Phase 10 Active").waitFor();

  // Detect My Location button
  const detectBtn = page.getByRole("button", { name: /Detect My Location/i });
  await detectBtn.waitFor();

  // Confirm button disabled when no location is chosen
  const confirmBtn = page.getByRole("button", { name: /Confirm Issue Location/i });
  await confirmBtn.waitFor();
  assert.equal(await confirmBtn.isDisabled(), true);
  await page.getByText(/No point selected yet/i).waitFor();

  // Open accessibility coordinates panel
  const coordsToggle = page.getByRole("button", { name: /Coordinates/i });
  await coordsToggle.waitFor();
  await coordsToggle.click();

  await page.getByText("Manual Coordinate Entry").waitFor();
  await page.getByLabel(/Latitude \(-90 to \+90\)/i).waitFor();
  await page.getByLabel(/Longitude \(-180 to \+180\)/i).waitFor();
  await page.getByRole("button", { name: /Set Coordinates/i }).waitFor();
});

test("selecting, confirming, and editing an issue location updates form and persists through review mode", async () => {
  await page.goto("/report");

  // Fill basics
  const titleInput = page.locator("#report-title-input");
  const descInput = page.locator("#report-description-input");
  await titleInput.fill("Massive storm drain overflow on 5th Avenue");
  await descInput.fill("Drainage grate completely obstructed by debris following heavy rain.");

  const drainRadio = page.getByRole("radio", { name: /Drainage Problem/i });
  await drainRadio.click();

  // Open manual coordinates panel and set valid location
  const coordsToggle = page.getByRole("button", { name: /Coordinates/i });
  await coordsToggle.click();

  const latInput = page.getByLabel(/Latitude \(-90 to \+90\)/i);
  const lngInput = page.getByLabel(/Longitude \(-180 to \+180\)/i);
  await latInput.fill("19.31490");
  await lngInput.fill("84.79410");

  const setCoordsBtn = page.getByRole("button", { name: /Set Coordinates/i });
  await setCoordsBtn.click();

  // Candidate coordinates displayed
  await page.getByText("19.31490°, 84.79410°").waitFor();
  await page.getByText("(Manual)").waitFor();

  // Confirm Location
  const confirmBtn = page.getByRole("button", { name: /Confirm Issue Location/i });
  assert.equal(await confirmBtn.isDisabled(), false);
  await confirmBtn.click();

  // Confirmed view rendered
  await page.getByText("Location Confirmed", { exact: true }).waitFor();
  await page.getByText("Change Location").waitFor();

  // Step 3 in progress bar shows Confirmed
  const nav = page.locator("nav[aria-label='Reporting progress']");
  await nav.getByText("Confirmed").waitFor();

  // Submit to Review
  const reviewBtn = page.getByRole("button", { name: /Review Details/i });
  await reviewBtn.click();

  // Review mode contains confirmed location coordinates
  await page.getByText("Review Complaint Details").waitFor();
  await page.getByText("19.31490°, 84.79410°").waitFor();
  await page.getByText("Geographical point verified by citizen").waitFor();
  await page.getByText("Manual Entry").waitFor();

  // Edit details round-trip preserves confirmed location
  const editBtn = page.getByRole("button", { name: /Edit Details/i }).first();
  await editBtn.click();

  await page.getByText("Location Confirmed", { exact: true }).waitFor();
  await page.getByText("Change Location").waitFor();

  // Click Change Location restores selection mode
  const changeLocBtn = page.getByRole("button", { name: /Change Location/i });
  await changeLocBtn.click();
  await page.getByRole("button", { name: /Confirm Issue Location/i }).waitFor();
});

test("duplicate check panel shows location prerequisite before location is confirmed", async () => {
  await page.goto("/report");

  // Section 6 header is present
  await page.getByRole("heading", { name: /6\. Nearby Reports & Duplicate Check/i }).waitFor();

  // Prerequisite notice is rendered
  const prereqNotice = page.locator("[data-testid='duplicate-prerequisite-notice']");
  await prereqNotice.waitFor();
  await prereqNotice.getByText("Location Confirmation Required").waitFor();
  await prereqNotice.getByText("Requires Section 5").waitFor();
});

test("confirming location enables nearby duplicate check and handles unprovisioned backend gracefully", async () => {
  await page.goto("/report");

  // Select category
  const streetRadio = page.getByRole("radio", { name: /Broken Streetlight/i });
  await streetRadio.click();

  // Confirm valid coordinates
  const coordsToggle = page.getByRole("button", { name: /Coordinates/i });
  await coordsToggle.click();

  const latInput = page.getByLabel(/Latitude \(-90 to \+90\)/i);
  const lngInput = page.getByLabel(/Longitude \(-180 to \+180\)/i);
  await latInput.fill("19.31490");
  await lngInput.fill("84.79410");

  const setCoordsBtn = page.getByRole("button", { name: /Set Coordinates/i });
  await setCoordsBtn.click();

  const confirmLocBtn = page.getByRole("button", { name: /Confirm Issue Location/i });
  await confirmLocBtn.click();

  // Duplicate check panel transitions to idle state with scan action
  const checkBtn = page.getByRole("button", { name: /Check Nearby Reports/i });
  await checkBtn.waitFor();

  // Click Check Nearby Reports
  await checkBtn.click();

  // Without backend endpoint provisioned, gracefully falls back to unavailable notice without crashing
  const unavailCard = page.locator("[data-testid='duplicate-unavailable']");
  await unavailCard.waitFor();
  await unavailCard.getByText("Duplicate Checking Unavailable").waitFor();
  await unavailCard.getByRole("button", { name: /Retry Check/i }).waitFor();
});

test("duplicate candidate matching, community support dialog, separate issue confirmation and review verification", async () => {
  // Mock POST /api/reports/duplicates with 1 candidate
  await page.route("**/api/reports/duplicates", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        data: {
          candidates: [
            {
              id: "cand-101",
              reference: "CIV-2026-042",
              title: "Dangerous deep pothole on MG Road",
              category: "pothole",
              status: "pending",
              distanceMeters: 38,
              supportCount: 5,
              imageUrl: null,
            },
          ],
        },
      }),
    });
  });

  await page.goto("/report");

  // Fill basics
  const titleInput = page.locator("#report-title-input");
  const descInput = page.locator("#report-description-input");
  await titleInput.fill("Very dangerous pothole near junction");
  await descInput.fill("Cars are dodging this massive pothole every day during peak hours.");

  // Select Pothole
  const potholeRadio = page.getByRole("radio", { name: /Pothole/i });
  await potholeRadio.click();

  // Set coordinates and confirm
  const coordsToggle = page.getByRole("button", { name: /Coordinates/i });
  await coordsToggle.click();

  const latInput = page.getByLabel(/Latitude \(-90 to \+90\)/i);
  const lngInput = page.getByLabel(/Longitude \(-180 to \+180\)/i);
  await latInput.fill("19.31490");
  await lngInput.fill("84.79410");

  const setCoordsBtn = page.getByRole("button", { name: /Set Coordinates/i });
  await setCoordsBtn.click();

  const confirmLocBtn = page.getByRole("button", { name: /Confirm Issue Location/i });
  await confirmLocBtn.click();

  // Check Nearby Reports
  const checkBtn = page.getByRole("button", { name: /Check Nearby Reports/i });
  await checkBtn.click();

  // Candidate card appears with distance and support count
  await page.getByText("CIV-2026-042").waitFor();
  await page.getByText("Dangerous deep pothole on MG Road").waitFor();
  await page.getByText("38m away").waitFor();
  await page.getByText("5 supports").waitFor();

  // Test "This Is My Issue" dialog
  const sameIssueBtn = page.getByRole("button", { name: /This Is My Issue/i });
  await sameIssueBtn.click();

  await page.getByRole("heading", { name: "Support Existing Complaint?" }).waitFor();
  await page.getByText("What happens when you support:").waitFor();

  // Close dialog via cancel
  const keepWritingBtn = page.getByRole("button", { name: /Keep Writing My Report/i });
  await keepWritingBtn.click();

  // Confirm separate issue
  const separateBtn = page.getByRole("button", { name: /My Issue Is Different/i });
  await separateBtn.click();

  await page.getByText("Confirmed separate from these 1 report(s).").waitFor();

  // Submit to Review
  const reviewBtn = page.getByRole("button", { name: /Review Details/i });
  await reviewBtn.click();

  // Review screen shows Duplicate Verification Status
  await page.getByText("Review Complaint Details").waitFor();
  await page.getByText("Duplicate Verification Status").waitFor();
  await page.getByText("Confirmed Separate Issue").waitFor();
  await page.getByText("Evaluated against 1 nearby candidate report(s) and confirmed distinct.").waitFor();
  await page.getByText("Verified Separate").waitFor();

  // Edit details round-trip
  const editBtn = page.getByRole("button", { name: /Edit Details/i }).first();
  await editBtn.click();

  // Changing category to Streetlight invalidates duplicate check
  const lightRadio = page.getByRole("radio", { name: /Broken Streetlight/i });
  await lightRadio.click();

  // Duplicate panel resets to idle ready for fresh check
  await page.getByRole("button", { name: /Check Nearby Reports/i }).waitFor();
});

test("report page is responsive with zero horizontal overflow across 5 viewports", async () => {
  const viewports = [
    { width: 320, height: 568 },
    { width: 375, height: 667 },
    { width: 768, height: 1024 },
    { width: 1024, height: 768 },
    { width: 1440, height: 900 },
  ];

  for (const vp of viewports) {
    await page.setViewportSize(vp);
    await page.goto("/report");
    await page.getByRole("heading", { name: "Report a Civic Issue" }).waitFor();

    const hasOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth;
    });
    assert.equal(hasOverflow, false, `Horizontal overflow detected at ${vp.width}x${vp.height}`);
  }
});

test("phase 12: final review screen displays readiness checklist and section edit controls", async () => {
  // Mock image upload
  await page.route("**/api/uploads", async (route) => {
    if (route.request().method() === "POST") {
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({
          data: {
            imageId: "img_p12_test_123",
            url: "https://example.com/mock-upload.png",
          },
        }),
      });
    } else {
      await route.continue();
    }
  });

  await page.goto("/report");

  // Section 1: Details
  const titleInput = page.locator("#report-title-input");
  const descInput = page.locator("#report-description-input");
  await titleInput.fill("Major garbage buildup near public park");
  await descInput.fill("Overflowing municipal trash bins creating odor and attracting stray animals.");
  const garbageRadio = page.getByRole("radio", { name: /Garbage Accumulation/i });
  await garbageRadio.click();

  // Section 2: Photo
  const fileInput = page.getByLabel("Upload civic issue photograph");
  await fileInput.setInputFiles({
    name: "park-waste.png",
    mimeType: "image/png",
    buffer: validImageBuffer,
  });
  const uploadBtn = page.getByRole("button", { name: /Upload Photo/i });
  await uploadBtn.click();
  await page.getByText(/Assigned Server Reference/i).waitFor();

  // Section 3: Location
  const coordsToggle = page.getByRole("button", { name: /Coordinates/i });
  await coordsToggle.click();

  const latInput = page.getByLabel(/Latitude \(-90 to \+90\)/i);
  const lngInput = page.getByLabel(/Longitude \(-180 to \+180\)/i);
  await latInput.fill("19.31490");
  await lngInput.fill("84.79410");
  const setCoordsBtn = page.getByRole("button", { name: /Set Coordinates/i });
  await setCoordsBtn.click();
  const confirmLocBtn = page.getByRole("button", { name: /Confirm Issue Location/i });
  await confirmLocBtn.click();

  // Review Details
  const reviewBtn = page.getByRole("button", { name: /Review Details/i });
  await reviewBtn.click();

  // Review screen is active
  await page.getByTestId("final-report-review").waitFor();
  await page.getByText("Review Complaint Details").waitFor();
  await page.getByText("Major garbage buildup near public park").waitFor();
  await page.getByText("Garbage", { exact: true }).waitFor();
  await page.getByText("Community-Visible").waitFor();
  await page.getByTestId("final-report-review").getByText("park-waste.png", { exact: true }).waitFor();
  await page.getByTestId("final-report-review").getByText("img_p12_test_123").waitFor();
  await page.getByText("19.31490°, 84.79410°").waitFor();
  await page.getByText("Ready for Submission: Problem summary, uploaded evidence, and confirmed coordinates are complete.").waitFor();

  // Submit button is enabled
  const submitButton = page.getByRole("button", { name: "Submit Complaint" });
  await submitButton.waitFor();
  assert.equal(await submitButton.isDisabled(), false);

  // Test section edit controls:
  // 1. Edit Details button
  const editDetailsBtn = page.getByTestId("edit-details-btn");
  await editDetailsBtn.click();
  await page.locator("#report-title-input").waitFor();
  assert.equal(await page.locator("#report-title-input").inputValue(), "Major garbage buildup near public park");

  // Return to Review
  await page.getByRole("button", { name: /Review Details/i }).click();
  await page.getByTestId("final-report-review").waitFor();

  // 2. Change Photo button
  const changePhotoBtn = page.getByTestId("change-photo-btn");
  await changePhotoBtn.click();
  await page.locator("#section-photo-heading").waitFor();

  // Return to Review
  await page.getByRole("button", { name: /Review Details/i }).click();
  await page.getByTestId("final-report-review").waitFor();

  // 3. Edit Location button
  const editLocBtn = page.getByTestId("edit-location-btn");
  await editLocBtn.click();
  await page.locator("#section-location-heading").waitFor();
});

test("phase 12: incomplete prerequisites disable submission and display checklist warnings", async () => {
  await page.goto("/report");

  // Fill details only
  const titleInput = page.locator("#report-title-input");
  const descInput = page.locator("#report-description-input");
  await titleInput.fill("Broken water pipe leaking clean drinking water");
  await descInput.fill("Large volume of water running into gutter along North Avenue.");
  const waterRadio = page.getByRole("radio", { name: /Water Leakage/i });
  await waterRadio.click();

  // Submit to Review without photo or location
  const reviewBtn = page.getByRole("button", { name: /Review Details/i });
  await reviewBtn.click();

  // Review screen displays readiness errors
  await page.getByTestId("final-report-review").waitFor();
  await page.getByText("Items Requiring Attention Before Submission:").waitFor();
  await page.getByRole("listitem").filter({ hasText: "Please attach a photograph of the problem." }).waitFor();
  await page.getByText("Issue location must be explicitly confirmed on the map.").waitFor();

  // Submit button is disabled
  const submitButton = page.getByRole("button", { name: "Submit Complaint" });
  await submitButton.waitFor();
  assert.equal(await submitButton.isDisabled(), true);
});

test("phase 12: pre-submission dialog opens with visibility disclosure and can be dismissed", async () => {
  // Mock image upload
  await page.route("**/api/uploads", async (route) => {
    if (route.request().method() === "POST") {
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({
          data: {
            imageId: "img_dialog_test",
            url: "https://example.com/mock.png",
          },
        }),
      });
    } else {
      await route.continue();
    }
  });

  await page.goto("/report");

  await page.locator("#report-title-input").fill("Dangerous pothole near crosswalk");
  await page.locator("#report-description-input").fill("Deep cavity in asphalt right where school children cross daily.");
  await page.getByRole("radio", { name: /Pothole/i }).click();

  const fileInput = page.getByLabel("Upload civic issue photograph");
  await fileInput.setInputFiles({
    name: "crosswalk-pothole.png",
    mimeType: "image/png",
    buffer: validImageBuffer,
  });
  await page.getByRole("button", { name: /Upload Photo/i }).click();
  await page.getByText(/Assigned Server Reference/i).waitFor();

  await page.getByRole("button", { name: /Coordinates/i }).click();
  await page.getByLabel(/Latitude \(-90 to \+90\)/i).fill("19.31490");
  await page.getByLabel(/Longitude \(-180 to \+180\)/i).fill("84.79410");
  await page.getByRole("button", { name: /Set Coordinates/i }).click();
  await page.getByRole("button", { name: /Confirm Issue Location/i }).click();

  await page.getByRole("button", { name: /Review Details/i }).click();
  await page.getByTestId("final-report-review").waitFor();

  // Open confirmation dialog
  const submitButton = page.getByRole("button", { name: "Submit Complaint" });
  await submitButton.click();

  // Dialog rendered
  const dialog = page.getByTestId("report-submission-dialog");
  await dialog.waitFor();
  await dialog.getByText("Ready to Submit Your Report?").waitFor();
  await dialog.getByText("Public Visibility Notice").waitFor();
  await dialog.getByText("Dangerous pothole near crosswalk").waitFor();

  // Dismiss dialog via "Review Again"
  const cancelBtn = dialog.getByRole("button", { name: "Review Again" });
  await cancelBtn.click();

  // Dialog is closed, review remains active
  await dialog.waitFor({ state: "hidden" });
  assert.equal(await dialog.isVisible(), false);
  await page.getByTestId("final-report-review").waitFor();
});

test("phase 12: successful submission transitions to ReportSuccess with server reference and draft reset", async () => {
  // Mock image upload
  await page.route("**/api/uploads", async (route) => {
    if (route.request().method() === "POST") {
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({
          data: {
            imageId: "img_server_drainage_p12",
            url: "https://example.com/drainage.png",
          },
        }),
      });
    } else {
      await route.continue();
    }
  });

  // Mock successful report creation
  await page.route("**/api/reports", async (route) => {
    if (route.request().method() === "POST") {
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({
          data: {
            report: {
              id: "rep-p12-drainage-uuid",
              reference: "CIV-2026-DRAIN-01",
              title: "Blocked stormwater drain on Ring Road",
              description: "Debris and plastic obstructing culvert causing roadway inundation.",
              category: "drainage",
              status: "pending",
              latitude: 19.3149,
              longitude: 84.7941,
              visibility: "public",
              imageId: "img_server_drainage_p12",
              createdAt: "2026-11-21T10:30:00Z",
              supportCount: 1,
            },
          },
        }),
      });
    } else {
      await route.continue();
    }
  });

  await page.goto("/report");

  await page.locator("#report-title-input").fill("Blocked stormwater drain on Ring Road");
  await page.locator("#report-description-input").fill("Debris and plastic obstructing culvert causing roadway inundation.");
  await page.getByRole("radio", { name: /Drainage Problem/i }).click();

  const fileInput = page.getByLabel("Upload civic issue photograph");
  await fileInput.setInputFiles({
    name: "drain-blocked.png",
    mimeType: "image/png",
    buffer: validImageBuffer,
  });
  await page.getByRole("button", { name: /Upload Photo/i }).click();
  await page.getByText(/Assigned Server Reference/i).waitFor();

  await page.getByRole("button", { name: /Coordinates/i }).click();
  await page.getByLabel(/Latitude \(-90 to \+90\)/i).fill("19.31490");
  await page.getByLabel(/Longitude \(-180 to \+180\)/i).fill("84.79410");
  await page.getByRole("button", { name: /Set Coordinates/i }).click();
  await page.getByRole("button", { name: /Confirm Issue Location/i }).click();

  await page.getByRole("button", { name: /Review Details/i }).click();
  await page.getByTestId("final-report-review").waitFor();

  // Submit complaint
  await page.getByRole("button", { name: "Submit Complaint" }).click();
  const confirmBtn = page.getByTestId("confirm-submit-dialog-btn");
  await confirmBtn.click();

  // Success view appears
  const successView = page.getByTestId("report-success-view");
  await successView.waitFor();
  await successView.getByText("Complaint Submitted Successfully!").waitFor();
  await successView.getByText("CIV-2026-DRAIN-01").waitFor();
  await successView.getByText("Official Report Registered").waitFor();
  await successView.getByText("Drainage", { exact: true }).waitFor();
  await successView.getByText("19.31490°, 84.79410°").waitFor();
  await successView.getByText("What Happens Next?").waitFor();
  await successView.getByRole("link", { name: /Go to Dashboard/i }).waitFor();
  await successView.getByRole("link", { name: /My Complaints/i }).waitFor();

  // Test "Report Another Issue" resets draft
  const reportAnotherBtn = page.getByTestId("report-another-btn");
  await reportAnotherBtn.click();

  // Restores clean intake form
  await page.locator("#report-title-input").waitFor();
  assert.equal(await page.locator("#report-title-input").inputValue(), "");
  assert.equal(await page.locator("#report-description-input").inputValue(), "");
  await page.getByText("Add a Photo of the Problem").waitFor();
  assert.equal(await page.locator("form").getByText("drain-blocked.png").count(), 0);
});

test("phase 12: handles HTTP 409 DUPLICATE_CANDIDATES conflict by returning to duplicate check", async () => {
  // Mock image upload
  await page.route("**/api/uploads", async (route) => {
    if (route.request().method() === "POST") {
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({
          data: {
            imageId: "img_p12_conflict",
            url: "https://example.com/lamp.png",
          },
        }),
      });
    } else {
      await route.continue();
    }
  });

  // Mock 409 duplicate conflict
  await page.route("**/api/reports", async (route) => {
    if (route.request().method() === "POST") {
      await route.fulfill({
        status: 409,
        contentType: "application/json",
        body: JSON.stringify({
          error: {
            code: "DUPLICATE_CANDIDATES",
            message: "Nearby duplicate reports detected.",
            details: {
              candidates: [
                {
                  id: "dup-conflict-101",
                  reference: "CIV-2026-CANDIDATE-X",
                  title: "Existing broken streetlight at intersection",
                  category: "streetlight",
                  status: "pending",
                  latitude: 19.315,
                  longitude: 84.794,
                  distanceMeters: 14,
                  supportCount: 6,
                },
              ],
            },
          },
        }),
      });
    } else {
      await route.continue();
    }
  });

  await page.goto("/report");

  await page.locator("#report-title-input").fill("Streetlight not functioning on Sector 4");
  await page.locator("#report-description-input").fill("Fixture remains completely dark creating safety hazard after dusk.");
  await page.getByRole("radio", { name: /Broken Streetlight/i }).click();

  const fileInput = page.getByLabel("Upload civic issue photograph");
  await fileInput.setInputFiles({
    name: "broken-lamp.png",
    mimeType: "image/png",
    buffer: validImageBuffer,
  });
  await page.getByRole("button", { name: /Upload Photo/i }).click();
  await page.getByText(/Assigned Server Reference/i).waitFor();

  await page.getByRole("button", { name: /Coordinates/i }).click();
  await page.getByLabel(/Latitude \(-90 to \+90\)/i).fill("19.31490");
  await page.getByLabel(/Longitude \(-180 to \+180\)/i).fill("84.79410");
  await page.getByRole("button", { name: /Set Coordinates/i }).click();
  await page.getByRole("button", { name: /Confirm Issue Location/i }).click();

  await page.getByRole("button", { name: /Review Details/i }).click();
  await page.getByTestId("final-report-review").waitFor();

  // Submit complaint
  await page.getByRole("button", { name: "Submit Complaint" }).click();
  await page.getByTestId("confirm-submit-dialog-btn").click();

  // Conflict redirects citizen back to duplicate inspection in edit view
  await page.locator("#section-duplicate-heading").waitFor();
  await page.getByText("CIV-2026-CANDIDATE-X").waitFor();
  await page.getByText("Existing broken streetlight at intersection").waitFor();
  await page.getByText("14m away").waitFor();
  await page.getByText("6 supports").waitFor();

  // Form values are preserved
  assert.equal(
    await page.locator("#report-title-input").inputValue(),
    "Streetlight not functioning on Sector 4"
  );
});

test("phase 12: handles network failure with outcome unknown error while preserving draft", async () => {
  // Mock image upload
  await page.route("**/api/uploads", async (route) => {
    if (route.request().method() === "POST") {
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({
          data: {
            imageId: "img_p12_network_test",
            url: "https://example.com/damaged-sign.png",
          },
        }),
      });
    } else {
      await route.continue();
    }
  });

  // Mock network disconnection on reports dispatch
  await page.route("**/api/reports", async (route) => {
    if (route.request().method() === "POST") {
      await route.abort("failed");
    } else {
      await route.continue();
    }
  });

  await page.goto("/report");

  await page.locator("#report-title-input").fill("Damaged road divider sign");
  await page.locator("#report-description-input").fill("Metal traffic sign bent into oncoming lane creating collision risk.");
  await page.getByRole("radio", { name: /Other Civic Issue/i }).click();

  const fileInput = page.getByLabel("Upload civic issue photograph");
  await fileInput.setInputFiles({
    name: "damaged-sign.png",
    mimeType: "image/png",
    buffer: validImageBuffer,
  });
  await page.getByRole("button", { name: /Upload Photo/i }).click();
  await page.getByText(/Assigned Server Reference/i).waitFor();

  await page.getByRole("button", { name: /Coordinates/i }).click();
  await page.getByLabel(/Latitude \(-90 to \+90\)/i).fill("19.31490");
  await page.getByLabel(/Longitude \(-180 to \+180\)/i).fill("84.79410");
  await page.getByRole("button", { name: /Set Coordinates/i }).click();
  await page.getByRole("button", { name: /Confirm Issue Location/i }).click();

  await page.getByRole("button", { name: /Review Details/i }).click();
  await page.getByTestId("final-report-review").waitFor();

  // Submit complaint
  await page.getByRole("button", { name: "Submit Complaint" }).click();
  await page.getByTestId("confirm-submit-dialog-btn").click();

  // Network error alert is displayed
  const errorAlert = page.getByTestId("submission-unknown-error");
  await errorAlert.waitFor();
  await errorAlert.getByText("Submission Outcome Unknown").waitFor();
  await errorAlert.getByRole("link", { name: /Check My Dashboard/i }).waitFor();
  await errorAlert.getByRole("button", { name: /Try Submitting Again/i }).waitFor();

  // Draft is preserved
  await page.getByText("Damaged road divider sign").waitFor();
});
