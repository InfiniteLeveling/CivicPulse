import { z } from "zod";
import type { ReportStatus } from "@/types/domain";

export const VALID_STATUSES: ReportStatus[] = ["pending", "in_progress", "resolved"];

/**
 * Validates allowed status transitions according to the backend municipal lifecycle:
 * - pending -> in_progress (Work started)
 * - pending -> resolved (Direct resolution)
 * - in_progress -> resolved (Work completed & verified)
 *
 * Status mutations to identical status are no-ops.
 * Backward transitions (e.g. resolved -> pending) are blocked in MVP.
 */
export function isValidStatusTransition(
  current: ReportStatus,
  target: ReportStatus
): boolean {
  if (current === target) {
    return false; // No-op
  }

  if (current === "pending") {
    return target === "in_progress" || target === "resolved";
  }

  if (current === "in_progress") {
    return target === "resolved";
  }

  // Resolved is terminal in MVP
  return false;
}

/**
 * Returns available next status options for a given current status.
 */
export function getAllowedNextStatuses(current: ReportStatus): ReportStatus[] {
  if (current === "pending") {
    return ["in_progress", "resolved"];
  }
  if (current === "in_progress") {
    return ["resolved"];
  }
  return [];
}

export const adminStatusSchema = z
  .object({
    version: z
      .number()
      .int("Version must be an integer.")
      .positive("Version must be a positive number."),
    status: z.enum(["pending", "in_progress", "resolved"]),
    remark: z
      .string()
      .trim()
      .max(1000, "Status update remark cannot exceed 1000 characters.")
      .optional()
      .or(z.literal("")),
    resolutionImageId: z
      .string()
      .trim()
      .min(1, "Resolution evidence photograph ID cannot be empty.")
      .nullable()
      .optional(),
  });

export type AdminStatusFormValues = z.infer<typeof adminStatusSchema>;
