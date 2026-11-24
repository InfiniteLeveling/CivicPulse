import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { getVerifiedUser } from "@/lib/auth/authorization";
import { listReports, getReportById } from "@/services/report-query.service";
import { getReportStatusHistory } from "@/services/status.service";
import { getReportEvidence } from "@/services/evidence.service";
import { EVIDENCE_CONFIG } from "@/config/evidence";
import { getOverviewAnalytics } from "@/services/analytics.service";
import type { AuthenticatedUser } from "@/types/auth";
import type {
  ComplaintDetails,
  ComplaintStats,
  ComplaintSummary,
  GetAdminReportsParams,
  GetAdminReportsResult,
  GetPublicReportsParams,
  GetPublicReportsResult,
} from "@/types/domain";
import type { AdminOverviewData } from "@/lib/api/stats";
import type { CitizenDashboardData } from "@/lib/api/dashboard";
import { aggregateAnalyticsFromReports, type AdminAnalyticsData } from "@/lib/validation/admin-analytics";
import { isReportUrgent } from "@/lib/validation/admin-reports";
import {
  toComplaintSummary,
  toStatusHistoryList,
  type RawMappableReport,
} from "@/lib/reports/mapper";

function getServiceAdminClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function toAuthenticatedUser(
  auth: Awaited<ReturnType<typeof getVerifiedUser>>
): AuthenticatedUser | null {
  if (!auth) return null;
  return {
    id: auth.user.id,
    email: auth.user.email,
    full_name: auth.profile?.fullName ?? auth.user.email ?? "Citizen",
    role: auth.role === "admin" ? "admin" : "citizen",
  };
}

/**
 * Safely aggregates vote counts (and whether the caller voted) for a batch of report IDs.
 * Never exposes individual voter IDs.
 */
export async function fetchVoteMetaForReports(
  reportIds: string[],
  callerId?: string | null
): Promise<{ counts: Map<string, number>; viewerVoted: Set<string> }> {
  const counts = new Map<string, number>();
  const viewerVoted = new Set<string>();
  if (reportIds.length === 0) return { counts, viewerVoted };

  const admin = getServiceAdminClient();
  if (!admin) return { counts, viewerVoted };

  try {
    const { data, error } = await admin
      .from("report_votes")
      .select("report_id, user_id")
      .in("report_id", reportIds);

    if (!error && Array.isArray(data)) {
      for (const row of data as Array<{ report_id: string; user_id: string }>) {
        counts.set(row.report_id, (counts.get(row.report_id) ?? 0) + 1);
        if (callerId && row.user_id === callerId) {
          viewerVoted.add(row.report_id);
        }
      }
    }
  } catch {
    // Non-fatal: defaults to 1 initial self-vote in mapper
  }

  return { counts, viewerVoted };
}

/**
 * Generates short-lived signed URLs for primary 'before' images across a batch of report rows.
 */
export async function fetchBeforeImageUrls(
  rows: Array<{ id: string; image_path?: string; images?: Array<{ storage_path: string; type: string }> }>,
  client?: SupabaseClient
): Promise<Map<string, string>> {
  const urlMap = new Map<string, string>();
  const storageClient = getServiceAdminClient() ?? client;
  if (!storageClient) return urlMap;

  await Promise.all(
    rows.map(async (row) => {
      const beforePath =
        row.images?.find((img) => img.type === "before")?.storage_path ??
        row.images?.[0]?.storage_path ??
        row.image_path;
      if (!beforePath) return;

      try {
        const { data: signedData, error: signError } = await storageClient.storage
          .from(EVIDENCE_CONFIG.BUCKET_NAME)
          .createSignedUrl(beforePath, 900);
        if (!signError && signedData?.signedUrl) {
          urlMap.set(row.id, signedData.signedUrl);
        }
      } catch {
        // Non-fatal signed URL fallback
      }
    })
  );

  return urlMap;
}

/**
 * Enriches backend report items with accurate vote counts, viewer support status,
 * signed image URLs, and canonical camelCase frontend fields.
 */
export async function enrichReportItems(
  items: Array<RawMappableReport & { image_path?: string; images?: Array<{ storage_path: string; type: string }> }>,
  callerId?: string | null,
  client?: SupabaseClient
): Promise<ComplaintSummary[]> {
  if (items.length === 0) return [];
  const ids = items.map((item) => item.id);

  const [voteMeta, imageMap] = await Promise.all([
    fetchVoteMetaForReports(ids, callerId),
    fetchBeforeImageUrls(items, client),
  ]);

  return items.map((item) =>
    toComplaintSummary(item, {
      supportCount: voteMeta.counts.get(item.id) ?? 1,
      viewerHasSupported: voteMeta.viewerVoted.has(item.id),
      imageUrl: imageMap.get(item.id) ?? null,
    })
  );
}

/**
 * Server-side Citizen Dashboard loader (no relative fetch).
 */
