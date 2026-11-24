import { apiRequest } from "./client";
import { endpoints } from "./endpoints";
import type { Department } from "@/types/domain";

/**
 * Retrieves the list of authorized municipal departments eligible for triage assignment.
 * Calls GET /api/departments.
 */
export async function getAdminDepartments(
  options: { signal?: AbortSignal } = {}
): Promise<{ items: Department[]; isDemoData?: boolean }> {
  const response = await apiRequest<{ departments?: Department[]; items?: Department[] }>(
    endpoints.departments,
    {
      signal: options.signal,
    }
  );

  const departments = response?.items ?? response?.departments ?? [];
  return { items: departments, isDemoData: false };
}
