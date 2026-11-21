import { z } from "zod";

/**
 * Validates the upload purpose parameter.
 * Citizens may only upload 'complaint_before'.
 * 'resolution_after' is strictly reserved for administrative workflows.
 */
export const uploadPurposeSchema = z
  .enum(["complaint_before", "resolution_after"])
  .default("complaint_before");

export type UploadPurposeInput = z.infer<typeof uploadPurposeSchema>;

/**
 * Validates a signed URL access request.
 */
export const signedUrlRequestSchema = z.object({
  storage_path: z
    .string()
    .trim()
    .min(1, "Storage path is required")
    .max(512, "Storage path must not exceed 512 characters")
    .refine(
      (path) => !path.includes("..") && !path.includes("//") && !path.startsWith("/"),
      "Invalid storage path structure"
    ),
  expires_in_seconds: z
    .number()
    .int()
    .min(60, "Expiration must be at least 60 seconds")
    .max(3600, "Expiration must not exceed 1 hour")
    .default(900), // Default 15 minutes
});

export type SignedUrlRequestInput = z.infer<typeof signedUrlRequestSchema>;
