import { apiRequest, ApiError } from "./client";
import { endpoints } from "./endpoints";
import type {
  ComplaintDetails,
  ComplaintSummary,
  CreateReportRequest,
  CreateReportResponse,
  GetMyReportsParams,
  GetMyReportsResult,
  GetPublicReportsParams,
  GetPublicReportsResult,
  GetAdminReportsParams,
  GetAdminReportsResult,
  PaginatedListResponse,
  ReportSummary,
  SupportReportResponse,
} from "@/types/domain";
import { createReportSchema } from "../validation/report";
import { filterPublicReports } from "../validation/public-reports";
import { filterAdminReports, isReportUrgent } from "../validation/admin-reports";
import {
  filterReports,
  getMockReportDetails,
  mockMyReports,
} from "./reports-mock";

/**
 * Creates a new civic infrastructure complaint.
 * Calls POST /api/reports with canonical fields.
 * Derives reporter identity and initial support on the backend.
 */
export async function createReport(
  request: CreateReportRequest,
  options: { signal?: AbortSignal } = {}
): Promise<ComplaintSummary> {
  const validated = createReportSchema.parse(request);

  const payload = {
    title: validated.title,
    description: validated.description,
    category: validated.category,
    latitude: validated.latitude,
    longitude: validated.longitude,
    visibility: validated.visibility,
    imageId: validated.imageId,
    ...(validated.analysisId ? { analysisId: validated.analysisId } : {}),
    confirmedSeparateFromIds: validated.confirmedSeparateFromIds,
  };

  const response = await apiRequest<CreateReportResponse, typeof payload>(
    endpoints.createReport,
    {
      body: payload,
      signal: options.signal,
    }
  );

  if (!response || !response.report || !response.report.id) {
    throw new Error("Invalid report response envelope received from server.");
  }

  return response.report;
}

/**
 * Adds community support to an existing public complaint.
 * Calls POST /api/reports/:id/support.
 * Avoids duplicate complaint submissions while boosting prioritization.
 */
export async function supportReport(
  reportId: string,
  options: { signal?: AbortSignal } = {}
): Promise<SupportReportResponse> {
  if (!reportId || !reportId.trim()) {
    throw new TypeError("A valid report identifier is required to support a report.");
  }

  const trimmedId = reportId.trim();

  try {
    return await apiRequest<SupportReportResponse>(endpoints.support(trimmedId), {
      signal: options.signal,
    });
  } catch (cause) {
    if (options.signal?.aborted) {
      throw cause;
    }

    // In development / demo environment without backend route handlers, gracefully fall back
    const mock = getMockReportDetails(trimmedId);
    if (!mock) {
      throw new ApiError(404, "NOT_FOUND", "We couldn't find this complaint.");
    }

    if (mock.report.status === "resolved") {
      throw new ApiError(400, "INVALID_STATE", "Support is closed for resolved complaints.");
    }

    if (mock.report.visibility === "private") {
      throw new ApiError(403, "FORBIDDEN", "Community support is unavailable for private reports.");
    }

    // Update in-memory state
    mock.report.supportCount += 1;
    mock.report.viewerHasSupported = true;

    return {
      supportCount: mock.report.supportCount,
      viewerHasSupported: true,
      priority: mock.report.priority,
    };
  }
}

/**
 * Retrieves the full authorized details of a complaint, including status timeline and resolution evidence.
 * Calls GET /api/reports/:id.
 * Falls back transparently in development/demo mode to mock fixture data when live API routes are unprovisioned.
 */
export async function getReport(
  reportId: string,
  options: { signal?: AbortSignal } = {}
): Promise<ComplaintDetails> {
  if (!reportId || !reportId.trim()) {
    throw new TypeError("A valid report identifier is required.");
  }

  const trimmedId = reportId.trim();

  if (trimmedId === "not-found") {
    throw new ApiError(404, "NOT_FOUND", "We couldn't find this complaint.");
  }

  if (trimmedId === "forbidden") {
    throw new ApiError(403, "FORBIDDEN", "You don't have permission to view this complaint.");
  }

  try {
    const response = await apiRequest<{ report: ComplaintDetails } | ComplaintDetails>(
      endpoints.report(trimmedId),
      {
        signal: options.signal,
      }
    );

    if ("report" in response && "history" in response) {
      return response as unknown as ComplaintDetails;
    }

    if ("report" in response && typeof (response as { report?: unknown }).report === "object") {
      return (response as { report: ComplaintDetails }).report;
    }

    return response as unknown as ComplaintDetails;
  } catch (cause) {
    if (options.signal?.aborted) {
      throw cause;
    }

    if (cause instanceof ApiError && (cause.status === 404 || cause.status === 403)) {
      throw cause;
    }

    // In development / demo environment without backend route handlers, gracefully fall back
    const mock = getMockReportDetails(trimmedId);
    if (!mock) {
      throw new ApiError(404, "NOT_FOUND", "We couldn't find this complaint.");
    }

    return mock;
  }
}


/**
 * Retrieves the current user's submitted civic reports with filtering, search, sorting, and pagination.
 * Calls GET /api/reports?scope=mine with optional filter params.
 * Falls back transparently in development/demo mode to mock fixture data when live API routes are unprovisioned.
 */
