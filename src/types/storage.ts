/**
 * Storage and file upload types for CivicPulse Phase 05.
 * Compatible with server handlers, services, and client contracts.
 */

export type StorageBucketName = "civic-evidence";

export type UploadPurpose = "complaint_before" | "resolution_after";

export type SupportedMimeType = "image/jpeg" | "image/png" | "image/webp";

export type SupportedExtension = "jpg" | "jpeg" | "png" | "webp";

export interface UploadedImageRef {
  bucket: StorageBucketName;
  storage_path: string;
  mime_type: SupportedMimeType;
  size_bytes: number;
  status: "temporary";
}

export interface UploadResponseData {
  image: UploadedImageRef;
}

export interface SignedUrlRequest {
  storage_path: string;
  expires_in_seconds?: number;
}

export interface SignedUrlResponseData {
  signed_url: string;
  expires_in_seconds: number;
}

export interface FileValidationResult {
  isValid: boolean;
  mimeType: SupportedMimeType;
  extension: SupportedExtension;
  sizeBytes: number;
}