export async function getCitizenDashboardServerData(): Promise<CitizenDashboardData> {
  if (!isSupabaseConfigured()) {
    return {
      stats: { total: 0, pending: 0, inProgress: 0, resolved: 0, resolutionRate: null },
      reports: [],
      isDemoData: false,
    };
  }

  const auth = await getVerifiedUser();
  const caller = toAuthenticatedUser(auth);
  if (!caller) {
    return {
      stats: { total: 0, pending: 0, inProgress: 0, resolved: 0, resolutionRate: null },
      reports: [],
      isDemoData: false,
    };
  }

  const supabase = await createSupabaseServerClient();
  const [{ data: statusRows }, recentList] = await Promise.all([
    supabase.from("reports").select("status").eq("user_id", caller.id),
    listReports({ mine: true, page: 1, limit: 5, sort: "newest" }, caller, supabase),
  ]);

  const rows = (statusRows ?? []) as Array<{ status: string }>;
  const total = rows.length;
  const pending = rows.filter((r) => r.status === "pending").length;
  const inProgress = rows.filter((r) => r.status === "in_progress").length;
  const resolved = rows.filter((r) => r.status === "resolved").length;
  const resolutionRate = total > 0 ? Math.round((resolved / total) * 100) : null;

  const reports = await enrichReportItems(
    recentList.items as unknown as Array<RawMappableReport & { image_path?: string }>,
    caller.id,
    supabase
  );

  return {
    stats: { total, pending, inProgress, resolved, resolutionRate },
    reports,
    isDemoData: false,
  };
}

/**
 * Server-side Public Map reports loader (no relative fetch).
 */
export async function getPublicReportsServerData(
  params?: GetPublicReportsParams
): Promise<GetPublicReportsResult> {
  if (!isSupabaseConfigured()) {
    return { items: [], total: 0, isDemoData: false };
  }

  const supabase = await createSupabaseServerClient();
  const auth = await getVerifiedUser();
  const caller = toAuthenticatedUser(auth);

  const result = await listReports(
    {
      mine: false,
      page: 1,
      limit: 50,
      status: params?.status && params.status !== "all" ? params.status : undefined,
      category: params?.category && params.category !== "all" ? params.category : undefined,
      search: params?.q?.trim() || undefined,
      sort: "newest",
    },
    caller,
    supabase
  );

  const items = await enrichReportItems(
    result.items as unknown as Array<RawMappableReport & { image_path?: string }>,
    caller?.id,
    supabase
  );

  const safePublicItems = items.filter((item) => item.visibility === "public");
  return {
    items: safePublicItems,
    total: safePublicItems.length,
    isDemoData: false,
  };
}

/**
 * Server-side Admin Overview loader (no relative fetch).
 */
export async function getAdminOverviewServerData(): Promise<AdminOverviewData> {
  const emptyStats: ComplaintStats = {
    total: 0,
    pending: 0,
    inProgress: 0,
    resolved: 0,
    criticalActive: 0,
    resolutionRate: null,
  };

  if (!isSupabaseConfigured()) {
    return {
      stats: emptyStats,
      recentReports: [],
      isDemoData: false,
      lastRefreshedAt: new Date().toISOString(),
    };
  }

  const auth = await getVerifiedUser();
  const caller = toAuthenticatedUser(auth);
  if (!caller || caller.role !== "admin") {
    return {
      stats: emptyStats,
      recentReports: [],
      isDemoData: false,
      lastRefreshedAt: new Date().toISOString(),
    };
  }

  const supabase = await createSupabaseServerClient();
  const [overview, recentList, criticalRes] = await Promise.all([
    getOverviewAnalytics({}, caller, supabase).catch(() => null),
    listReports({ scope: "admin", page: 1, limit: 5, sort: "newest" }, caller, supabase),
    supabase
      .from("reports")
      .select("id, severity, priority_score, status")
      .in("status", ["pending", "in_progress"]),
  ]);

  const activeRows = (criticalRes.data ?? []) as Array<{
    severity: string;
    priority_score: number;
  }>;
  const criticalActive = activeRows.filter(
    (r) => r.severity === "critical" || r.priority_score >= 70
  ).length;

  let stats: ComplaintStats;
  if (overview) {
    stats = {
      total: overview.all_time_total_reports,
      pending: overview.current_pending,
      inProgress: overview.current_in_progress,
      resolved: overview.current_resolved,
      criticalActive,
      resolutionRate: overview.creation_cohort_resolution_rate_percent,
    };
  } else {
    const { data: allRows } = await supabase.from("reports").select("status");
    const rows = (allRows ?? []) as Array<{ status: string }>;
    const total = rows.length;
    const pending = rows.filter((r) => r.status === "pending").length;
    const inProgress = rows.filter((r) => r.status === "in_progress").length;
    const resolved = rows.filter((r) => r.status === "resolved").length;
    stats = {
      total,
      pending,
      inProgress,
      resolved,
      criticalActive,
      resolutionRate: total > 0 ? Math.round((resolved / total) * 100) : null,
    };
  }

  const recentReports = await enrichReportItems(
    recentList.items as unknown as Array<RawMappableReport & { image_path?: string }>,
    caller.id,
    supabase
  );

  return {
    stats,
    recentReports,
    isDemoData: false,
    lastRefreshedAt: new Date().toISOString(),
  };
}

