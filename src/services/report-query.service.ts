import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { AuthenticatedUser } from "@/types/auth";
import type {
  OwnerReportItem,
  PublicReportItem,
  ReportDetailItem,
  ReportImageMetadata,
  ReportListResponse,
  ReportQueryFilter,
} from "@/types/report";
import { AppError } from "@/utils/app-error";
import { logger } from "@/utils/logger";

interface RawDepartmentJoin {
  id?: string;
  name?: string;
  description?: string | null;
}

interface RawImageJoin {
  id: string;
  storage_path: string;
  type: "before" | "after";
  created_at: string;
}

interface RawReportRow {
  id: string;
  reference: string;
  user_id?: string;
  title: string;
  description: string;
  category: string;
  severity: string;
  status: string;
  priority_score: number;
  latitude: number;
  longitude: number;
  publication?: string;
  visibility?: string;
  resolved_at?: string | null;
  created_at: string;
  updated_at: string;
  departments?: RawDepartmentJoin | RawDepartmentJoin[] | null;
  report_images?: RawImageJoin | RawImageJoin[] | null;
}

/**
 * Normalizes joined single-object relations that PostgREST may return as an array or object.
 */
function normalizeDepartment(
  dept: RawDepartmentJoin | RawDepartmentJoin[] | null | undefined
): RawDepartmentJoin | null {
  if (!dept) return null;
  if (Array.isArray(dept)) return dept[0] ?? null;
  return dept;
}

/**
 * Normalizes joined array relations that PostgREST returns.
 */
function normalizeImages(
  imgs: RawImageJoin | RawImageJoin[] | null | undefined
): RawImageJoin[] {
  if (!imgs) return [];
  if (Array.isArray(imgs)) return imgs;
  return [imgs];
}

/**
 * Sanitizes search input to prevent PostgREST query filter injection.
 * Strips out commas, periods, colons, parentheses, and wildcard characters.
 */
