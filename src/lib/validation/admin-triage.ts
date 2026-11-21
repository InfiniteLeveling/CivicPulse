import { z } from "zod";
import type { IssueCategory } from "@/types/domain";

export const CATEGORY_RECOMMENDED_DEPT: Record<IssueCategory, string | null> = {
  pothole: "dept-1",
  garbage: "dept-3",
  water_leakage: "dept-4",
  streetlight: "dept-2",
  drainage: "dept-5",
  other: null,
};

export const adminTriageSchema = z.object({
  version: z
    .number()
    .int("Version must be an integer.")
    .positive("Version must be a positive number."),
  departmentId: z
    .string()
    .trim()
    .min(1, "Department identifier cannot be empty.")
    .nullable()
    .optional(),
  category: z
    .enum(["pothole", "garbage", "water_leakage", "streetlight", "drainage", "other"])
    .optional(),
  severity: z
    .enum(["low", "medium", "high", "critical"])
    .optional(),
  visibility: z
    .enum(["public", "private"])
    .optional(),
  remark: z
    .string()
    .trim()
    .max(1000, "Administrative remark cannot exceed 1000 characters.")
    .optional()
    .or(z.literal("")),
});

export type AdminTriageFormValues = z.infer<typeof adminTriageSchema>;
