import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { EVIDENCE_CONFIG } from "@/config/evidence";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { AuthenticatedUser } from "@/types/auth";
import type {
  EvidenceImageItem,
  ReportEvidenceResponseData,
} from "@/types/evidence";
import type { ReportStatus } from "@/types/report";
import { AppError } from "@/utils/app-error";
import { logger } from "@/utils/logger";

interface RawImageRow {
  id: string;
  storage_path: string;
  type: "before" | "after";
  created_at: string;
}

/**
 * Retrieves the full before and after resolution evidence for a civic complaint report.
 * Role-aware data boundaries:
 * - Public listed complaints: All visitors may view authorized before/after photographs.
 * - Private / unlisted complaints: Only the owner or an administrator may view evidence.
 * - Unauthorized callers receive HTTP 404 NOT_FOUND to prevent disclosing private report existence.
 */
export async function getReportEvidence(
  reportId: string,
  caller?: AuthenticatedUser | null,
  expiresInSeconds: number = EVIDENCE_CONFIG.DEFAULT_SIGNED_URL_EXPIRY_SECONDS,
  client?: SupabaseClient
): Promise<ReportEvidenceResponseData> {
  const supabase = client ?? (await createSupabaseServerClient());

  // 1. Fetch report visibility and current status
  const { data: report, error: reportError } = await supabase
    .from("reports")
    .select("id, status, publication, visibility, user_id, resolved_at")
    .eq("id", reportId)
    .maybeSingle();

  if (reportError) {
    logger.error("request.failed", { status: 500 });
    throw new AppError("INTERNAL_SERVER_ERROR", "Failed to retrieve complaint details", {
      cause: reportError,
    });
  }

  if (!report) {
    logger.warn("evidence.not_found", { status: 404 });
    throw new AppError("NOT_FOUND", "Complaint not found");
  }

  // 2. Authorization check
  const isOwner = caller ? report.user_id === caller.id : false;
  const isAdmin = caller ? caller.role === "admin" : false;
  const isPublicListed = report.publication === "public" && report.visibility === "listed";

  if (!isPublicListed && !isOwner && !isAdmin) {
    logger.warn("evidence.not_found", { status: 404 });
    throw new AppError("NOT_FOUND", "Complaint not found");
  }

  // 3. Query all associated images
  const { data: rawImages, error: imagesError } = await supabase
    .from("report_images")
    .select("id, storage_path, type, created_at")
    .eq("report_id", reportId)
    .order("created_at", { ascending: true });

  if (imagesError) {
    logger.error("request.failed", { status: 500 });
    throw new AppError("INTERNAL_SERVER_ERROR", "Failed to retrieve evidence records", {
      cause: imagesError,
    });
  }

  const rows = (rawImages ?? []) as RawImageRow[];
  const before_images: EvidenceImageItem[] = [];
  const after_images: EvidenceImageItem[] = [];

  // 4. Generate signed URLs for private storage paths
  for (const row of rows) {
    let signed_url: string | undefined;

    try {
      const { data: signedData, error: signError } = await supabase.storage
        .from(EVIDENCE_CONFIG.BUCKET_NAME)
        .createSignedUrl(row.storage_path, expiresInSeconds);

      if (!signError && signedData?.signedUrl) {
        signed_url = signedData.signedUrl;
      }
    } catch {
      // In tests or mock environments without live storage, signed_url remains undefined
    }

    const item: EvidenceImageItem = {
      id: row.id,
      storage_path: row.storage_path,
      type: row.type,
      created_at: row.created_at,
      signed_url,
    };

    if (row.type === "before") {
      before_images.push(item);
    } else {
      after_images.push(item);
    }
  }

  logger.info("evidence.retrieved", { status: 200 });

  return {
    report_id: report.id,
    status: report.status as ReportStatus,
    resolved_at: report.resolved_at ?? null,
    attribution_notice: EVIDENCE_CONFIG.ATTRIBUTION_NOTICE,
    before_images,
    after_images,
  };
}