/**
 * Server-side Admin Queue loader (no relative fetch).
 */
export async function getAdminReportsServerData(
  params: GetAdminReportsParams = {}
): Promise<GetAdminReportsResult> {
  const pageSize = params.pageSize ?? 10;
  const page = params.page ?? 1;

  if (!isSupabaseConfigured()) {
    return {
      items: [],
      total: 0,
      page,
      pageSize,
      totalPages: 1,
      urgentCount: 0,
      isDemoData: false,
    };
  }

  const auth = await getVerifiedUser();
  const caller = toAuthenticatedUser(auth);
  if (!caller || caller.role !== "admin") {
    return {
      items: [],
      total: 0,
      page,
      pageSize,
      totalPages: 1,
      urgentCount: 0,
      isDemoData: false,
    };
  }

  const supabase = await createSupabaseServerClient();
  const sortMap: Record<string, "newest" | "oldest" | "priority_high" | "priority_low"> = {
    priority: "priority_high",
    priority_asc: "priority_low",
    recent: "newest",
    oldest: "oldest",
    most_supported: "priority_high",
  };

  const result = await listReports(
    {
      scope: "admin",
      page,
      limit: pageSize,
      status: params.status && params.status !== "all" ? params.status : undefined,
      category: params.category && params.category !== "all" ? params.category : undefined,
      severity: params.severity && params.severity !== "all" ? params.severity : undefined,
      search: params.q?.trim() || undefined,
      sort: sortMap[params.sort ?? "priority"] ?? "priority_high",
    },
    caller,
    supabase
  );

  let items = await enrichReportItems(
    result.items as unknown as Array<RawMappableReport & { image_path?: string }>,
    caller.id,
    supabase
  );

  if (params.urgent) {
    items = items.filter((r) => isReportUrgent(r) && r.status !== "resolved");
  }

  const total = params.urgent ? items.length : result.pagination.total;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return {
    items,
    total,
    page,
    pageSize,
    totalPages,
    urgentCount: items.filter((r) => isReportUrgent(r) && r.status !== "resolved").length,
    isDemoData: false,
  };
}

/**
 * Server-side Admin Analytics loader (no relative fetch).
 */
export async function getAdminAnalyticsServerData(options?: {
  timeRange?: "all" | "30d" | "7d";
  category?: string;
  status?: string;
}): Promise<AdminAnalyticsData> {
  const [overview, queue] = await Promise.all([
    getAdminOverviewServerData(),
    getAdminReportsServerData({ page: 1, pageSize: 50, sort: "priority" }),
  ]);

  let reports = queue.items;
  if (options?.category && options.category !== "all") {
    reports = reports.filter((r) => r.category === options.category);
  }
  if (options?.status && options.status !== "all") {
    reports = reports.filter((r) => r.status === options.status);
  }
  if (options?.timeRange && options.timeRange !== "all") {
    const days = options.timeRange === "7d" ? 7 : 30;
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    reports = reports.filter((r) => new Date(r.createdAt).getTime() >= cutoff);
  }

  const analytics = aggregateAnalyticsFromReports(reports, overview.stats);
  analytics.isDemoData = false;
  return analytics;
}

/**
 * Server-side Report Details loader (no relative fetch).
 */
export async function getReportDetailsServerData(reportId: string): Promise<ComplaintDetails> {
  const auth = await getVerifiedUser();
  const caller = toAuthenticatedUser(auth);
  const supabase = await createSupabaseServerClient();
  const storageClient = getServiceAdminClient() ?? supabase;

  const [detail, historyRes, evidenceRes, voteMeta] = await Promise.all([
    getReportById(reportId, caller, supabase),
    getReportStatusHistory(reportId, caller, supabase).catch(() => ({
      report_id: reportId,
      history: [],
    })),
    getReportEvidence(reportId, caller, 900, storageClient).catch(() => ({
      report_id: reportId,
      before_images: [],
      after_images: [],
      has_resolution_evidence: false,
      notice: "",
    })),
    fetchVoteMetaForReports([reportId], caller?.id),
  ]);

  const beforeImageUrl =
    evidenceRes.before_images.find((img) => img.signed_url)?.signed_url ?? null;

  const mappedReport = toComplaintSummary(detail as unknown as RawMappableReport, {
    supportCount: voteMeta.counts.get(reportId) ?? 1,
    viewerHasSupported: voteMeta.viewerVoted.has(reportId),
    imageUrl: beforeImageUrl,
  });

  const mappedHistory = toStatusHistoryList(historyRes.history);
  const resolutionImages = evidenceRes.after_images
    .filter((img) => Boolean(img.signed_url))
    .map((img) => ({
      id: img.id,
      imageUrl: img.signed_url!,
      createdAt: img.created_at,
    }));

  const maxVersion = historyRes.history.reduce(
    (max, item) => Math.max(max, item.version ?? 1),
    1
  );

  return {
    report: mappedReport,
    history: mappedHistory,
    resolutionImages,
    canGiveFeedback: Boolean(detail.is_owner && detail.status === "resolved"),
    version: maxVersion,
  };
}