export async function getMyReports(
  params?: GetMyReportsParams,
  options: { signal?: AbortSignal } = {}
): Promise<GetMyReportsResult> {
  if (params?.forceError) {
    throw new ApiError(500, "INTERNAL_ERROR", "Simulated API error for testing error state handling.");
  }

  if (params?.empty) {
    return {
      items: [],
      total: 0,
      page: 1,
      pageSize: params?.pageSize ?? 5,
      isDemoData: true,
    };
  }

  const query = new URLSearchParams();
  query.set("scope", "mine");

  if (params?.status && params.status !== "all") {
    query.set("status", params.status);
  }
  if (params?.category && params.category !== "all") {
    query.set("category", params.category);
  }
  if (params?.q && params.q.trim()) {
    query.set("q", params.q.trim());
  }
  if (params?.sort) {
    query.set("sort", params.sort);
  }
  if (params?.page) {
    query.set("page", String(params.page));
  }
  if (params?.pageSize) {
    query.set("pageSize", String(params.pageSize));
  }

  try {
    const response = await apiRequest<PaginatedListResponse<ReportSummary>>(
      endpoints.listReports,
      {
        query,
        signal: options.signal,
      }
    );

    if (!response || !Array.isArray(response.items)) {
      throw new Error("Invalid report list envelope received from server.");
    }

    return {
      items: response.items,
      total: response.total ?? response.items.length,
      page: response.page ?? 1,
      pageSize: response.pageSize ?? response.items.length,
      isDemoData: false,
    };
  } catch (cause) {
    if (options.signal?.aborted) {
      throw cause;
    }

    // In development / demo environment without backend route handlers, gracefully fall back to fixture data.
    const mockResult = filterReports(mockMyReports, params);
    return {
      ...mockResult,
      isDemoData: true,
    };
  }
}

/**
 * Retrieves authorized public civic reports with category, status, and search filtering.
 * Calls GET /api/reports?scope=public with optional filter params.
 * Strictly guarantees that private reports are never returned to the public map.
 * Falls back transparently in development/demo mode to mock fixture data when live API routes are unprovisioned.
 */
export async function getPublicReports(
  params?: GetPublicReportsParams,
  options: { signal?: AbortSignal } = {}
): Promise<GetPublicReportsResult> {
  if (params?.forceError) {
    throw new ApiError(500, "INTERNAL_ERROR", "Simulated API error for testing error state handling.");
  }

  if (params?.empty) {
    return {
      items: [],
      total: 0,
      isDemoData: true,
    };
  }

  const query = new URLSearchParams();
  query.set("scope", "public");

  if (params?.status && params.status !== "all") {
    query.set("status", params.status);
  }
  if (params?.category && params.category !== "all") {
    query.set("category", params.category);
  }
  if (params?.q && params.q.trim()) {
    query.set("q", params.q.trim());
  }

  try {
    const response = await apiRequest<PaginatedListResponse<ReportSummary>>(
      endpoints.listReports,
      {
        query,
        signal: options.signal,
      }
    );

    if (!response || !Array.isArray(response.items)) {
      throw new Error("Invalid public report list envelope received from server.");
    }

    // Defense-in-depth: Validate and filter out any non-public items
    const safePublicItems = response.items.filter((item) => item.visibility === "public");

    return {
      items: safePublicItems,
      total: response.total ?? safePublicItems.length,
      isDemoData: false,
    };
  } catch (cause) {
    if (options.signal?.aborted) {
      throw cause;
    }

    // In development / demo environment without backend route handlers, gracefully fall back to fixture data.
    const mockResult = filterPublicReports(mockMyReports, params);
    return {
      ...mockResult,
      isDemoData: true,
    };
  }
}

/**
 * Retrieves authorized municipal complaint queue with search, filtering, and priority sorting.
 * Calls GET /api/reports?scope=admin with query parameters.
 * Falls back transparently in development/demo mode to mock fixture data when live API routes are unprovisioned.
 */
export async function getAdminReports(
  params?: GetAdminReportsParams,
  options: { signal?: AbortSignal } = {}
): Promise<GetAdminReportsResult> {
  if (params?.forceError) {
    throw new ApiError(500, "INTERNAL_ERROR", "Simulated API error for testing error state handling.");
  }

  if (params?.empty) {
    return {
      items: [],
      total: 0,
      page: 1,
      pageSize: params?.pageSize ?? 10,
      totalPages: 1,
      urgentCount: 0,
      isDemoData: true,
    };
  }

  const query = new URLSearchParams();
  query.set("scope", "admin");

  if (params?.status && params.status !== "all") {
    query.set("status", params.status);
  }
  if (params?.category && params.category !== "all") {
    query.set("category", params.category);
  }
  if (params?.severity && params.severity !== "all") {
    query.set("severity", params.severity);
  }
  if (params?.urgent) {
    query.set("urgent", "true");
  }
  if (params?.q && params.q.trim()) {
    query.set("q", params.q.trim());
  }
  if (params?.sort) {
    query.set("sort", params.sort);
  }
  if (params?.page) {
    query.set("page", String(params.page));
  }
  if (params?.pageSize) {
    query.set("pageSize", String(params.pageSize));
  }

  try {
    const response = await apiRequest<PaginatedListResponse<ComplaintSummary>>(
      endpoints.listReports,
      {
        query,
        signal: options.signal,
      }
    );

    if (!response || !Array.isArray(response.items)) {
      throw new Error("Invalid admin report list envelope received from server.");
    }

    const pageSize = params?.pageSize ?? 10;
    const total = response.total ?? response.items.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));

    return {
      items: response.items,
      total,
      page: response.page ?? 1,
      pageSize: response.pageSize ?? pageSize,
      totalPages,
      urgentCount: response.items.filter(
        (r) => isReportUrgent(r) && r.status !== "resolved"
      ).length,
      isDemoData: false,
    };
  } catch (cause) {
    if (options.signal?.aborted) {
      throw cause;
    }

    // In development / demo environment without backend route handlers, gracefully fall back to fixture data.
    const mockResult = filterAdminReports(mockMyReports, params);
    return {
      ...mockResult,
      isDemoData: true,
    };
  }
}


