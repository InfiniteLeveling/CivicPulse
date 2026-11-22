import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { MAP_CONFIG, crossesAntimeridian } from "@/config/map";
import type { AuthenticatedUser } from "@/types/auth";
import type { MapMarker, MapQueryFilter, MapResponseData } from "@/types/map";
import type { ReportCategory, ReportSeverity, ReportStatus } from "@/types/report";
import { AppError } from "@/utils/app-error";
import { logger } from "@/utils/logger";

interface RawDepartmentJoin {
  id?: string;
  name?: string;
}

interface RawMapReportRow {
  id: string;
  latitude: number;
  longitude: number;
  title: string;
  category: ReportCategory;
  status: ReportStatus;
  severity: ReportSeverity;
  priority_score: number;
  created_at: string;
  departments?: RawDepartmentJoin | RawDepartmentJoin[] | null;
}

/**
 * Normalizes joined single-object relations that PostgREST may return as an array or object.
 */
function normalizeDepartment(
  dept: RawDepartmentJoin | RawDepartmentJoin[] | null | undefined
): { id: string; name: string } | null {
  if (!dept) return null;
  const single = Array.isArray(dept) ? dept[0] : dept;
  if (!single || !single.id || !single.name) return null;
  return { id: single.id, name: single.name };
}

/**
 * Retrieves map-ready complaint markers located inside a geographic viewport.
 *
 * Guarantees:
 * 1. Database-Side Spatial Filtering: Bounding box comparisons executed in PostgreSQL.
 * 2. Antimeridian Support: Correct OR grouping when crossing 180° meridian (west > east).
 * 3. Public/Private Visibility: Unauthenticated/citizen callers see only public, listed reports.
 * 4. Minimal Map Projection: Strictly projects public preview fields (no PII, voter IDs, images).
 * 5. Deterministic Ordering: Ordered by created_at DESC, id DESC (or priority_score DESC).
 * 6. Result Capping & Overflow: Enforces limit bounds and computes accurate has_more indicator.
 */
export async function getMapMarkers(
  filter: MapQueryFilter,
  caller?: AuthenticatedUser | null,
  client?: SupabaseClient
): Promise<MapResponseData> {
  const limit = Math.min(
    MAP_CONFIG.MAX_LIMIT,
    Math.max(MAP_CONFIG.MIN_LIMIT, filter.limit ?? MAP_CONFIG.DEFAULT_LIMIT)
  );

  const isAdmin = caller?.role === "admin";
  const supabase = client ?? (await createSupabaseServerClient());

  // 1. Build Base Spatial Query
  let query = supabase.from("reports").select(`
    id,
    latitude,
    longitude,
    title,
    category,
    status,
    severity,
    priority_score,
    created_at,
    departments (id, name)
  `);

  // 2. Enforce Visibility & Privacy Policy
  if (!isAdmin) {
    query = query.eq("publication", "public").eq("visibility", "listed");
  }

  // 3. Apply Geographic Bounding-Box Predicates in PostgreSQL
  query = query.gte("latitude", filter.south).lte("latitude", filter.north);

  const isAntimeridianCrossing = crossesAntimeridian(filter.west, filter.east);
  if (isAntimeridianCrossing) {
    query = query.or(`longitude.gte.${filter.west},longitude.lte.${filter.east}`);
  } else {
    query = query.gte("longitude", filter.west).lte("longitude", filter.east);
  }

  // 4. Apply Category Filter
  if (filter.category) {
    query = query.eq("category", filter.category);
  }

  // 5. Apply Status Filter
  if (filter.status === "all") {
    query = query.in("status", ["pending", "in_progress", "resolved"]);
  } else if (filter.status) {
    query = query.eq("status", filter.status);
  } else {
    query = query.in("status", [...MAP_CONFIG.DEFAULT_STATUSES]);
  }

  // 6. Apply Optional Severity Filter
  if (filter.severity) {
    query = query.eq("severity", filter.severity);
  }

  // 7. Apply Optional Department Filter
  if (filter.department_id) {
    query = query.eq("department_id", filter.department_id);
  }

  // 8. Deterministic Ordering
  if (filter.sort === "priority_high") {
    query = query
      .order("priority_score", { ascending: false })
      .order("created_at", { ascending: false })
      .order("id", { ascending: false });
  } else {
    query = query
      .order("created_at", { ascending: false })
      .order("id", { ascending: false });
  }

  // 9. Over-fetch by 1 to compute has_more accurately
  query = query.limit(limit + 1);

  const { data, error } = await query;

  if (error) {
    logger.error("map.failed", { status: 500 });
    throw new AppError("INTERNAL_SERVER_ERROR", "Failed to retrieve map complaints", {
      cause: error,
    });
  }

  const rawRows: RawMapReportRow[] = (data as unknown as RawMapReportRow[]) ?? [];
  const hasMore = rawRows.length > limit;
  const slicedRows = hasMore ? rawRows.slice(0, limit) : rawRows;

  // 10. Map to minimal, secure marker projections
  const markers: MapMarker[] = slicedRows.map((row) => ({
    id: row.id,
    latitude: row.latitude,
    longitude: row.longitude,
    title: row.title,
    category: row.category,
    status: row.status,
    severity: row.severity,
    priority_score: row.priority_score,
    department: normalizeDepartment(row.departments),
    created_at: row.created_at,
  }));

  logger.info("map.queried", { status: 200 });

  return {
    markers,
    viewport: {
      south: filter.south,
      west: filter.west,
      north: filter.north,
      east: filter.east,
      crosses_antimeridian: isAntimeridianCrossing,
    },
    returned_count: markers.length,
    limit,
    has_more: hasMore,
  };
}
