import test from "node:test";
import assert from "node:assert/strict";

import {
  validateImageFile,
  MAX_FILE_SIZE_BYTES,
} from "../src/utils/file-validation.ts";

import {
  generateDraftStoragePath,
  parseDraftStoragePath,
  isValidReportStoragePath,
} from "../src/utils/storage-path.ts";

import {
  verifyOwnedDraftPath,
} from "../src/services/storage.service.ts";

import {
  uploadPurposeSchema,
  signedUrlRequestSchema,
} from "../src/validators/upload.schema.ts";

import { AppError } from "../src/utils/app-error.ts";

// Sample valid file headers
const VALID_JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46]);
const VALID_PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00]);
const VALID_WEBP = new Uint8Array([
  0x52, 0x49, 0x46, 0x46, // RIFF
  0x24, 0x00, 0x00, 0x00, // length
  0x57, 0x45, 0x42, 0x50, // WEBP
  0x56, 0x50, 0x38, 0x20, // VP8
]);

const MOCK_SVG = new TextEncoder().encode("<svg xmlns='http://www.w3.org/2000/svg'><circle/></svg>");
const MOCK_PDF = new TextEncoder().encode("%PDF-1.5 fake document data");
const MOCK_EXE = new Uint8Array([0x4d, 0x5a, 0x90, 0x00, 0x03, 0x00, 0x00, 0x00]); // MZ

const USER_A = "11111111-1111-4111-8111-111111111111";
const USER_B = "22222222-2222-4222-8222-222222222222";

test("1. Valid JPEG is accepted and normalized", () => {
  const result = validateImageFile(VALID_JPEG, "image/jpeg");
  assert.equal(result.isValid, true);
  assert.equal(result.mimeType, "image/jpeg");
  assert.equal(result.extension, "jpg");
});

test("2. Valid PNG is accepted and normalized", () => {
  const result = validateImageFile(VALID_PNG, "image/png");
  assert.equal(result.isValid, true);
  assert.equal(result.mimeType, "image/png");
  assert.equal(result.extension, "png");
});

test("3. Valid WebP is accepted and normalized", () => {
  const result = validateImageFile(VALID_WEBP, "image/webp");
  assert.equal(result.isValid, true);
  assert.equal(result.mimeType, "image/webp");
  assert.equal(result.extension, "webp");
});

test("4. SVG content is strictly rejected", () => {
  assert.throws(
    () => validateImageFile(MOCK_SVG, "image/svg+xml"),
    (err) => err instanceof AppError && err.status === 422
  );
});

test("5. PDF documents are strictly rejected", () => {
  assert.throws(
    () => validateImageFile(MOCK_PDF, "application/pdf"),
    (err) => err instanceof AppError && err.status === 422
  );
});

test("6. Executable binaries are strictly rejected", () => {
  assert.throws(
    () => validateImageFile(MOCK_EXE, "application/octet-stream"),
    (err) => err instanceof AppError && err.status === 422
  );
});

test("7. Empty file is rejected", () => {
  assert.throws(
    () => validateImageFile(new Uint8Array(0)),
    (err) => err instanceof AppError && err.status === 422
  );
});

test("8. Oversized file (> 3MB) is rejected", () => {
  const oversized = new Uint8Array(MAX_FILE_SIZE_BYTES + 1);
  oversized[0] = 0xff;
  oversized[1] = 0xd8;
  oversized[2] = 0xff;
  assert.throws(
    () => validateImageFile(oversized),
    (err) => err instanceof AppError && err.status === 422
  );
});

test("9. Declared MIME type mismatch is rejected", () => {
  assert.throws(
    () => validateImageFile(VALID_JPEG, "image/png"), // JPEG bytes with PNG header
    (err) => err instanceof AppError && err.status === 422
  );
});

test("10. Safe draft storage path is generated within user-scoped directory", () => {
  const path = generateDraftStoragePath(USER_A, "jpg");
  assert.match(path, /^drafts\/11111111-1111-4111-8111-111111111111\/[0-9a-f-]{36}\.jpg$/);
});

test("11. Valid draft storage path is parsed successfully", () => {
  const path = `drafts/${USER_A}/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa.png`;
  const parsed = parseDraftStoragePath(path);
  assert.equal(parsed.isValid, true);
  assert.equal(parsed.userId, USER_A);
  assert.equal(parsed.imageId, "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa");
  assert.equal(parsed.extension, "png");
});

test("12. Path traversal attempts are rejected by parseDraftStoragePath", () => {
  assert.equal(parseDraftStoragePath(`../drafts/${USER_A}/file.jpg`).isValid, false);
  assert.equal(parseDraftStoragePath(`drafts/../../${USER_A}/file.jpg`).isValid, false);
  assert.equal(parseDraftStoragePath(`drafts//${USER_A}/file.jpg`).isValid, false);
  assert.equal(parseDraftStoragePath(`drafts/${USER_A}/file.jpg/`).isValid, false);
});

test("13. Path passes report_images_path_valid check constraint rules", () => {
  const validPath = `drafts/${USER_A}/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa.jpg`;
  assert.equal(isValidReportStoragePath(validPath), true);
  assert.equal(isValidReportStoragePath(""), false);
  assert.equal(isValidReportStoragePath("/leading/slash"), false);
  assert.equal(isValidReportStoragePath("trailing/slash/"), false);
  assert.equal(isValidReportStoragePath("double//slash"), false);
  assert.equal(isValidReportStoragePath("has/../dotdot"), false);
});

test("14. verifyOwnedDraftPath permits the owner", () => {
  const path = `drafts/${USER_A}/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa.jpg`;
  assert.doesNotThrow(() => verifyOwnedDraftPath(USER_A, path));
});

test("15. verifyOwnedDraftPath forbids cross-user access (Citizen A accessing Citizen B)", () => {
  const pathB = `drafts/${USER_B}/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb.jpg`;
  assert.throws(
    () => verifyOwnedDraftPath(USER_A, pathB),
    (err) => err instanceof AppError && err.status === 403 && err.code === "FORBIDDEN"
  );
});

test("16. Upload purpose validation defaults to complaint_before", () => {
  const result = uploadPurposeSchema.safeParse(undefined);
  assert.equal(result.success, true);
  if (result.success) {
    assert.equal(result.data, "complaint_before");
  }
});

test("17. Upload purpose allows resolution_after schema parse", () => {
  const result = uploadPurposeSchema.safeParse("resolution_after");
  assert.equal(result.success, true);
  if (result.success) {
    assert.equal(result.data, "resolution_after");
  }
});

test("18. Signed URL request validation enforces expiration bounds", () => {
  const valid = signedUrlRequestSchema.safeParse({
    storage_path: `drafts/${USER_A}/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa.jpg`,
    expires_in_seconds: 600,
  });
  assert.equal(valid.success, true);

  const tooShort = signedUrlRequestSchema.safeParse({
    storage_path: `drafts/${USER_A}/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa.jpg`,
    expires_in_seconds: 10,
  });
  assert.equal(tooShort.success, false);

  const tooLong = signedUrlRequestSchema.safeParse({
    storage_path: `drafts/${USER_A}/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa.jpg`,
    expires_in_seconds: 7200,
  });
  assert.equal(tooLong.success, false);
});
