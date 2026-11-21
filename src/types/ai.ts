import type { ReportCategory, ReportSeverity } from "@/types/report";

export const AI_CONFIDENCE_LEVELS = ["low", "medium", "high"] as const;
export type AIConfidenceLevel = (typeof AI_CONFIDENCE_LEVELS)[number];

export const APPROVED_DEPARTMENTS = [
  "Road Maintenance",
  "Sanitation",
  "Water Supply",
  "Electrical",
  "Drainage",
  "Public Works",
] as const;
export type ApprovedDepartment = (typeof APPROVED_DEPARTMENTS)[number];

/**
 * Validated citizen input for requesting AI multimodal image classification.
 */
export interface AIClassifyInput {
  image_path: string;
  description_hint?: string;
  consent_to_ai_processing: boolean;
}

/**
 * Structured, validated suggestions returned by Google Gemini.
 * These values are advisory only and must be reviewed and confirmed by the citizen.
 */
export interface AIClassificationData {
  category: ReportCategory;
  severity: ReportSeverity;
  title_suggestion: string;
  description_suggestion: string;
  department_suggestion: string | null;
  evidence_summary: string;
  confidence_level: AIConfidenceLevel;
  needs_manual_review: boolean;
  uncertainty_reason?: string | null;
}
