import type { FileValidationResult, SupportedExtension, SupportedMimeType } from "@/types/storage";
import { AppError } from "@/utils/app-error";

/** Maximum allowed upload size: 3 MB */
export const MAX_FILE_SIZE_BYTES = 3 * 1024 * 1024; // 3,145,728 bytes

export const ALLOWED_MIME_TYPES: readonly SupportedMimeType[] = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export const ALLOWED_EXTENSIONS: readonly SupportedExtension[] = [
  "jpg",
  "jpeg",
  "png",
  "webp",
] as const;

/**
 * Validates the file buffer by inspecting magic byte signatures.
 * Rejects SVGs, PDFs, executables, HTML, empty files, and oversized files.
 */
export function validateImageSignature(buffer: Uint8Array): {
  mimeType: SupportedMimeType;
  extension: SupportedExtension;
} {
  if (buffer.length < 4) {
    throw new AppError("VALIDATION_ERROR", "File is empty or corrupted");
  }

  // 1. JPEG signature: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { mimeType: "image/jpeg", extension: "jpg" };
  }

  // 2. PNG signature: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return { mimeType: "image/png", extension: "png" };
  }

  // 3. WebP signature: RIFF (bytes 0-3) + WEBP (bytes 8-11)
  if (
    buffer.length >= 12 &&
    buffer[0] === 0x52 && // R
    buffer[1] === 0x49 && // I
    buffer[2] === 0x46 && // F
    buffer[3] === 0x46 && // F
    buffer[8] === 0x57 && // W
    buffer[9] === 0x45 && // E
    buffer[10] === 0x42 && // B
    buffer[11] === 0x50 // P
  ) {
    return { mimeType: "image/webp", extension: "webp" };
  }

  // Explicit check for disallowed active / document formats
  // PDF check: %PDF
  if (buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46) {
    throw new AppError("VALIDATION_ERROR", "PDF documents are not accepted as photo evidence");
  }

  // Windows Executable / PE: MZ
  if (buffer[0] === 0x4d && buffer[1] === 0x5a) {
    throw new AppError("VALIDATION_ERROR", "Executable files are strictly forbidden");
  }

  // Check for SVG / XML / HTML text header
  const headerText = new TextDecoder("utf-8", { fatal: false }).decode(buffer.subarray(0, 64)).toLowerCase();
  if (
    headerText.includes("<svg") ||
    headerText.includes("<?xml") ||
    headerText.includes("<html") ||
    headerText.includes("<!doctype")
  ) {
    throw new AppError("VALIDATION_ERROR", "SVG and HTML files are strictly forbidden");
  }

  throw new AppError(
    "VALIDATION_ERROR",
    "Unsupported file format. Only JPEG, PNG, and WebP images are permitted."
  );
}

/**
 * Validates a complete uploaded file: size, magic signature, and format alignment.
 */
export function validateImageFile(
  buffer: Uint8Array,
  declaredMimeType?: string
): FileValidationResult {
  if (buffer.length === 0) {
    throw new AppError("VALIDATION_ERROR", "Uploaded file is empty");
  }

  if (buffer.length > MAX_FILE_SIZE_BYTES) {
    throw new AppError(
      "VALIDATION_ERROR",
      `Image size (${(buffer.length / (1024 * 1024)).toFixed(2)} MB) exceeds the 3 MB limit.`
    );
  }

  const { mimeType, extension } = validateImageSignature(buffer);

  // If declared MIME type was provided, verify it aligns with the detected signature
  if (declaredMimeType) {
    const normalizedDeclared = declaredMimeType.trim().toLowerCase();
    // Allow image/jpg as alias for image/jpeg
    const expected = mimeType === "image/jpeg" ? ["image/jpeg", "image/jpg"] : [mimeType];
    if (!expected.includes(normalizedDeclared)) {
      throw new AppError(
        "VALIDATION_ERROR",
        `Declared content type (${declaredMimeType}) does not match verified image content (${mimeType}).`
      );
    }
  }

  return {
    isValid: true,
    mimeType,
    extension,
    sizeBytes: buffer.length,
  };
}
