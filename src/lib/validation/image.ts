export const IMAGE_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const MAX_IMAGE_BYTES = 2_000_000;

export interface ImageValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validates a client-selected File against CivicPulse image upload constraints:
 * - Must be a valid File object
 * - Must be non-empty (size > 0)
 * - Must be <= 2,000,000 bytes (2 MB)
 * - Must have MIME type: image/jpeg, image/png, or image/webp
 */
export function validateImageFile(file: unknown): ImageValidationResult {
  if (!file || !(file instanceof File)) {
    return {
      valid: false,
      error: "Please select an image file.",
    };
  }

  if (file.size === 0) {
    return {
      valid: false,
      error: "The selected file is empty. Please choose a valid image.",
    };
  }

  if (file.size > MAX_IMAGE_BYTES) {
    return {
      valid: false,
      error: "Your image is larger than 2 MB. Please choose a smaller photograph.",
    };
  }

  const allowedTypes: readonly string[] = IMAGE_MIME_TYPES;
  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: "This file type is not supported. Please select a JPG, PNG or WebP image.",
    };
  }

  return { valid: true };
}

/**
 * Formats a file size in bytes to a human-readable string (e.g., "1.4 MB", "320 KB").
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  const kb = bytes / 1024;
  if (kb < 1024) {
    return `${kb.toFixed(1)} KB`;
  }
  const mb = kb / 1024;
  return `${mb.toFixed(1)} MB`;
}

/**
 * Extracts a friendly uppercase format label from a MIME type (e.g. "image/jpeg" -> "JPEG").
 */
export function formatMimeType(mime: string): string {
  switch (mime) {
    case "image/jpeg":
      return "JPEG";
    case "image/png":
      return "PNG";
    case "image/webp":
      return "WebP";
    default:
      return mime.replace("image/", "").toUpperCase();
  }
}
