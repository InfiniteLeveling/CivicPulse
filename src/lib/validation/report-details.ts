import { z } from "zod";
import type { ComplaintDetails } from "@/types/domain";

export const reportStatusEnum = z.enum(["pending", "in_progress", "resolved"]);
export const issueCategoryEnum = z.enum([
  "pothole",
  "garbage",
  "water_leakage",
  "streetlight",
  "drainage",
  "other",
]);
export const issueSeverityEnum = z.enum(["low", "medium", "high", "critical"]);
export const reportVisibilityEnum = z.enum(["public", "private"]);

export const statusHistorySchema = z.object({
  id: z.string().min(1, "Status event ID is required."),
  eventType: z.enum([
    "submitted",
    "triaged",
    "status_changed",
    "feedback_reviewed",
  ]),
  oldStatus: reportStatusEnum.nullable(),
  newStatus: reportStatusEnum.nullable(),
  remark: z.string().nullable(),
  createdAt: z.string().min(1, "Event timestamp is required."),
});

export const resolutionImageSchema = z.object({
  id: z.string().min(1, "Resolution image ID is required."),
  imageUrl: z.string().min(1, "Resolution image URL is required."),
  createdAt: z.string().min(1, "Resolution image timestamp is required."),
});

export const departmentSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1),
  })
  .nullable();

export const priorityBreakdownSchema = z
  .object({
    score: z.number(),
    severityPoints: z.number(),
    supportPoints: z.number(),
    agePoints: z.number(),
    urgent: z.boolean(),
  })
  .optional();

export const complaintSummarySchema = z.object({
  id: z.string().min(1, "Complaint ID is required."),
  reference: z.string().min(1, "Reference code is required."),
  title: z.string().min(1, "Title is required."),
  description: z.string().min(1, "Description is required."),
  category: issueCategoryEnum,
  severity: issueSeverityEnum,
  severityReviewed: z.boolean().default(false),
  status: reportStatusEnum,
  visibility: reportVisibilityEnum,
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  department: departmentSchema,
  supportCount: z.number().int().nonnegative(),
  priority: priorityBreakdownSchema,
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
  resolvedAt: z.string().nullable(),
  imageUrl: z.string().nullable(),
  viewerHasSupported: z.boolean().default(false),
});

export const complaintDetailsSchema = z.object({
  report: complaintSummarySchema,
  history: z.array(statusHistorySchema),
  resolutionImages: z.array(resolutionImageSchema),
  canGiveFeedback: z.boolean(),
  version: z.number().int().nonnegative(),
});

export function validateComplaintDetails(data: unknown): ComplaintDetails {
  return complaintDetailsSchema.parse(data) as ComplaintDetails;
}

export function safeValidateComplaintDetails(data: unknown) {
  return complaintDetailsSchema.safeParse(data);
}
