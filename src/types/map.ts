import type { ApiResponse } from "@/types/api";
import type { ReportCategory, ReportSeverity, ReportStatus } from "@/types/report";

/**
 * Minimal map-safe marker summary projected for interactive Leaflet display.
 * Strictly excludes citizen profiles, contact information, private notes, and raw storage paths.
 */
export interface MapMarker {
  id: string;
  latitude: number;
  longitude: number;
  title: string;
  category: ReportCategory;
  status: ReportStatus;
  severity: ReportSeverity;
  priority_score: number;
  department: {
    id: string;
    name: string;
  } | null;
  created_at: string;
}

/**
 * Geographic bounding box viewport representation.
 */
export interface MapViewport {
  south: number;
  west: number;
  north: number;
  east: number;
  crosses_antimeridian: boolean;
}

/**
 * Validated query filter parameters for GET /api/reports/map.
 */
export interface MapQueryFilter {
  south: number;
  west: number;
  north: number;
  east: number;
  category?: ReportCategory;
  status?: "pending" | "in_progress" | "resolved" | "all";
  severity?: ReportSeverity;
  department_id?: string;
  limit?: number;
  sort?: "newest" | "priority_high";
}

/**
 * Standardized response payload for map viewport queries.
 */
export interface MapResponseData {
  markers: MapMarker[];
  viewport: MapViewport;
  returned_count: number;
  limit: number;
  has_more: boolean;
}

/**
 * Standard API response envelope for map queries.
 */
export type MapApiResponse = ApiResponse<MapResponseData>;
