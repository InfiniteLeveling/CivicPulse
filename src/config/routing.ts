import type { ReportCategory } from "@/types/report";

/**
 * Authoritative category-to-department mapping for CivicPulse automatic routing (MVP).
 * Any category mapping to null requires manual administrator review and routing.
 */
export const CATEGORY_DEPARTMENT_MAP: Record<ReportCategory, string | null> = {
  pothole: "Road Maintenance",
  garbage: "Sanitation",
  water_leakage: "Water Supply",
  streetlight: "Electrical",
  drainage: "Drainage",
  damaged_infrastructure: "Public Works",
  other: null,
} as const;

/**
 * Routing rule engine version.
 */
export const ROUTING_RULE_VERSION = "v1";

/**
 * List of canonical categories deliberately requiring human manual review.
 */
export const UNMAPPED_CATEGORIES: readonly ReportCategory[] = ["other"] as const;

/**
 * Resolves the canonical target department name for a complaint category.
 * Returns null if the category requires manual review or is unrecognized.
 */
export function getTargetDepartmentName(category: string): string | null {
  if (Object.prototype.hasOwnProperty.call(CATEGORY_DEPARTMENT_MAP, category)) {
    return CATEGORY_DEPARTMENT_MAP[category as ReportCategory];
  }
  return null;
}

/**
 * Checks whether a complaint category has an automatic department assignment rule.
 */
export function isMappableCategory(category: string): boolean {
  const target = getTargetDepartmentName(category);
  return target !== null;
}

/**
 * Generates a deterministic rule key for audit logging and explainability.
 * E.g., "pothole" + "Road Maintenance" => "pothole_to_road_maintenance"
 */
export function getRuleKey(category: string, departmentName: string): string {
  const sanitizedDept = departmentName.toLowerCase().replace(/[^a-z0-9]+/g, "_");
  return `${category}_to_${sanitizedDept}`;
}
