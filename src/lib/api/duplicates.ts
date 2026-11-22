import { apiRequest } from "./client";
import { endpoints } from "./endpoints";
import type {
  DuplicateCandidate,
  DuplicateCheckRequest,
  DuplicateCheckResponse,
} from "@/types/domain";
import {
  duplicateCheckRequestSchema,
  duplicateCheckResponseSchema,
} from "@/lib/validation/duplicates";

/**
 * Checks for existing unresolved complaints within the municipal proximity radius (typically 100m).
 * Calls POST /api/reports/duplicates with category, coordinates, and visibility.
 */
export async function checkDuplicateReports(
  request: DuplicateCheckRequest,
  options: { signal?: AbortSignal } = {}
): Promise<DuplicateCandidate[]> {
  const validated = duplicateCheckRequestSchema.parse(request);

  const rawData = await apiRequest<DuplicateCheckResponse, DuplicateCheckRequest>(
    endpoints.duplicates,
    {
      body: validated,
      signal: options.signal,
    }
  );

  const parsed = duplicateCheckResponseSchema.safeParse(rawData);
  if (!parsed.success) {
    throw new Error("Invalid duplicate check payload received from server.");
  }

  return parsed.data.candidates;
}