function sanitizeSearchQuery(query: string): string {
  return query.replace(/[%_,():."'\\]/g, "").trim();
}

/**
 * Retrieves a paginated and filtered list of complaints based on scope (Public, Personal, Admin).
 */
export async function listReports(
  filter: ReportQueryFilter,
  caller?: AuthenticatedUser | null,
  client?: SupabaseClient
): Promise<ReportListResponse<PublicReportItem | OwnerReportItem>> {
  const page = Math.max(1, filter.page ?? 1);
  const limit = Math.min(50, Math.max(1, filter.limit ?? 20));
  const offset = (page - 1) * limit;

  // 1. Determine Scope & Security Predicates BEFORE initializing database client
  const isMine = Boolean(filter.mine);
  const isAdminScope = filter.scope === "admin";

  if (isMine && !caller) {
    logger.warn("auth.unauthorized", { status: 401 });
    throw new AppError("UNAUTHORIZED", "Authentication required to view personal reports");
  }

  if (isAdminScope && (!caller || caller.role !== "admin")) {
    logger.warn("report.forbidden", { status: 403 });
    throw new AppError("FORBIDDEN", "Administrative access required to view operational feed");
  }

  const supabase = client ?? (await createSupabaseServerClient());

  // 2. Build Query (user_id is never projected to respect anonymous column-level ACLs)
  let query = supabase.from("reports").select(
    `
      id,
      reference,
      title,
      description,
      category,
      severity,
      status,
      priority_score,
      latitude,
      longitude,
      publication,
      visibility,
      created_at,
      updated_at,
      departments (id, name, description),
      report_images (id, storage_path, type, created_at)
    `,
    { count: "exact" }
  );

  if (isMine && caller) {
    // Personal reports: strictly scoped to current user
    query = query.eq("user_id", caller.id);
  } else if (isAdminScope) {
    // Admin scope: view all operational reports
  } else {
    // Public feed: only public and listed reports
    query = query.eq("publication", "public").eq("visibility", "listed");
  }

  // 3. Apply Filters
  if (filter.category) {
    query = query.eq("category", filter.category);
  }
  if (filter.status) {
    query = query.eq("status", filter.status);
  }
  if (filter.severity) {
    query = query.eq("severity", filter.severity);
  }
  if (filter.search) {
    const cleanSearch = sanitizeSearchQuery(filter.search);
    if (cleanSearch.length > 0) {
      query = query.or(
        `title.ilike.%${cleanSearch}%,description.ilike.%${cleanSearch}%`
      );
    }
  }

  // 4. Apply Stable Ordering
  switch (filter.sort) {
    case "oldest":
      query = query.order("created_at", { ascending: true }).order("id", { ascending: true });
      break;
    case "priority_high":
      query = query
        .order("priority_score", { ascending: false })
        .order("created_at", { ascending: true })
        .order("id", { ascending: true });
      break;
    case "priority_low":
      query = query
        .order("priority_score", { ascending: true })
        .order("created_at", { ascending: true })
        .order("id", { ascending: true });
      break;
    case "newest":
    default:
      query = query.order("created_at", { ascending: false }).order("id", { ascending: false });
      break;
  }

  // 5. Apply Range (Pagination)
  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) {
    logger.error("request.failed", { status: 500 });
    throw new AppError("INTERNAL_SERVER_ERROR", "Failed to retrieve complaint reports", {
      cause: error,
    });
  }

  const rawRows = (data ?? []) as unknown as RawReportRow[];
  const total = count ?? 0;
  const total_pages = Math.max(1, Math.ceil(total / limit));

  // 6. Project Data Safely According to Caller Role & Scope
  if (isMine || isAdminScope) {
    const items: OwnerReportItem[] = rawRows.map((row) => {
      const dept = normalizeDepartment(row.departments);
      const rawImgs = normalizeImages(row.report_images);
      const images: ReportImageMetadata[] = rawImgs.map((img) => ({
        id: img.id,
        storage_path: img.storage_path,
        type: img.type,
        created_at: img.created_at,
      }));

      return {
        id: row.id,
        reference: row.reference,
        title: row.title,
        description: row.description,
        category: row.category as OwnerReportItem["category"],
        severity: row.severity as OwnerReportItem["severity"],
        status: row.status as OwnerReportItem["status"],
        priority_score: row.priority_score,
        latitude: row.latitude,
        longitude: row.longitude,
        publication: (row.publication as OwnerReportItem["publication"]) ?? "private",
        visibility: (row.visibility as OwnerReportItem["visibility"]) ?? "listed",
        department_name: dept?.name ?? null,
        image_count: images.length,
        images,
        created_at: row.created_at,
        updated_at: row.updated_at,
      };
    });

    logger.info("report.listed", { status: 200 });
    return {
      items,
      pagination: {
        page,
        limit,
        total,
        total_pages,
        has_next_page: page < total_pages,
        has_previous_page: page > 1,
      },
    };
  }

  // Public Feed Projection: Never leak user_id, publication, visibility, or raw image draft paths
  const items: PublicReportItem[] = rawRows.map((row) => {
    const dept = normalizeDepartment(row.departments);
    const rawImgs = normalizeImages(row.report_images);

    return {
      id: row.id,
      reference: row.reference,
      title: row.title,
      description: row.description,
      category: row.category as PublicReportItem["category"],
      severity: row.severity as PublicReportItem["severity"],
      status: row.status as PublicReportItem["status"],
      priority_score: row.priority_score,
      latitude: row.latitude,
      longitude: row.longitude,
      department_name: dept?.name ?? null,
      image_count: rawImgs.length,
      image_path: rawImgs[0]?.storage_path,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  });

  logger.info("report.listed", { status: 200 });
  return {
    items,
    pagination: {
      page,
      limit,
      total,
      total_pages,
      has_next_page: page < total_pages,
      has_previous_page: page > 1,
    },
  };
}

/**
 * Retrieves the full detail of a single complaint report.
 * Enforces role-aware data boundaries:
 * - Owner and Admin: Full access including publication, visibility, and images.
 * - Public: Access only if report is public and listed; omits user_id and private fields.
 * - Unauthorized: Returns HTTP 404 NOT_FOUND to avoid confirming existence of private complaints.
 */
export async function getReportById(
  id: string,
  caller?: AuthenticatedUser | null,
  client?: SupabaseClient
): Promise<ReportDetailItem> {
  const supabase = client ?? (await createSupabaseServerClient());

  const { data, error } = caller
    ? await supabase
        .from("reports")
        .select(
          `
            id,
            reference,
            user_id,
            title,
            description,
            category,
            severity,
            status,
            priority_score,
            latitude,
            longitude,
            publication,
            visibility,
            resolved_at,
            created_at,
            updated_at,
            departments (id, name, description),
            report_images (id, storage_path, type, created_at)
          `
        )
        .eq("id", id)
        .maybeSingle()
    : await supabase
        .from("reports")
        .select(
          `
            id,
            reference,
            title,
            description,
            category,
            severity,
            status,
            priority_score,
            latitude,
            longitude,
            publication,
            visibility,
            created_at,
            updated_at,
            departments (id, name, description),
            report_images (id, storage_path, type, created_at)
          `
        )
        .eq("id", id)
        .maybeSingle();

  if (error) {
    logger.error("request.failed", { status: 500 });
    throw new AppError("INTERNAL_SERVER_ERROR", "Failed to retrieve complaint details", {
      cause: error,
    });
  }

  if (!data) {
    logger.warn("report.not_found", { status: 404 });
    throw new AppError("NOT_FOUND", "Complaint report not found");
  }

  const row = data as unknown as RawReportRow;
  const isOwner = caller ? caller.id === row.user_id : false;
  const isAdmin = caller ? caller.role === "admin" : false;
  const isPublic = row.publication === "public" && row.visibility === "listed";

  // Access Boundary: If caller is not the owner or admin, and report is not public, return 404
  if (!isOwner && !isAdmin && !isPublic) {
    logger.warn("report.not_found", { status: 404 });
    throw new AppError("NOT_FOUND", "Complaint report not found");
  }

  const dept = normalizeDepartment(row.departments);
  const rawImgs = normalizeImages(row.report_images);
  const images: ReportImageMetadata[] = rawImgs.map((img) => ({
    id: img.id,
    storage_path: img.storage_path,
    type: img.type,
    created_at: img.created_at,
  }));

  logger.info("report.retrieved", { status: 200 });

  if (isOwner || isAdmin) {
    return {
      id: row.id,
      reference: row.reference,
      title: row.title,
      description: row.description,
      category: row.category as ReportDetailItem["category"],
      severity: row.severity as ReportDetailItem["severity"],
      status: row.status as ReportDetailItem["status"],
      priority_score: row.priority_score,
      latitude: row.latitude,
      longitude: row.longitude,
      publication: row.publication as ReportDetailItem["publication"],
      visibility: row.visibility as ReportDetailItem["visibility"],
      is_owner: isOwner,
      department: dept
        ? {
            id: dept.id,
            name: dept.name ?? "Unassigned",
            description: dept.description,
          }
        : null,
      images,
      created_at: row.created_at,
      updated_at: row.updated_at,
      resolved_at: row.resolved_at,
    };
  }

  // Safe Public Detail Projection
  return {
    id: row.id,
    reference: row.reference,
    title: row.title,
    description: row.description,
    category: row.category as ReportDetailItem["category"],
    severity: row.severity as ReportDetailItem["severity"],
    status: row.status as ReportDetailItem["status"],
    priority_score: row.priority_score,
    latitude: row.latitude,
    longitude: row.longitude,
    is_owner: false,
    department: dept
      ? {
          name: dept.name ?? "Unassigned",
        }
      : null,
    images: images.map((img) => ({
      id: img.id,
      storage_path: img.storage_path,
      type: img.type,
      created_at: img.created_at,
    })),
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}
