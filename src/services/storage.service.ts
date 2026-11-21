import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type {
  SignedUrlResponseData,
  StorageBucketName,
  UploadedImageRef,
} from "@/types/storage";
import { AppError } from "@/utils/app-error";
import { validateImageFile } from "@/utils/file-validation";
import { logger } from "@/utils/logger";
import {
  generateDraftStoragePath,
  isValidReportStoragePath,
  parseDraftStoragePath,
} from "@/utils/storage-path";

export const EVIDENCE_BUCKET: StorageBucketName = "civic-evidence";

/**
 * Validates, uploads, and registers a citizen draft image in the private storage bucket.
 * The image is isolated in the user's draft directory until complaint association in Phase 06.
 */
export async function uploadCitizenDraftImage(
  userId: string,
  fileBuffer: Uint8Array,
  declaredMimeType?: string,
  client?: SupabaseClient
): Promise<UploadedImageRef> {
  // 1. Validate file content and magic byte signatures
  const validation = validateImageFile(fileBuffer, declaredMimeType);

  // 2. Generate secure path: drafts/<user_id>/<random_uuid>.<extension>
  const storagePath = generateDraftStoragePath(userId, validation.extension);

  const supabase = client ?? (await createSupabaseServerClient());

  // 3. Upload to Supabase Storage with upsert disabled (prevent silent overwrites)
  const { error } = await supabase.storage
    .from(EVIDENCE_BUCKET)
    .upload(storagePath, fileBuffer, {
      contentType: validation.mimeType,
      upsert: false,
    });

  if (error) {
    logger.error("storage.upload_failed", { status: 500 });
    // Normalize storage errors without exposing credentials or internal paths
    if (error.message?.includes("Bucket not found")) {
      throw new AppError("SERVICE_UNAVAILABLE", "Image storage is currently unavailable");
    }
    if (error.message?.includes("already exists")) {
      throw new AppError("CONFLICT", "An image with this identifier already exists");
    }
    throw new AppError("INTERNAL_SERVER_ERROR", "Failed to upload evidence image", { cause: error });
  }

  logger.info("storage.upload_success");

  return {
    bucket: EVIDENCE_BUCKET,
    storage_path: storagePath,
    mime_type: validation.mimeType,
    size_bytes: validation.sizeBytes,
    status: "temporary",
  };
}

/**
 * Verifies that a storage path represents a valid draft belonging to the authenticated user.
 * Rejects cross-user paths, path traversal, and unowned files.
 */
export function verifyOwnedDraftPath(userId: string, storagePath: string): {
  isValid: boolean;
  storagePath: string;
} {
  const parsed = parseDraftStoragePath(storagePath);
  if (!parsed.isValid || !parsed.userId) {
    throw new AppError("VALIDATION_ERROR", "Invalid draft storage path structure");
  }

  if (parsed.userId !== userId) {
    logger.warn("storage.access_denied", { status: 403 });
    throw new AppError("FORBIDDEN", "You do not have permission to access this draft image");
  }

  if (!isValidReportStoragePath(storagePath)) {
    throw new AppError("VALIDATION_ERROR", "Storage path violates safety constraints");
  }

  return {
    isValid: true,
    storagePath,
  };
}

/**
 * Generates a short-lived signed URL for an authorized draft image.
 * Verifies ownership before signing the private object path.
 */
export async function createAuthorizedImageUrl(
  userId: string,
  storagePath: string,
  expiresInSeconds = 900,
  isAdmin = false,
  client?: SupabaseClient
): Promise<SignedUrlResponseData> {
  // Enforce ownership: Citizens can only sign their own drafts; Admins may review
  if (!isAdmin) {
    verifyOwnedDraftPath(userId, storagePath);
  }

  const supabase = client ?? (await createSupabaseServerClient());

  const { data, error } = await supabase.storage
    .from(EVIDENCE_BUCKET)
    .createSignedUrl(storagePath, expiresInSeconds);

  if (error || !data?.signedUrl) {
    logger.error("request.failed", { status: 404 });
    throw new AppError("NOT_FOUND", "Requested image could not be found or accessed");
  }

  logger.info("storage.access_granted");

  return {
    signed_url: data.signedUrl,
    expires_in_seconds: expiresInSeconds,
  };
}

/**
 * Deletes an owned draft image (e.g. if the user cancels before report submission).
 */
export async function deleteOwnedDraftImage(
  userId: string,
  storagePath: string,
  client?: SupabaseClient
): Promise<{ deleted: boolean }> {
  verifyOwnedDraftPath(userId, storagePath);

  const supabase = client ?? (await createSupabaseServerClient());

  const { error } = await supabase.storage.from(EVIDENCE_BUCKET).remove([storagePath]);

  if (error) {
    logger.error("request.failed", { status: 500 });
    throw new AppError("INTERNAL_SERVER_ERROR", "Failed to delete draft image");
  }

  return { deleted: true };
}
