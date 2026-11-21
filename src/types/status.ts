import { REPORT_STATUSES, type ReportStatus } from "@/types/report";
import type { ResolutionEvidenceRef } from "@/types/evidence";

export { REPORT_STATUSES, type ReportStatus };

/**
 * Valid canonical transitions in the MVP state machine:
 * pending -> in_progress
 * in_progress -> resolved
 */
export const REPORT_STATUS_TRANSITIONS: Record<ReportStatus, readonly ReportStatus[]> = {
  pending: ["in_progress"],
  in_progress: ["resolved"],
  resolved: [],
} as const;

export interface UpdateStatusInput {
  status: ReportStatus;
  notes?: string;
  expected_status?: ReportStatus;
  after_image_path?: string;
}

export interface UpdateStatusResponseData {
  id: string;
  previous_status: ReportStatus;
  status: ReportStatus;
  updated_at: string;
  resolved_at: string | null;
  history_entry_id: string;
  version: number;
  resolution_evidence?: ResolutionEvidenceRef;
}

export interface StatusHistoryItem {
  id: string;
  report_id: string;
  version: number;
  previous_status: ReportStatus | null;
  status: ReportStatus;
  changed_at: string;
  notes?: string; // administrative remarks (admin only)
  changed_by?: string; // actor UUID (admin only)
}

export interface StatusHistoryResponseData {
  report_id: string;
  current_status: ReportStatus;
  history: StatusHistoryItem[];
}
