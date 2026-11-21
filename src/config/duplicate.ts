import {
  DUPLICATE_RADIUS_METERS,
  EARTH_RADIUS_METERS,
} from "@/utils/haversine";

export const DUPLICATE_CONFIG = {
  SEARCH_RADIUS_METERS: DUPLICATE_RADIUS_METERS, // 100 meters
  EARTH_RADIUS_METERS, // 6,371,000 meters
  MAX_MATCHES: 5,
  ELIGIBLE_STATUSES: ["pending", "in_progress"] as const,
  CANONICAL_MATCH_POLICY: "same_category_within_100m" as const,
  OTHER_MATCH_POLICY: "other_category_proximity_advisory" as const,
  PREFILTER_SAFETY_MARGIN: 1.05,
} as const;

export type DuplicateMatchPolicy =
  | typeof DUPLICATE_CONFIG.CANONICAL_MATCH_POLICY
  | typeof DUPLICATE_CONFIG.OTHER_MATCH_POLICY;
