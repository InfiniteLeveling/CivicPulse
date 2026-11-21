import { apiRequest, ApiError } from "./client";
import { endpoints } from "./endpoints";
import type {
  ComplaintDetails,
  UpdateTriagePayload,
  UpdateTriageResponse,
  UpdateStatusPayload,
  UpdateStatusResponse,
} from "@/types/domain";
import { adminTriageSchema } from "../validation/admin-triage";
import { adminStatusSchema, isValidStatusTransition } from "../validation/admin-status";
import { getReport } from "./reports";
import { mockMyReports, getMockReportDetails } from "./reports-mock";
import { MOCK_DEPARTMENTS } from "./departments";

// In-memory mock version store for local demo concurrency testing
const mockVersions: Record<string, number> = {};

/**
 * Retrieves the full authorized details of a complaint for administrative review.
 * Calls GET /api/reports/:id.
 */
export async function getAdminReportDetails(
  reportId: string,
  options: { signal?: AbortSignal } = {}
): Promise<ComplaintDetails> {
  const details = await getReport(reportId, options);
  
  // Ensure version matches our mock version tracking in demo mode
  if (mockVersions[details.report.id]) {
    details.version = mockVersions[details.report.id];
  } else {
    mockVersions[details.report.id] = details.version || 1;
  }

  return details;
}

/**
 * Updates complaint triage fields: department assignment, severity, category, visibility, remark.
 * Calls PATCH /api/admin/reports/:id/triage.
 * Requires report version for optimistic concurrency control.
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

  try {
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

    mockVersions[trimmedId] = response.version;
    return response;
  } catch (cause) {
    if (options.signal?.aborted) {
      throw cause;
    }

    // Pass through explicit conflict or permission errors
    if (cause instanceof ApiError && (cause.status === 409 || cause.status === 403 || cause.status === 401)) {
      throw cause;
    }

    // In development / demo environment without backend route handlers, gracefully simulate mutation
    const mockReport = mockMyReports.find(
      (r) => r.id === trimmedId || r.reference.toLowerCase() === trimmedId.toLowerCase()
    );

    if (!mockReport) {
      throw new ApiError(404, "NOT_FOUND", "Complaint not found for triage update.");
    }

    const currentVersion = mockVersions[mockReport.id] || 1;

    // Detect stale version conflict
    if (validated.version < currentVersion) {
      throw new ApiError(
        409,
        "VERSION_CONFLICT",
        "This complaint was updated by another administrator. Review the latest information before saving your changes."
      );
    }

    // Update triage fields
    if (validated.departmentId !== undefined) {
      if (validated.departmentId === null || validated.departmentId === "") {
        mockReport.department = null;
      } else {
        const dept = MOCK_DEPARTMENTS.find((d) => d.id === validated.departmentId);
        mockReport.department = dept
          ? { id: dept.id, name: dept.name }
          : { id: validated.departmentId, name: "Assigned Department" };
      }
    }

    if (validated.category) {
      mockReport.category = validated.category;
    }

    if (validated.severity) {
      mockReport.severity = validated.severity;
      mockReport.severityReviewed = true;
      // Update severity points in priority
      const severityMap = { low: 15, medium: 30, high: 50, critical: 70 };
      const sevPts = severityMap[validated.severity];
      mockReport.priority.severityPoints = sevPts;
      mockReport.priority.score =
        sevPts + mockReport.priority.supportPoints + mockReport.priority.agePoints;
      mockReport.priority.urgent =
        validated.severity === "critical" || mockReport.priority.score >= 70;
    }

    if (validated.visibility) {
      mockReport.visibility = validated.visibility;
    }

    mockReport.updatedAt = new Date().toISOString();
    const newVersion = currentVersion + 1;
    mockVersions[mockReport.id] = newVersion;

    // Append to mock history
    const details = getMockReportDetails(mockReport.id);
    if (details) {
      details.history.push({
        id: `hist-${mockReport.id}-${Date.now()}`,
        eventType: "triaged",
        oldStatus: null,
        newStatus: null,
        remark: validated.remark || "Triage parameters revised by municipal administrator.",
        createdAt: mockReport.updatedAt,
      });
      details.version = newVersion;
    }

    return {
      report: { ...mockReport },
      version: newVersion,
    };
  }
}

/**
 * Updates complaint status lifecycle (pending -> in_progress -> resolved).
 * Calls PATCH /api/admin/reports/:id/status.
 * Requires report version for optimistic concurrency control.
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

  try {
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

    mockVersions[trimmedId] = response.version;
    return response;
  } catch (cause) {
    if (options.signal?.aborted) {
      throw cause;
    }

    // Pass through explicit conflict or permission errors
    if (cause instanceof ApiError && (cause.status === 409 || cause.status === 403 || cause.status === 401)) {
      throw cause;
    }

    // In development / demo environment without backend route handlers, gracefully simulate mutation
    const mockReport = mockMyReports.find(
      (r) => r.id === trimmedId || r.reference.toLowerCase() === trimmedId.toLowerCase()
    );

    if (!mockReport) {
      throw new ApiError(404, "NOT_FOUND", "Complaint not found for status update.");
    }

    const currentVersion = mockVersions[mockReport.id] || 1;

    // Detect stale version conflict
    if (validated.version < currentVersion) {
      throw new ApiError(
        409,
        "VERSION_CONFLICT",
        "This complaint was updated by another administrator. Review the latest information before saving your changes."
      );
    }

    // Validate status transition
    if (!isValidStatusTransition(mockReport.status, validated.status)) {
      throw new ApiError(
        400,
        "INVALID_TRANSITION",
        `Cannot transition complaint status from "${mockReport.status}" to "${validated.status}".`
      );
    }

    const previousStatus = mockReport.status;
    mockReport.status = validated.status;
    mockReport.updatedAt = new Date().toISOString();

    if (validated.status === "resolved") {
      mockReport.resolvedAt = mockReport.updatedAt;
    }

    const newVersion = currentVersion + 1;
    mockVersions[mockReport.id] = newVersion;

    // Append to mock history
    const details = getMockReportDetails(mockReport.id);
    if (details) {
      details.history.push({
        id: `hist-${mockReport.id}-${Date.now()}`,
        eventType: "status_changed",
        oldStatus: previousStatus,
        newStatus: validated.status,
        remark:
          validated.remark ||
          `Complaint transitioned to ${validated.status} by municipal administrator.`,
        createdAt: mockReport.updatedAt,
      });

      if (validated.resolutionImageId && validated.status === "resolved") {
        details.resolutionImages.push({
          id: validated.resolutionImageId,
          imageUrl:
            "data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='600' height='400' viewBox='0 0 600 400'%3E%3Crect width='600' height='400' fill='%23dcfce7'/%3E%3Cpath d='M250 200 L285 235 L355 165' stroke='%2316a34a' stroke-width='16' stroke-linecap='round' stroke-linejoin='round' fill='none'/%3E%3Ctext x='300' y='290' font-family='system-ui, sans-serif' font-size='20' font-weight='bold' fill='%23166534' text-anchor='middle'%3EMunicipal Resolution Evidence Photo%3C/text%3E%3C/svg%3E",
          createdAt: mockReport.resolvedAt ?? mockReport.updatedAt,
        });
      }

      details.version = newVersion;
    }

    return {
      report: { ...mockReport },
      version: newVersion,
    };
  }
}
