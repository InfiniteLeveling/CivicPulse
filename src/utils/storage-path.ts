import type { SupportedExtension } from "@/types/storage";
import { AppError } from "@/utils/app-error";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DRAFT_PATH_REGEX = /^drafts\/([0-9a-fA-F-]{36})\/([0-9a-fA-F-]{36})\.(jpg|jpeg|png|webp)$/;

/**
 * Generates a user-scoped, collision-resistant draft storage path.
 * Format: drafts/<user_id>/<random_uuid>.<extension>
 */
export function generateDraftStoragePath(userId: string, extension: SupportedExtension): string {
  if (!UUID_REGEX.test(userId)) {
    throw new AppError("VALIDATION_ERROR", "Invalid user identifier for storage path");
  }

  const imageId = crypto.randomUUID();
  const normalizedExt = extension.replace(/^\./, "").toLowerCase();
  return `drafts/${userId}/${imageId}.${normalizedExt}`;
}

export interface ParsedDraftPath {
  isValid: boolean;
  userId?: string;
  imageId?: string;
  extension?: string;
}

/**
 * Validates and decomposes a draft storage path.
 * Enforces strict pattern matching and guards against directory traversal (.., //, leading/trailing slashes).
 */
export function parseDraftStoragePath(storagePath: string): ParsedDraftPath {
  if (!storagePath || typeof storagePath !== "string") {
    return { isValid: false };
  }

  // Reject traversal attempts, double slashes, or trailing slashes
  if (
    storagePath.includes("..") ||
    storagePath.includes("//") ||
    storagePath.startsWith("/") ||
    storagePath.endsWith("/") ||
    storagePath.includes("\\")
  ) {
    return { isValid: false };
  }

  const match = DRAFT_PATH_REGEX.exec(storagePath);
  if (!match) {
    return { isValid: false };
  }

  const [, userId, imageId, extension] = match;
  if (!UUID_REGEX.test(userId) || !UUID_REGEX.test(imageId)) {
    return { isValid: false };
  }

  return {
    isValid: true,
    userId,
    imageId,
    extension: extension.toLowerCase(),
  };
}

/**
 * Verifies that a storage path satisfies the database check constraint report_images_path_valid.
 */
export function isValidReportStoragePath(storagePath: string): boolean {
  if (!storagePath || typeof storagePath !== "string") return false;
  if (storagePath.length < 1 || storagePath.length > 512) return false;
  if (!/^[A-Za-z0-9_-][A-Za-z0-9_./-]*$/.test(storagePath)) return false;
  if (/(^|\/)[.]{1,2}(\/|$)|(\/\/)|(\/$)/.test(storagePath)) return false;
  return true;
}
