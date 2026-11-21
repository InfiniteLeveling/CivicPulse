import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { DUPLICATE_CONFIG, type DuplicateMatchPolicy } from "@/config/duplicate";
import type { AuthenticatedUser } from "@/types/auth";
import type {
  CheckDuplicatesInput,
  CheckDuplicatesResponseData,
  DuplicateMatchItem,
} from "@/types/duplicate";
import type { ReportCategory, ReportStatus } from "@/types/report";
import { AppError } from "@/utils/app-error";
import { getBoundingBox, haversineDistanceMeters } from "@/utils/haversine";
import { logger } from "@/utils/logger";

interface RawReportCandidate {
  id: string;
  title: string;
  category: ReportCategory;
  status: ReportStatus;
  latitude: number;
  longitude: number;
  created_at: string;
  user_id?: string;
  publication?: string;
  visibility?: string;
}

interface RankedCandidate extends RawReportCandidate {
  distance: number;
}

/**
 * CivicPulse Duplicate Detection Service
 *
 * Discovers potential duplicate complaints within a server-controlled 100-meter radius
 * using the Haversine formula and canonical category matching.
 *
 * Rules:
 * 1. Proximity: Unrounded Haversine distance <= 100.0 meters.
 * 2. Category matching: Same canonical category. For 'other', advisory proximity policy applies.
 * 3. Status eligibility: Unresolved active complaints only ('pending', 'in_progress').
 * 4. Visibility & Privacy: Authorized public listed reports or owner's complaints only.
 * 5. Deterministic Ranking: Nearest first, newer first on distance tie, ID tie-breaker.
 * 6. Result Capping: Top 5 candidates max.
 * 7. Advisory only: Never merges, deletes, modifies, or auto-upvotes complaints.
 */
export async function checkDuplicateReports(
  input: CheckDuplicatesInput,
  caller: AuthenticatedUser,
  client?: SupabaseClient
): Promise<CheckDuplicatesResponseData> {
  const startTime = Date.now();

  // 1. Session verification
  if (!caller || !caller.id) {
    logger.warn("auth.unauthorized", { status: 401 });
    throw new AppError("UNAUTHORIZED", "Authentication required to check duplicate reports");
  }

  // 2. Policy determination
  const matchPolicy: DuplicateMatchPolicy =
    input.category === "other"
      ? DUPLICATE_CONFIG.OTHER_MATCH_POLICY
      : DUPLICATE_CONFIG.CANONICAL_MATCH_POLICY;

  // 3. Coordinate bounding box prefilter
  const box = getBoundingBox(
    input.latitude,
    input.longitude,
    DUPLICATE_CONFIG.SEARCH_RADIUS_METERS,
    DUPLICATE_CONFIG.PREFILTER_SAFETY_MARGIN
  );

  // 4. Initialize database client
  const supabase = client ?? (await createSupabaseServerClient());

  // 5. Build candidate query respecting RLS and category/status/bounding-box filters
  let query = supabase
    .from("reports")
    .select(
      "id, title, category, status, latitude, longitude, created_at, user_id, publication, visibility"
    )
    .eq("category", input.category)
    .in("status", [...DUPLICATE_CONFIG.ELIGIBLE_STATUSES])
    .gte("latitude", box.minLat)
    .lte("latitude", box.maxLat);

  if (box.crossesAntimeridian) {
    query = query.or(`longitude.gte.${box.minLon},longitude.lte.${box.maxLon}`);
  } else {
    query = query.gte("longitude", box.minLon).lte("longitude", box.maxLon);
  }

  const { data, error } = await query;

  if (error) {
    logger.error("duplicate.query_failed", { status: 500, durationMs: Date.now() - startTime });
    throw new AppError(
      "INTERNAL_SERVER_ERROR",
      "Failed to query nearby complaints for duplicate verification"
    );
  }

  const rawRows: RawReportCandidate[] = (data as RawReportCandidate[] | null) ?? [];

  // 6. Security Defense-in-Depth & Exact Haversine Calculation
  const candidates: RankedCandidate[] = [];

  for (const row of rawRows) {
    // Exact category match defense
    if (row.category !== input.category) {
      continue;
    }

    // Active status filter defense
    const eligibleStatuses: readonly string[] = DUPLICATE_CONFIG.ELIGIBLE_STATUSES;
    if (!eligibleStatuses.includes(row.status)) {
      continue;
    }

    // Privacy check: exclude private complaints belonging to other users
    const isOwner = row.user_id === caller.id;
    const isPublicListed =
      (!row.publication || row.publication === "public") &&
      (!row.visibility || row.visibility === "listed");
    const isAdmin = caller.role === "admin";

    if (!isPublicListed && !isOwner && !isAdmin) {
      continue;
    }

    // Exact unrounded Haversine calculation
    const distance = haversineDistanceMeters(
      input.latitude,
      input.longitude,
      row.latitude,
      row.longitude,
      DUPLICATE_CONFIG.EARTH_RADIUS_METERS
    );

    // Strict boundary filter: must be <= 100.0 meters
    if (distance <= DUPLICATE_CONFIG.SEARCH_RADIUS_METERS) {
      candidates.push({
        ...row,
        distance,
      });
    }
  }

  // 7. Deterministic Ranking
  // a) Shortest distance first
  // b) Newer report first on distance tie (within 1mm floating tolerance)
  // c) Stable report ID tie-breaker
  candidates.sort((a, b) => {
    const distDiff = a.distance - b.distance;
    if (Math.abs(distDiff) > 0.001) {
      return distDiff;
    }

    const timeDiff = new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    if (timeDiff !== 0) {
      return timeDiff;
    }

    return a.id.localeCompare(b.id);
  });

  // 8. Result Capping to MAX_MATCHES (5)
  const topMatches = candidates.slice(0, DUPLICATE_CONFIG.MAX_MATCHES);

  // 9. Format Safe Public Data Projection
  const matches: DuplicateMatchItem[] = topMatches.map((m) => ({
    id: m.id,
    title: m.title,
    category: m.category,
    status: m.status,
    distance_meters: Math.round(m.distance),
    created_at: m.created_at,
  }));

  const hasDuplicates = matches.length > 0;
  const durationMs = Date.now() - startTime;

  if (hasDuplicates) {
    logger.info("duplicate.found", { status: 200, durationMs });
  } else {
    logger.info("duplicate.none_found", { status: 200, durationMs });
  }

  return {
    has_potential_duplicates: hasDuplicates,
    radius_meters: DUPLICATE_CONFIG.SEARCH_RADIUS_METERS,
    match_policy: matchPolicy,
    matches,
  };
}
