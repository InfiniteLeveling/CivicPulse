/**
 * CivicPulse Phase 17: Resolution Evidence and Comparison Type Definitions
 */

import type { ReportStatus } from "@/types/report";
import type { UploadedImageRef } from "@/types/storage";

export type EvidenceImageType = "before" | "after";

export interface EvidenceImageItem {
  id: string;
  storage_path: string;
  type: EvidenceImageType;
  created_at: string;
  signed_url?: string;
}

export interface ReportEvidenceResponseData {
  report_id: string;
  status: ReportStatus;
  resolved_at: string | null;
  attribution_notice: string;
  before_images: EvidenceImageItem[];
  after_images: EvidenceImageItem[];
}

export interface ResolutionEvidenceRef {
  image_id: string;
  storage_path: string;
  type: "after";
}

export type AdminEvidenceUploadResponseData = UploadedImageRef;
