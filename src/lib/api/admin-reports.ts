import { apiRequest } from "./client";
import { endpoints } from "./endpoints";
import type {
  ComplaintDetails,
  UpdateTriagePayload,
  UpdateTriageResponse,
  UpdateStatusPayload,
  UpdateStatusResponse,
} from "@/types/domain";
import { adminTriageSchema } from "../validation/admin-triage";
import { adminStatusSchema } from "../validation/admin-status";
import { getReport } from "./reports";

/**
 * Retrieves the full authorized details of a complaint for administrative review.
 * Calls GET /api/reports/:id.
 */
export async function getAdminReportDetails(
  reportId: string,
  options: { signal?: AbortSignal } = {}
): Promise<ComplaintDetails> {
  return getReport(reportId, options);
}

/**
 * Updates complaint triage fields: department assignment, severity, category, visibility, remark.
 * Calls PATCH /api/admin/reports/:id/triage.
 */
export async function updateReportTriage(
  reportId: string,
  payload: UpdateTriagePayload,
  options: { signal?: AbortSignal } = {}
): Promise<UpdateTriageResponse> {
  if (!reportId || !reportId.trim()) {
    throw new TypeError("A valid report identifier is required for triage update.");
  }

  const trimmedId = reportId.trim();
  const validated = adminTriageSchema.parse(payload);

  const response = await apiRequest<UpdateTriageResponse, typeof validated>(
    endpoints.triage(trimmedId),
    {
      body: validated,
      signal: options.signal,
    }
  );

  if (!response || !response.report || typeof response.version !== "number") {
    throw new Error("Invalid response envelope received from triage API.");
  }

  return response;
}

/**
 * Updates complaint status lifecycle (pending -> in_progress -> resolved).
 * Calls PATCH /api/admin/reports/:id/status.
 */
export async function updateReportStatus(
  reportId: string,
  payload: UpdateStatusPayload,
  options: { signal?: AbortSignal } = {}
): Promise<UpdateStatusResponse> {
  if (!reportId || !reportId.trim()) {
    throw new TypeError("A valid report identifier is required for status update.");
  }

  const trimmedId = reportId.trim();
  const validated = adminStatusSchema.parse(payload);

  const response = await apiRequest<UpdateStatusResponse, typeof validated>(
    endpoints.status(trimmedId),
    {
      body: validated,
      signal: options.signal,
    }
  );

  if (!response || !response.report || typeof response.version !== "number") {
    throw new Error("Invalid response envelope received from status update API.");
  }

  return response;
}
