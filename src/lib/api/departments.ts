import { apiRequest, ApiError } from "./client";
import { endpoints } from "./endpoints";
import type { Department } from "@/types/domain";

export const MOCK_DEPARTMENTS: Department[] = [
  { id: "dept-1", name: "Road Maintenance", category: "pothole" },
  { id: "dept-2", name: "Electrical Services", category: "streetlight" },
  { id: "dept-3", name: "Sanitation Dept", category: "garbage" },
  { id: "dept-4", name: "Water Supply & Sewerage", category: "water_leakage" },
  { id: "dept-5", name: "Drainage Works", category: "drainage" },
  { id: "dept-6", name: "General Infrastructure", category: null },
];

/**
 * Retrieves the list of authorized municipal departments eligible for triage assignment.
 * Calls GET /api/admin/departments.
 * Falls back transparently in demo mode to seeded municipal departments.
 */
export async function getAdminDepartments(
  options: { signal?: AbortSignal } = {}
): Promise<{ items: Department[]; isDemoData?: boolean }> {
  try {
    const response = await apiRequest<{ items: Department[] }>(
      endpoints.departments,
      {
        signal: options.signal,
      }
    );

    if (Array.isArray(response?.items)) {
      return { items: response.items, isDemoData: false };
    }

    return { items: MOCK_DEPARTMENTS, isDemoData: true };
  } catch (cause) {
    if (options.signal?.aborted) {
      throw cause;
    }

    // In development / demo environment without backend route handlers, gracefully fall back
    if (cause instanceof ApiError && (cause.status === 404 || cause.status === 403 || cause.status === 401)) {
      return { items: MOCK_DEPARTMENTS, isDemoData: true };
    }

    return { items: MOCK_DEPARTMENTS, isDemoData: true };
  }
}
