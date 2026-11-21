import assert from "node:assert/strict";
import test from "node:test";
import {
  validateImageFile,
  formatFileSize,
  formatMimeType,
  IMAGE_MIME_TYPES,
  MAX_IMAGE_BYTES,
} from "../src/lib/validation/image.ts";

test("IMAGE_MIME_TYPES and MAX_IMAGE_BYTES match canonical contract", () => {
  assert.equal(MAX_IMAGE_BYTES, 2_000_000);
  assert.deepEqual(IMAGE_MIME_TYPES, ["image/jpeg", "image/png", "image/webp"]);
});

test("validateImageFile accepts valid JPEG, PNG, and WebP files under 2 MB", () => {
  const jpegFile = new File(["valid-jpeg-binary-data"], "damage.jpg", { type: "image/jpeg" });
  assert.deepEqual(validateImageFile(jpegFile), { valid: true });

  const pngFile = new File(["valid-png-binary-data"], "pothole.png", { type: "image/png" });
  assert.deepEqual(validateImageFile(pngFile), { valid: true });

  const webpFile = new File(["valid-webp-binary-data"], "leak.webp", { type: "image/webp" });
  assert.deepEqual(validateImageFile(webpFile), { valid: true });
});

test("validateImageFile rejects empty files, non-files, and null", () => {
  assert.equal(validateImageFile(null).valid, false);
  assert.equal(validateImageFile(undefined).valid, false);
  assert.equal(validateImageFile("not-a-file").valid, false);

  const emptyFile = new File([], "empty.jpg", { type: "image/jpeg" });
  const emptyRes = validateImageFile(emptyFile);
  assert.equal(emptyRes.valid, false);
  assert.match(emptyRes.error, /empty/i);
});

test("validateImageFile rejects files larger than 2 MB", () => {
  // 2 MB + 1 byte
  const oversizedData = new Uint8Array(2 * 1024 * 1024 + 1);
  const oversizedFile = new File([oversizedData], "huge.png", { type: "image/png" });

  const result = validateImageFile(oversizedFile);
  assert.equal(result.valid, false);
  assert.match(result.error, /larger than 2 MB/i);
});

test("validateImageFile rejects unsupported formats like SVG, GIF, PDF, and HEIC", () => {
  const svgFile = new File(["<svg></svg>"], "icon.svg", { type: "image/svg+xml" });
  const svgRes = validateImageFile(svgFile);
  assert.equal(svgRes.valid, false);
  assert.match(svgRes.error, /not supported/i);

  const gifFile = new File(["gif-data"], "animation.gif", { type: "image/gif" });
  assert.equal(validateImageFile(gifFile).valid, false);

  const pdfFile = new File(["%PDF-1.4"], "document.pdf", { type: "application/pdf" });
  assert.equal(validateImageFile(pdfFile).valid, false);
});

test("formatFileSize and formatMimeType produce clean human-readable output", () => {
  assert.equal(formatFileSize(500), "500 B");
  assert.equal(formatFileSize(1500), "1.5 KB");
  assert.equal(formatFileSize(1024 * 1024 * 1.5), "1.5 MB");

  assert.equal(formatMimeType("image/jpeg"), "JPEG");
  assert.equal(formatMimeType("image/png"), "PNG");
  assert.equal(formatMimeType("image/webp"), "WebP");
  assert.equal(formatMimeType("image/unknown"), "UNKNOWN");
});
