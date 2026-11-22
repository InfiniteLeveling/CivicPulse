import type { ReportCategory, ReportStatus } from "@/types/report";
import type { ApiResponse } from "@/types/api";
import type { DuplicateMatchPolicy } from "@/config/duplicate";

/**
 * Validated input for duplicate check requests.
 */
export interface CheckDuplicatesInput {
  latitude: number;
  longitude: number;
  category: ReportCategory;
  title_hint?: string;
  description_hint?: string;
}

/**
 * Individual nearby complaint candidate returned to citizen for advisory review.
 * Excludes personal user identifiers, phone, email, and internal administrative notes.
 */
export interface DuplicateMatchItem {
  id: string;
  title: string;
  category: ReportCategory;
  status: ReportStatus;
  distance_meters: number;
  created_at: string;
  support_count?: number;
}

/**
 * Standardized data payload returned by duplicate detection endpoint.
 */
export interface CheckDuplicatesResponseData {
  has_potential_duplicates: boolean;
  radius_meters: number;
  match_policy: DuplicateMatchPolicy;
  matches: DuplicateMatchItem[];
}

/**
 * Full API response envelope for duplicate check endpoint.
 */
export type CheckDuplicatesResponse = ApiResponse<CheckDuplicatesResponseData>;
