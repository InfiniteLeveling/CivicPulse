/**
 * CivicPulse Phase 17: Resolution Evidence Configuration & Limitations
 */

export const EVIDENCE_CONFIG = {
  /** Bucket name in Supabase Storage */
  BUCKET_NAME: "civic-evidence",

  /** Root directory for administrator resolution evidence drafts */
  RESOLUTION_DRAFT_PREFIX: "resolution-drafts",

  /** Citizen draft directory */
  CITIZEN_DRAFT_PREFIX: "drafts",

  /** Maximum allowed file size for evidence uploads: 3 MB */
  MAX_FILE_SIZE_BYTES: 3 * 1024 * 1024,

  /** Supported image MIME types */
  ALLOWED_MIME_TYPES: ["image/jpeg", "image/png", "image/webp"] as const,

  /** Supported image extensions */
  ALLOWED_EXTENSIONS: ["jpg", "jpeg", "png", "webp"] as const,

  /** Default signed URL time-to-live: 15 minutes (900 seconds) */
  DEFAULT_SIGNED_URL_EXPIRY_SECONDS: 900,

  /** Maximum signed URL time-to-live: 1 hour (3600 seconds) */
  MAX_SIGNED_URL_EXPIRY_SECONDS: 3600,

  /** Maximum after-repair images permitted per resolution */
  MAX_AFTER_IMAGES_PER_REPORT: 5,

  /** Accurate attribution disclaimer: photographic evidence is admin-reported, not third-party certified */
  ATTRIBUTION_NOTICE: "Marked resolved by an administrator with after-repair evidence.",
} as const;
